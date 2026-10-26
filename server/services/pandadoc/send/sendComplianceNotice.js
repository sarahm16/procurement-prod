// services/pandadoc/send/sendComplianceNotice.js
import axios from "axios";
import { getValidUserToken } from "../tokens/getValidUserToken.js";
import { pollUntilDraft } from "../pollUntilDraft.js";
import {
  formatNoticeDate,
  siteAddress,
  siteListText,
  terminationRecipient,
} from "./sendTerminationNotice.js";

const PANDADOC_BASE = "https://api.pandadoc.com/public/v1";

// The old app's compliance template. Override with
// PANDADOC_COMPLIANCE_TEMPLATE_ID.
const DEFAULT_TEMPLATE_ID = "Teqmz4WRa4A3h4n4j9cj5o";

const createToken = (name, value) => ({ name, value: value ?? "" });

export const formatCurrency = (n) =>
  Number(n).toLocaleString("en-US", { style: "currency", currency: "USD" });

/**
 * Send a compliance (default) notice to the vendor through PandaDoc.
 *
 * @param vendor  the vendor (raw, with Contacts)
 * @param notice  { natureOfDefault, impact, deadline, msaLastUpdated (YYYY-MM-DD),
 *                  penalty: { amount, reason } | null, sites }
 * @param sender  { name, email, title, phone }
 * @param opts.user_id  employee sending it (their PandaDoc account sends it)
 * @returns { documentId, recipient }
 */
export async function sendComplianceNotice(vendor, notice, sender, { user_id } = {}) {
  const recipient = terminationRecipient(vendor);
  if (!recipient) {
    throw Object.assign(new Error("Vendor has no email to send the notice to"), {
      noRecipient: true,
    });
  }

  const token = await getValidUserToken(user_id);
  const authHeader = { Authorization: `Bearer ${token}` };
  const penalty = notice.penalty;

  const tokens = [
    createToken("NatureOfDefault", notice.natureOfDefault),
    createToken("DefaultImpact", notice.impact),
    createToken("Subcontractor.Company", vendor?.company),
    createToken("Subcontractor.Address", siteAddress(vendor)),
    createToken(
      "Subcontractor.MsaLastUpdated",
      notice.msaLastUpdated ? formatNoticeDate(notice.msaLastUpdated) : "",
    ),
    createToken("Sender.Name", sender?.name),
    createToken("Sender.Title", sender?.title),
    createToken("Sender.Email", sender?.email),
    createToken("Sender.PhoneNumber", sender?.phone),
    createToken("Deadline", notice.deadline),
    createToken("PenaltyAssessed", penalty ? "Yes" : "No"),
    // Sent empty with no penalty, so the tokens resolve to blanks rather than
    // leaving literal [PenaltyAmount] text in the document.
    createToken("PenaltyAmount", penalty ? formatCurrency(penalty.amount) : ""),
    createToken("PenaltyReason", penalty ? penalty.reason : ""),
    createToken("SiteList", siteListText(notice.sites)),
  ];

  // 1. Create the document from the compliance template
  const { data: created } = await axios.post(
    `${PANDADOC_BASE}/documents`,
    {
      name: `Compliance Notice - ${vendor.company}`,
      template_uuid: process.env.PANDADOC_COMPLIANCE_TEMPLATE_ID || DEFAULT_TEMPLATE_ID,
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
