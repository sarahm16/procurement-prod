// services/pandadoc/sendW9.js
import axios from "axios";
import { getValidUserToken } from "../tokens/getValidUserToken.js";
// import { getAccountingToken } from "../tokens/accountingToken.js";
import { pollUntilDraft } from "../pollUntilDraft.js";
import prisma from "../../../db.js";
import { logActivity } from "../../../utils/logActivity.js";

const PANDADOC_BASE = "https://api.pandadoc.com/public/v1";
const W9_TEMPLATE_ID = process.env.PANDADOC_W9_TEMPLATE_ID; // the W9 template

const entity_type_id = 1; // confirm your vendor entity type id

// small sleep helper
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Send a W9 document to a vendor.
 * @param vendor - vendor object from details context (has company + contacts)
 */
export async function sendW9(vendor, { user_id } = {}) {
  const token = await getValidUserToken(user_id);
  console.log("user token", token);

  console.log("vendor contacts", vendor.contacts || vendor.Contacts);

  // Recipient = the vendor's PRIMARY contact's email (assuming one primary)
  const primaryContact = (vendor.contacts || vendor.Contacts || []).find(
    (c) => c.contact_role_id === 1,
  );

  if (!primaryContact?.email) {
    throw new Error("Vendor has no primary contact with an email");
  }

  const authHeader = { Authorization: `Bearer ${token}` };

  // 1. Create the document from the W9 template
  const { data: created } = await axios.post(
    `${PANDADOC_BASE}/documents`,
    {
      name: `W9 - ${vendor.company}`,
      template_uuid: W9_TEMPLATE_ID,
      recipients: [
        {
          email: primaryContact.email,
          role: "Subcontractor",
        },
      ],
      tokens: [{ name: "Company.Name", value: vendor.company }],
    },
    { headers: authHeader },
  );

  const documentId = created.id;

  // 2. Poll until the document is in draft (async processing must finish)
  await pollUntilDraft(documentId, token);

  // 3. Send it (now that it's draft-ready)
  await axios.post(
    `${PANDADOC_BASE}/documents/${documentId}/send`,
    {
      silent: false, // sends the email notification to the recipient
      // subject / message optional
    },
    { headers: authHeader },
  );

  // 4. Record it in our DB so the webhook can find it later
  const record = await prisma.$transaction(async (tx) => {
    const doc = await tx.vendorComplianceDocuments.create({
      data: {
        vendor_id: vendor.id,
        document_type: "W9",
        pandadoc_id: documentId,
        status: "sent",
        date_sent: new Date(),
      },
    });
    // log against the vendor's activity feed
    await logActivity(tx, {
      entityTypeId: entity_type_id, // confirm your vendor entity type id
      entityId: vendor.id,
      fieldChanged: "compliance_document",
      previousValue: null,
      newValue: `Sent ACH to ${vendor.company}`, // "Sent W9..." in sendW9
      changedBy: user_id ?? null,
      action: "CREATE",
    });
    return doc;
  });

  return record;
}
