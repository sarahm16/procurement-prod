/**
 * Compliance (default) notices to a vendor.
 *
 *   POST /api/vendors/:id/notices/compliance
 *     { nature_of_default, impact, deadline, msa_last_updated: "YYYY-MM-DD" | null,
 *       penalty: { amount: "500.00", reason } | null,
 *       sender_title, sender_phone, assignment_ids: [..], user_id }
 *
 * Like a warning, it doesn't take the vendor off anything; it's recorded
 * against the service lines it's about. Unlike a warning it can assess a
 * penalty, and accounting is emailed every time (so a penalty gets withheld).
 *
 * Sending, in order:
 *   1. The PandaDoc notice goes to the vendor.
 *   2. It's recorded (with the penalty) against the lines, and logged.
 *   3. Accounting is emailed. A mail failure is reported, not fatal.
 *
 * The lines and the vendor's MSA date come from
 * GET /api/vendors/:id/notice-options.
 *
 * Register on the vendors router:
 *   import { registerComplianceRoutes } from "./vendorComplianceRoutes.js";
 *   registerComplianceRoutes(router, prisma);
 *
 * .env:
 *   COMPLIANCE_NOTIFY_EMAILS   comma-separated (the old app sent to
 *                              accounting@nationalfacilitycontractors.com)
 *   PANDADOC_COMPLIANCE_TEMPLATE_ID   optional
 */
import { logActivity } from "../utils/logActivity.js";
import { sendMail } from "../services/mail.js";
import { terminationRecipient } from "../services/pandadoc/send/sendTerminationNotice.js";
import {
  formatCurrency,
  sendComplianceNotice,
} from "../services/pandadoc/send/sendComplianceNotice.js";
import {
  buildComplianceEmailBody,
  buildComplianceSubject,
} from "../services/email/complianceEmail.js";
import {
  ASSIGNMENT_SELECT,
  VENDOR_SELECT,
  clean,
  groupBySite,
  liveWhere,
  pandadocUrl,
  serializeNotice,
  sitesForNotice,
} from "../services/notices/noticeData.js";

const VENDOR_ENTITY_TYPE_ID = 1;
const SITE_ENTITY_TYPE_ID = 2;
const TEXT_MAX = 1000;
const DEADLINE_MAX = 100;
const PENALTY_MAX = 1_000_000;

