// services/pandadoc/send/sendMobilizationFeeContract.js
import axios from "axios";
import { getValidUserToken } from "../tokens/getValidUserToken.js";
import { pollUntilDraft } from "../pollUntilDraft.js";

const PANDADOC_BASE = "https://api.pandadoc.com/public/v1";

const createToken = (name, value) => ({ name, value });

const money = (n) =>
  Number(n || 0).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });

/**
 * Timestamp formatting for Msa.LastUpdated.
 *
 * This one is a real instant (the webhook writes `new Date()`), not a date-only
 * column, so rendering it in local time is correct — it is NOT the UTC-midnight
 * off-by-one we hit on start_date / due_date. If the MSA date ever becomes a
 * date-only field, this needs the explicit part-parsing treatment instead.
 */
const fmtTimestamp = (value) => {
  if (!value) return "N/A";
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? "N/A" : d.toLocaleDateString("en-US");
};

/**
 * Most recent MSA date for this vendor.
 *
 * Read from the vendor's compliance documents, because the MSA the mobilization
 * fee agreement hangs off is the master agreement between us and the vendor —
 * not a per-work-order document. `date_completed` is the signature date; a sent
 * but unsigned MSA falls back to `date_sent` so the contract says something
 * truthful rather than "N/A".
 *
 * If your MSAs actually live on WorkOrderMSAs, swap the `docs` line for
 * `workorder?.MSAs ?? []` and add `MSAs: true` to the include in the send route.
 */
const resolveMsaDate = (vendor) => {
  const docs =
    vendor?.ComplianceDocuments ?? vendor?.compliance_documents ?? [];

  const times = docs
    .filter((d) => /msa|master\s*service/i.test(d?.document_type ?? ""))
    .map((d) => d?.date_completed ?? d?.date_sent)
    .filter(Boolean)
    .map((v) => new Date(v).getTime())
    .filter((t) => !Number.isNaN(t));

  return times.length ? new Date(Math.max(...times)) : null;
};

/**
 * Send a mobilization fee agreement to the assigned vendor's primary contact.
 *
 * Unlike sendWorkOrderMsa, this does NOT write the database row — the
 * WorkOrderMobilizationFees record already exists as a Draft, and the route
 * owns the state machine that moves it to Sent. Splitting that would put the
 * transition rules in two places.
 *
 * @param vendor    - the vendor (raw, with Contacts and ComplianceDocuments)
 * @param workorder - the work order (with Site -> Client)
 * @param fee       - the WorkOrderMobilizationFees row being sent
 * @returns { id, template_id, name } for the caller to store
 */
export async function sendMobilizationFeeContract(
  vendor,
  workorder,
  fee,
  { user_id } = {},
) {
  const templateId = process.env.PANDADOC_MOBILIZATION_FEE_ID;
  if (!templateId) {
    throw new Error("PANDADOC_MOBILIZATION_FEE_ID is not set");
  }

  const amount = Number(fee?.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Mobilization fee amount must be greater than zero");
  }

  const primaryContact = (vendor.contacts || vendor.Contacts || []).find(
    (c) => c.contact_role_id === 1,
  );
  if (!primaryContact?.email) {
    throw new Error("Vendor has no primary contact with an email");
  }

  // Checked before the token call so a misconfigured vendor fails fast rather
  // than leaving an unsent document behind in PandaDoc.
  const token = await getValidUserToken(user_id);

  const tokens = [
    createToken("Subcontractor.Company", vendor?.company || "N/A"),
    createToken("Amount", money(amount)),
    createToken("Msa.LastUpdated", fmtTimestamp(resolveMsaDate(vendor))),
  ];

  const authHeader = { Authorization: `Bearer ${token}` };

  // 1. Create the document from the mobilization fee template
  const { data: created } = await axios.post(
    `${PANDADOC_BASE}/documents`,
    {
      name: `Mobilization Fee - ${workorder?.work_order_number} - ${vendor.company}`,
      template_uuid: templateId,
      recipients: [{ email: primaryContact.email, role: "Subcontractor" }],
      tokens,
      // Carried back on every webhook and visible in PandaDoc's own UI, which
      // is what lets someone identify a document without a database lookup.
      // These are metadata, not tokens — they don't print on the contract, so
      // trimming the token list doesn't cost you the ability to trace a doc.
      metadata: {
        document_type: "mobilization_fee",
        work_order_id: String(workorder?.id ?? ""),
        mobilization_fee_id: String(fee?.id ?? ""),
        vendor_id: String(vendor?.id ?? ""),
      },
      tags: ["mobilization-fee"],
    },
    { headers: authHeader },
  );

  const documentId = created.id;

  // 2. Poll until the document is draft-ready (async processing must finish)
  await pollUntilDraft(documentId, token);

  // 3. Send it
  try {
    await axios.post(
      `${PANDADOC_BASE}/documents/${documentId}/send`,
      {
        silent: false,
        subject: `Mobilization Fee Agreement - ${workorder?.work_order_number}`,
        message:
          `${vendor.company}, please review and sign the mobilization fee agreement for ` +
          `${workorder?.work_order_number} (${money(amount)}). Funds are released once this is signed.`,
      },
      { headers: authHeader },
    );
  } catch (err) {
    // The document exists but never went out. Naming it gives whoever picks
    // this up something to find in PandaDoc instead of a mystery draft.
    err.message = `Created mobilization fee document ${documentId} but sending failed: ${err.message}`;
    throw err;
  }

  return { id: documentId, template_id: templateId, name: created.name };
}

export default sendMobilizationFeeContract;
