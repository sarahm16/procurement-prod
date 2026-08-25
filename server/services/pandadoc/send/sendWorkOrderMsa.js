// services/pandadoc/sendMsa.js
import axios from "axios";
import { getValidUserToken } from "../tokens/getValidUserToken.js";
import { pollUntilDraft } from "../pollUntilDraft.js";
import prisma from "../../../db.js";
import { logActivity } from "../../../utils/logActivity.js";

const PANDADOC_BASE = "https://api.pandadoc.com/public/v1";

const WORK_ORDER_ENTITY_TYPE_ID = 4;

const createToken = (name, value) => ({ name, value });

/**
 * Send a Work Order MSA to the assigned vendor's primary contact.
 * @param vendor   - the vendor (raw, with Contacts) assigned to the work order
 * @param workorder- the work order (with Site -> Client)
 * @param services - the work order's services (with Service relation for names)
 */
export async function sendWorkOrderMsa(
  vendor,
  workorder,
  services,
  { user_id } = {},
) {
  const token = await getValidUserToken(user_id);

  console.log("panda doc user token", token);

  // Recipient = the vendor's PRIMARY contact's email
  const primaryContact = (vendor.contacts || vendor.Contacts || []).find(
    (c) => c.contact_role_id === 1,
  );
  if (!primaryContact?.email) {
    throw new Error("Vendor has no primary contact with an email");
  }

  const site = workorder?.Site;

  const tokens = [
    createToken(
      "DueDate",
      workorder?.due_date
        ? new Date(workorder.due_date).toLocaleDateString()
        : "Not Specified",
    ),
    createToken("Subcontractor.Company", vendor?.company || "N/A"),
    createToken(
      "Site.Address",
      `${site?.mailing_address || ""}, ${site?.mailing_city || ""}, ${
        site?.mailing_state || ""
      } ${site?.mailing_zipcode || ""}`,
    ),
    createToken("Client.Company", site?.Client?.client || "N/A"),
    createToken("ScopeOfWork", workorder?.scope_of_work || ""),
    createToken("Site", site?.store || "N/A"),
    createToken("WorkOrderNumber", workorder?.work_order_number || "N/A"),
  ];

  const pricing_tables = [
    {
      name: "Pricing Table 1",
      data_merge: true,
      sections: [
        {
          title: "",
          default: false,
          rows: (services || []).map((service) => {
            const price = Number(service.vendor_price) || 0;
            return {
              options: { qty_editable: false },
              data: {
                Name: service.name ?? service.Service?.name ?? "",
                Description: "",
                Price: price,
                QTY: 1,
                Subtotal: price,
                Volume: 1,
                Unit: "service",
                AddlInfo: "",
              },
            };
          }),
        },
      ],
    },
  ];

  const authHeader = { Authorization: `Bearer ${token}` };

  // 1. Create the document from the MSA template
  const { data: created } = await axios.post(
    `${PANDADOC_BASE}/documents`,
    {
      name: `Work Order MSA - ${vendor.company}`,
      template_uuid: process.env.PANDADOC_WORKORDER_MSA_ID,
      recipients: [{ email: primaryContact.email, role: "Subcontractor" }],
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

  // 4. Record it so the webhook can correlate status updates later
  const record = await prisma.$transaction(async (tx) => {
    const doc = await tx.workOrderMSAs.create({
      data: {
        vendor_id: vendor.id,
        work_order_id: workorder?.id,
        pandadoc_id: documentId,
        status: "sent",
        date_sent: new Date(),
        sent_by: user_id ?? null,
      },
    });

    await logActivity(tx, {
      entityTypeId: WORK_ORDER_ENTITY_TYPE_ID,
      entityId: workorder.id,
      fieldChanged: "work_order_msa",
      previousValue: null,
      newValue: `Sent Work Order MSA to ${vendor.company}`,
      changedBy: user_id ?? null,
      action: "CREATE",
    });

    return doc;
  });

  return record;
}