export function registerComplianceRoutes(router, prisma) {
  router.post("/:id/notices/compliance", async (req, res) => {
    const id = Number(req.params.id);
    const b = req.body ?? {};
    const userId = Number(b.user_id);
    const natureOfDefault = clean(b.nature_of_default);
    const impact = clean(b.impact);
    const deadline = clean(b.deadline);
    const msaLastUpdated = clean(b.msa_last_updated) || null;
    const senderTitle = clean(b.sender_title);
    const senderPhone = clean(b.sender_phone);
    const ids = [...new Set((b.assignment_ids ?? []).map(Number))].filter(Number.isInteger);

    // Penalty: optional, but when present it must be a real amount and have
    // a basis. Amounts arrive as text so "12.5" and "12.50" both work.
    let penalty = null;
    if (b.penalty) {
      const raw = String(b.penalty.amount ?? "").trim();
      const amount = /^\d+(\.\d{1,2})?$/.test(raw) ? Number(raw) : NaN;
      const reason = clean(b.penalty.reason);
      if (!(amount > 0)) {
        return res.status(400).json({ error: "Enter a penalty amount greater than zero" });
      }
      if (amount > PENALTY_MAX) {
        return res.status(400).json({ error: "That penalty amount looks wrong" });
      }
      if (!reason) {
        return res.status(400).json({ error: "Give the basis for the penalty" });
      }
      if (reason.length > TEXT_MAX) {
        return res.status(400).json({ error: `Keep the penalty basis under ${TEXT_MAX} characters` });
      }
      penalty = { amount, reason };
    }

    // ── Check the form ──
    const problems = [];
    if (!userId) problems.push("who's sending it");
    if (!ids.length) problems.push("at least one service line");
    if (!natureOfDefault) problems.push("the nature of the default");
    if (!impact) problems.push("the impact");
    if (!deadline) problems.push("a deadline");
    if (!senderTitle) problems.push("your title");
    if (!senderPhone) problems.push("your phone number");
    if (problems.length) {
      return res.status(400).json({ error: `Missing ${problems.join(", ")}` });
    }
    if ([natureOfDefault, impact].some((t) => t.length > TEXT_MAX)) {
      return res
        .status(400)
        .json({ error: `Keep the default and impact under ${TEXT_MAX} characters` });
    }
    if (deadline.length > DEADLINE_MAX) {
      return res.status(400).json({ error: `Keep the deadline under ${DEADLINE_MAX} characters` });
    }
    if (msaLastUpdated && !/^\d{4}-\d{2}-\d{2}$/.test(msaLastUpdated)) {
      return res.status(400).json({ error: "The MSA date isn't a valid date" });
    }

    try {
      const [vendor, sender, assignments] = await Promise.all([
        prisma.vendors.findUnique({ where: { id }, select: VENDOR_SELECT }),
        prisma.employees.findUnique({
          where: { id: userId },
          select: { id: true, name: true, email: true },
        }),
        prisma.vendorContractSites.findMany({
          where: { ...liveWhere(id), id: { in: ids } },
          select: ASSIGNMENT_SELECT,
        }),
      ]);
      if (!vendor) return res.status(404).json({ error: "Vendor not found" });
      if (!sender) return res.status(400).json({ error: "Unknown sender" });
      if (assignments.length !== ids.length) {
        return res.status(409).json({
          error:
            "Some of those service lines have changed since the form opened. Close it and try again.",
        });
      }
      if (!terminationRecipient(vendor)) {
        return res.status(400).json({
          error:
            "This vendor has no email to send the notice to. Add a primary contact with an email first.",
        });
      }

      const sites = groupBySite(assignments);
      const siteSummary = sitesForNotice(sites);
      const notice = { natureOfDefault, impact, deadline, msaLastUpdated, penalty, sites: siteSummary };
      const senderInfo = { ...sender, title: senderTitle, phone: senderPhone };

      // ── 1. PandaDoc ──
      let sent;
      try {
        sent = await sendComplianceNotice(vendor, notice, senderInfo, { user_id: userId });
      } catch (e) {
        if (e.needsPandaDocAuth) {
          return res.status(409).json({
            needsPandaDocAuth: true,
            error: "Your PandaDoc connection needs renewing before you can send this.",
          });
        }
        console.error("PandaDoc compliance send failed:", e.response?.data ?? e);
        return res.status(502).json({
          error: "PandaDoc didn't accept the notice, so nothing was sent. Try again in a moment.",
        });
      }

      // ── 2. Record it ──
      let record;
      try {
        record = await prisma.$transaction(async (tx) => {
          const row = await tx.vendorWarnings.create({
            data: {
              vendor_id: id,
              notice_type: "compliance",
              pandadoc_id: sent.documentId,
              status: "sent",
              date_sent: new Date(),
              sent_by: userId,
              reason: natureOfDefault,
              impact,
              deadline,
              msa_last_updated: msaLastUpdated ? new Date(msaLastUpdated) : null,
              penalty_amount: penalty ? penalty.amount : null,
              penalty_reason: penalty ? penalty.reason : null,
              ContractSites: {
                create: assignments.map((a) => ({ vendor_contract_site_id: a.id })),
              },
            },
            include: { SentBy: { select: { id: true, name: true } } },
          });

          const lineCount = assignments.length;
          await logActivity(tx, {
            entityTypeId: VENDOR_ENTITY_TYPE_ID,
            entityId: id,
            fieldChanged: "compliance_notice",
            previousValue: null,
            newValue: `Sent compliance notice: ${lineCount} service line${lineCount === 1 ? "" : "s"} at ${
              sites.length
            } site${sites.length === 1 ? "" : "s"}${
              penalty ? `, penalty ${formatCurrency(penalty.amount)}` : ""
            }`.slice(0, 255),
            changedBy: userId,
            action: "CREATE",
          });
          for (const s of sites) {
            const text = `Compliance notice sent to ${vendor.company} about ${s.lines
              .map((l) => l.service_line)
              .join(", ")}: ${natureOfDefault}`;
            await logActivity(tx, {
              entityTypeId: SITE_ENTITY_TYPE_ID,
              entityId: s.site_id,
              fieldChanged: "vendor_compliance_notice",
              previousValue: null,
              newValue: text.length > 255 ? `${text.slice(0, 252)}…` : text,
              changedBy: userId,
              action: "CREATE",
            });
          }
          return row;
        });
      } catch (e) {
        console.error(
          `Compliance notice ${sent.documentId} was sent to ${vendor.company} but recording it failed:`,
          e,
        );
        return res.status(500).json({
          error: `The notice was sent to ${vendor.company} (PandaDoc ${sent.documentId}), but saving it here failed. Don't send it again. Ask an admin to record it.`,
          pandadoc_id: sent.documentId,
        });
      }

      // ── 3. Tell accounting ──
      const email = await emailAccounting({
        vendor,
        sender: senderInfo,
        sites: siteSummary,
        notice,
        noticeUrl: pandadocUrl(sent.documentId),
      });

      res.status(201).json({
        notice: serializeNotice(record),
        recipient: sent.recipient,
        lines: assignments.length,
        sites: sites.length,
        penalty: penalty?.amount ?? null,
        email,
      });
    } catch (e) {
      console.error("Error sending compliance notice:", e);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });
}

/** One email per recipient. Resolves to { sent, failed, skipped? }. */
async function emailAccounting({ vendor, sender, sites, notice, noticeUrl }) {
  const to = (process.env.COMPLIANCE_NOTIFY_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!to.length) {
    console.warn("COMPLIANCE_NOTIFY_EMAILS isn't set; accounting wasn't emailed");
    return { sent: 0, failed: 0, skipped: "no recipients configured" };
  }
  const base = (process.env.OPS_APP_URL ?? "").replace(/\/+$/, "");
  const subject = buildComplianceSubject({ vendor, sites, notice });
  const html = buildComplianceEmailBody({
    vendor,
    sender,
    sites,
    notice,
    noticeUrl,
    vendorUrl: base ? `${base}/vendors/${vendor.id}` : null,
  });
  const results = await Promise.allSettled(to.map((addr) => sendMail({ to: addr, subject, html })));
  results
    .filter((r) => r.status === "rejected")
    .forEach((r) => console.error("Compliance email failed:", r.reason?.message ?? r.reason));
  const sent = results.filter((r) => r.status === "fulfilled").length;
  return { sent, failed: results.length - sent };
}

export default registerComplianceRoutes;
