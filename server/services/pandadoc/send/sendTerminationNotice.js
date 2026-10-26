// services/pandadoc/send/sendTerminationNotice.js
import axios from "axios";
import { getValidUserToken } from "../tokens/getValidUserToken.js";
import { pollUntilDraft } from "../pollUntilDraft.js";

const PANDADOC_BASE = "https://api.pandadoc.com/public/v1";

// The old app's termination template. Override with
// PANDADOC_TERMINATION_TEMPLATE_ID if it ever changes.
const DEFAULT_TEMPLATE_ID = "26W4HRGEiKimBcdnFZnqCn";

const createToken = (name, value) => ({ name, value: value ?? "" });

/** "05/14/2026" — what the old notice showed. */
export const formatNoticeDate = (d) => {
  const date = d instanceof Date ? d : new Date(d);
  // A date-only value ("2026-05-14") parses as UTC midnight; format in UTC so
  // it doesn't slide back a day west of Greenwich.
  return date.toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  });
};

const oneLine = (parts) =>
  parts
    .map((p) => (typeof p === "string" ? p.trim() : p))
    .filter(Boolean)
    .join(", ");

export const siteAddress = (site) =>
  oneLine([
    site?.mailing_address,
    site?.mailing_city,
    [site?.mailing_state, site?.mailing_zipcode].filter(Boolean).join(" "),
  ]);

/**
 * The SiteList token: one bullet per site, with the service lines the vendor
 * is coming off there.
 *   • Costco Wholesale - Store 307 - 1 Main St, Nashua, NH 03060 (Snow Removal)
 */
export const siteListText = (sites) =>
  sites
    .map(
      (s) =>
        `• ${[s.client, s.store, s.address].filter(Boolean).join(" - ")}` +
        (s.lines?.length ? ` (${s.lines.join(", ")})` : ""),
    )
    .join("\n");

/**
 * Send the termination notice to the vendor through PandaDoc.
 *
 * @param vendor  the vendor (raw, with Contacts)
 * @param notice  { effectiveDate, reason, backCharge, backChargeDetails, sites }
 *                sites: [{ client, store, address, lines: [names] }]
 * @param sender  { name, email, title, phone }
 * @param opts.user_id  employee sending it (their PandaDoc account sends it)
 * @returns { documentId, recipient }
 *
 * Throws PandaDocReauthRequired (needsPandaDocAuth) if the sender's PandaDoc
 * connection needs renewing.
 */
export async function sendTerminationNotice(vendor, notice, sender, { user_id } = {}) {
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
    createToken(
      "Subcontractor.Address",
      siteAddress(vendor), // the vendor's mailing address, same fields as a site
    ),
    createToken("Sender.Name", sender?.name),
    createToken("Sender.Title", sender?.title),
    createToken("Sender.Email", sender?.email),
    createToken("Sender.PhoneNumber", sender?.phone),
    createToken("EffectiveDate", formatNoticeDate(notice.effectiveDate)),
    createToken("SiteList", siteListText(notice.sites)),
    createToken("Reason", notice.reason || "No reason provided"),
    createToken(
      "BackCharge",
      notice.backCharge ? `Yes — ${notice.backChargeDetails}` : "No",
    ),
  ];

  // 1. Create the document from the termination template
  const { data: created } = await axios.post(
    `${PANDADOC_BASE}/documents`,
    {
      name: `Notice of Service Termination - ${vendor.company}`,
      template_uuid: process.env.PANDADOC_TERMINATION_TEMPLATE_ID || DEFAULT_TEMPLATE_ID,
      recipients: [{ email: recipient, role: "Subcontractor" }],
      tokens,
    },
    { headers: authHeader },
  );

  const documentId = created.id;

  // 2. Poll until the document is draft-ready (async processing must finish)
  await pollUntilDraft(documentId, token);

  // 3. Send it
  await axios.post(
    `${PANDADOC_BASE}/documents/${documentId}/send`,
    { silent: false },
    { headers: authHeader },
  );

  return { documentId, recipient };
}

/** Who gets the notice: the primary contact, else the vendor's own email. */
export function terminationRecipient(vendor) {
  const primary = (vendor?.contacts || vendor?.Contacts || []).find(
    (c) => c.contact_role_id === 1 && c.email?.trim(),
  );
  return primary?.email?.trim() || vendor?.contact_email?.trim() || null;
}
