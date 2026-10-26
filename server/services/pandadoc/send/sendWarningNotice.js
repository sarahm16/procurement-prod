// services/pandadoc/send/sendWarningNotice.js
import axios from "axios";
import { getValidUserToken } from "../tokens/getValidUserToken.js";
import { pollUntilDraft } from "../pollUntilDraft.js";
import {
  siteAddress,
  siteListText,
  terminationRecipient,
} from "./sendTerminationNotice.js";

const PANDADOC_BASE = "https://api.pandadoc.com/public/v1";

// The old app's warning template. Override with PANDADOC_WARNING_TEMPLATE_ID.
const DEFAULT_TEMPLATE_ID = "gpXfUYKuCbvNbaDZPnHv75";

// The template has image blocks named "Image 2" … "Image 16". Every one must
// get a URL, so unused slots get a 1x1 white image (same as the old app).
export const MAX_IMAGES = 15;
const FIRST_IMAGE_NUMBER = 2;
const BLANK_IMAGE_URL =
  process.env.WARNING_BLANK_IMAGE_URL ||
  "https://nfcaccountstorage.blob.core.windows.net/sarlacc/blank-1x1-white.png";

const IMAGE_SLOT_NAMES = Array.from(
  { length: MAX_IMAGES },
  (_, i) => `Image ${i + FIRST_IMAGE_NUMBER}`,
);

/** Always 15 entries; the photos fill the first slots. */
export const imageSlots = (urls) =>
  IMAGE_SLOT_NAMES.map((name, i) => ({ name, urls: [urls[i] || BLANK_IMAGE_URL] }));

const createToken = (name, value) => ({ name, value: value ?? "" });

/**
 * Send a warning notice to the vendor through PandaDoc.
 *
 * @param vendor   the vendor (raw, with Contacts)
 * @param warning  { complaint, resolution, deadline, sites, imageUrls, pdfs }
 *                 sites: [{ client, store, address, lines: [names] }]
 *                 imageUrls: public URLs PandaDoc can fetch (max 15)
 *                 pdfs: [{ buffer, filename, mimetype }] attached to the document
 * @param sender   { name, email, title, phone }
 * @param opts.user_id  employee sending it (their PandaDoc account sends it)
 * @returns { documentId, recipient, attached }
 *
 * Throws PandaDocReauthRequired (needsPandaDocAuth) if the sender's PandaDoc
 * connection needs renewing.
 */
export async function sendWarningNotice(vendor, warning, sender, { user_id } = {}) {
  const recipient = terminationRecipient(vendor);
  if (!recipient) {
    throw Object.assign(new Error("Vendor has no email to send the notice to"), {
      noRecipient: true,
    });
  }

  const token = await getValidUserToken(user_id);
  const authHeader = { Authorization: `Bearer ${token}` };

  const tokens = [
    createToken("Subcontractor.Company", vendor?.company),
    createToken("Subcontractor.Address", siteAddress(vendor)),
    createToken("Complaint", warning.complaint),
    createToken("Resolution", warning.resolution),
    createToken("Deadline", warning.deadline),
    createToken("Sender.Name", sender?.name),
    createToken("Sender.Title", sender?.title),
    createToken("Sender.Email", sender?.email),
    createToken("Sender.PhoneNumber", sender?.phone),
    createToken("SiteList", siteListText(warning.sites)),
  ];

  // 1. Create the document from the warning template, photos in the slots
  const { data: created } = await axios.post(
    `${PANDADOC_BASE}/documents`,
    {
      name: `Warning Notice - ${vendor.company}`,
      template_uuid: process.env.PANDADOC_WARNING_TEMPLATE_ID || DEFAULT_TEMPLATE_ID,
      recipients: [{ email: recipient, role: "Subcontractor" }],
      tokens,
      images: imageSlots(warning.imageUrls ?? []),
    },
    { headers: authHeader },
  );

  const documentId = created.id;

  // 2. Poll until the document is draft-ready (async processing must finish)
  await pollUntilDraft(documentId, token);

  // 3. Attach the PDFs. Attachments can only be added to a draft, so this
  //    has to happen before sending.
  let attached = 0;
  for (const pdf of warning.pdfs ?? []) {
    const form = new FormData();
    form.append(
      "file",
      new Blob([pdf.buffer], { type: pdf.mimetype || "application/pdf" }),
      pdf.filename,
    );
    form.append("name", pdf.filename);
    await axios.post(`${PANDADOC_BASE}/documents/${documentId}/attachments`, form, {
      headers: authHeader,
    });
    attached += 1;
  }

  // 4. Send it
  await axios.post(
    `${PANDADOC_BASE}/documents/${documentId}/send`,
    { silent: false },
    { headers: authHeader },
  );

  return { documentId, recipient, attached };
}
