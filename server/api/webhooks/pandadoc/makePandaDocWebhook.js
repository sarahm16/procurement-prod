// server/api/webhooks/pandadoc/makePandaDocWebhook.js
import express from "express";
import crypto from "crypto";
import prisma from "../../../db.js";

// Hardcoded for now — move to Key Vault / env later.
const WEBHOOK_SECRETS = {
  accounting: "8iQELHV26kj9sbp9VSnkuJ",
  operations: "ovJnCU94cTQL8sMU4hjKpf",
};

// PandaDoc status → your internal status + whether it's a completion
const STATUS_MAP = {
  "document.draft": { status: "draft" },
  "document.sent": { status: "sent" },
  "document.viewed": { status: "viewed" },
  "document.completed": { status: "completed", completed: true },
  "document.declined": { status: "declined" },
  "document.voided": { status: "voided" },
};

/**
 * Verify the request came from PandaDoc.
 * PandaDoc signs the raw body with HMAC-SHA256; signature is in ?signature=.
 * NOTE: confirm the exact mechanism against a real payload — see notes below.
 */
function verifySignature(req, secret) {
  const signature = req.query.signature;
  if (!signature) return false;

  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(req.body); // req.body is the raw Buffer (raw parser ran in index.js)
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

    // 1. Verify authenticity before trusting the payload
    if (!verifySignature(req, secret)) {
      console.warn(`PandaDoc webhook (${workspaceKey}): invalid signature`);
      return res.status(401).end();
    }

    // 2. Parse the now-verified raw body
    let events;
    try {
      events = JSON.parse(req.body.toString("utf8"));
    } catch {
      return res.status(400).end();
    }

    // 3. Ack fast — PandaDoc retries on slow/failed responses
    res.status(200).end();

    // 4. Process each event
    for (const event of events) {
      try {
        // Only care about status changes (confirm event name from real payload)
        if (event.event !== "document_state_changed") continue;

        const pandadocId = event.data?.id;
        const rawStatus = event.data?.status;
        if (!pandadocId || !rawStatus) continue;

        const mapped = STATUS_MAP[rawStatus];
        if (!mapped) {
          console.warn(`PandaDoc webhook: unmapped status "${rawStatus}"`);
          continue;
        }

        // Check compliance table first for panda doc id
        const compliance = await prisma.vendorComplianceDocuments.findFirst({
          where: { pandadoc_id: pandadocId },
        });

        // if (!compliance) {
        //   console.warn(`PandaDoc webhook: no local record for ${pandadocId}`);
        //   continue;
        // }

        if (compliance) {
          await prisma.$transaction(async (tx) => {
            await tx.vendorComplianceDocuments.update({
              where: { id: compliance.id },
              data: {
                status: mapped.status,
                ...(mapped.completed ? { date_completed: new Date() } : {}),
              },
            });
            // optionally logActivity(tx, { ...against doc.vendor_id... });
          });
          continue;
        }

        // Find our local record by pandadoc_id (works for any doc type)
        const notice = await prisma.vendorWarnings.findFirst({
          where: { pandadoc_id: pandadocId },
        });

        if (notice) {
          await prisma.$transaction(async (tx) => {
            await tx.vendorWarnings.update({
              where: { id: notice.id },
              data: {
                status: mapped.status,
                ...(mapped.completed ? { date_completed: new Date() } : {}),
              },
            });
          });
          continue;
        }
      } catch (err) {
        console.error(`PandaDoc webhook (${workspaceKey}): event error`, err);
        // swallow — already 200'd; one bad event shouldn't stop the rest
      }
    }
  });

  return router;
}
