// services/pandadoc/sendNewCopy.js
import prisma from "../../db.js";
import { voidDocument } from "./voidDocument.js";
import { logActivity } from "../../utils/logActivity.js";

const VENDOR_ENTITY_TYPE_ID = 1;

const VOIDABLE_STATUSES = ["sent", "viewed"]; // per PandaDoc's "To Expired" rules

// send = the send function for this doc type (sendAch, sendW9, etc.)
export async function sendNewCopy({
  vendor,
  oldRecord,
  token,
  authScheme,
  send,
  user_id,
}) {
  // 1. Void the old doc in PandaDoc first (before creating a replacement)
  if (oldRecord && VOIDABLE_STATUSES.includes(oldRecord.status)) {
    try {
      await voidDocument(oldRecord.pandadoc_id, token, { authScheme });
    } catch (err) {
      console.error(
        "Failed to void old document:",
        err.response?.data ?? err.message,
      );
      throw new Error("Could not void the existing document");
    }

    // 2. Mark old record voided + log
    await prisma.$transaction(async (tx) => {
      await tx.vendorComplianceDocuments.update({
        where: { id: oldRecord.id },
        data: { status: "voided" },
      });
      await logActivity(tx, {
        entityTypeId: VENDOR_ENTITY_TYPE_ID,
        entityId: vendor.id,
        userId: user_id,
        action: `Voided the unsigned ${oldRecord.document_type === "W9" ? "W-9" : oldRecord.document_type} to send a new copy`,
      });
    });
  }

  // 3. Send the new copy (your existing send fn — creates + logs its own record)
  return send(vendor, { user_id });
}
