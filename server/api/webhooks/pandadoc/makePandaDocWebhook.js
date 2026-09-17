// server/api/webhooks/pandadoc/makePandaDocWebhook.js
import express from "express";
import crypto from "crypto";
import prisma from "../../../db.js";
import {
  applyPandaDocStatusToFee,
  serializeMobilizationFee,
  MOB_FEE_STATUS,
} from "../../../routes/mobilizationFeeRoutes.js";

// Hardcoded for now — move to Key Vault / env later.
const WEBHOOK_SECRETS = {
  accounting: "8iQELHV26kj9sbp9VSnkuJ",
  operations: "ovJnCU94cTQL8sMU4hjKpf",
};

// PandaDoc status → your internal status + whether it's a completion.
// Used by the tables whose status column simply mirrors PandaDoc's.
const STATUS_MAP = {
  "document.draft": { status: "draft" },
  "document.sent": { status: "sent" },
  "document.viewed": { status: "viewed" },
  "document.completed": { status: "completed", completed: true },
  "document.declined": { status: "declined" },
  "document.voided": { status: "voided" },
};

/**
 * Tables that just mirror PandaDoc's vocabulary. Mobilization fees are
 * deliberately NOT in this list — they have their own states and a transition
 * guard, because the difference between "signed" and "paid" is real money.
 */
const MIRRORED_TABLES = [
  { model: "vendorComplianceDocuments", label: "compliance document" },
  { model: "vendorWarnings", label: "vendor warning" },
  { model: "workOrderMSAs", label: "work order MSA" },
];

/**
 * Verify the request came from PandaDoc.
 * PandaDoc signs the raw body with HMAC-SHA256; signature is in ?signature=.
 * NOTE: confirm the exact mechanism against a real payload.
 */
function verifySignature(req, secret) {
  const signature = req.query.signature;
  if (!signature) return false;

  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(req.body); // raw Buffer — the raw parser ran in index.js
  const expected = hmac.digest("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature, "hex"),
      Buffer.from(expected, "hex"),
    );
  } catch {
    return false;
  }
}

export function makePandaDocWebhook(workspaceKey) {
  const router = express.Router();

  router.post("/", async (req, res) => {
    const secret = WEBHOOK_SECRETS[workspaceKey];

    if (!verifySignature(req, secret)) {
      console.warn(`PandaDoc webhook (${workspaceKey}): invalid signature`);
      return res.status(401).end();
    }

    let events;
    try {
      events = JSON.parse(req.body.toString("utf8"));
    } catch {
      return res.status(400).end();
    }

    // Ack fast — PandaDoc retries on slow or failed responses.
    res.status(200).end();

    for (const event of events) {
      try {
        if (event.event !== "document_state_changed") continue;

        const pandadocId = event.data?.id;
        const rawStatus = event.data?.status;
        if (!pandadocId || !rawStatus) continue;

        // ── Mobilization fees ───────────────────────────────────────────
        // Checked first, and through its own handler: the fee has its own
        // status vocabulary ("Completed - Pending Payment", "Paid") and a
        // state machine that must not be bypassed by a redelivered event.
        const feeResult = await applyPandaDocStatusToFee(
          prisma,
          pandadocId,
          rawStatus,
        );

        if (feeResult !== null) {
          // It IS a mobilization fee. `false` means the event didn't move it
          // — a duplicate or an out-of-order delivery. Nothing to announce.
          if (feeResult === false) continue;

          const fee = serializeMobilizationFee(feeResult);

          if (fee.status === MOB_FEE_STATUS.PENDING_PAYMENT) {
            // TODO: Teams — accounting, release the funds.
            // notifyTeams("accounting", {
            //   title: `Mobilization fee signed — ${fee.vendor}`,
            //   amount: fee.amount,
            //   work_order_id: fee.work_order_id,
            // });
            console.log(
              `Mobilization fee ${fee.id} signed — $${fee.amount} to ${fee.vendor}, awaiting payment`,
            );
          } else if (
            fee.status === MOB_FEE_STATUS.DECLINED ||
            fee.status === MOB_FEE_STATUS.VOIDED
          ) {
            // TODO: Teams — ops, the vendor didn't sign.
            console.log(
              `Mobilization fee ${fee.id} ${fee.status.toLowerCase()}`,
            );
          }

          continue;
        }

        // ── Everything whose status simply mirrors PandaDoc's ────────────
        const mapped = STATUS_MAP[rawStatus];
        if (!mapped) {
          console.warn(`PandaDoc webhook: unmapped status "${rawStatus}"`);
          continue;
        }

        let handled = false;
        for (const { model, label } of MIRRORED_TABLES) {
          const row = await prisma[model].findFirst({
            where: { pandadoc_id: pandadocId },
            select: { id: true },
          });
          if (!row) continue;

          await prisma[model].update({
            where: { id: row.id },
            data: {
              status: mapped.status,
              ...(mapped.completed ? { date_completed: new Date() } : {}),
            },
          });

          handled = true;
          break;
        }

        if (!handled) {
          console.warn(`PandaDoc webhook: no local record for ${pandadocId}`);
        }
      } catch (err) {
        console.error(`PandaDoc webhook (${workspaceKey}): event error`, err);
        // Swallowed — we already 200'd, and one bad event shouldn't stop the rest.
      }
    }
  });

  return router;
}
