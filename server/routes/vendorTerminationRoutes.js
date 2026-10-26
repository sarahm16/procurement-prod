/**
 * Terminating a vendor from service lines with a documented notice.
 *
 *   GET  /api/vendors/:id/termination-options
 *        the vendor's live assignments, grouped by site, and who the notice
 *        would go to
 *
 *   POST /api/vendors/:id/notices/termination
 *        { effective_date: "YYYY-MM-DD", reason, back_charge, back_charge_details,
 *          sender_title, sender_phone, assignment_ids: [..], user_id }
 *
 * Sending, in order:
 *   1. The PandaDoc notice goes to the vendor (from the sender's PandaDoc).
 *   2. One transaction: the notice is recorded in VendorWarnings; the
 *      assignments close ("Terminated", linked to the notice); every line the
 *      vendor was primary on is flagged "Resource now" in sourcing; if that
 *      was every line they had, the vendor's status becomes Terminated.
 *   3. Accounting gets the termination email so they stop paying the vendor.
 *      A mail failure is reported back but doesn't undo anything.
 *
 * Register on the vendors router:
 *   import { registerTerminationRoutes } from "./vendorTerminationRoutes.js";
 *   registerTerminationRoutes(router, prisma);
 *
 * .env:
 *   TERMINATION_NOTIFY_EMAILS   comma-separated: who gets the accounting email
 *   PANDADOC_TERMINATION_TEMPLATE_ID   optional, defaults to the old template
 *   OPS_APP_URL                 for the "Open the vendor" link (already set
 *                               for message emails)
 */

import { logActivity } from "../utils/logActivity.js";
import { sendMail } from "../services/mail.js";
import { closeAssignments } from "../services/sourcing/closeAssignments.js";
import {
  sendTerminationNotice,
  siteAddress,
  terminationRecipient,
} from "../services/pandadoc/send/sendTerminationNotice.js";
import {
  buildTerminationEmailBody,
  buildTerminationSubject,
} from "../services/email/terminationEmail.js";

const VENDOR_ENTITY_TYPE_ID = 1;
const SITE_ENTITY_TYPE_ID = 2;
const TERMINATED_STATUS = "Terminated";
const TEXT_MAX = 1000;

export const pandadocUrl = (id) =>
  id ? `https://app.pandadoc.com/a/#/documents/${id}` : null;

/** A notice as the Notices list shows it. */
export const serializeNotice = (n) => ({
  ...n,
  pandadoc_url: pandadocUrl(n.pandadoc_id),
});

const VENDOR_SELECT = {
  id: true,
  company: true,
  contact_email: true,
  mailing_address: true,
  mailing_city: true,
  mailing_state: true,
  mailing_zipcode: true,
  status_id: true,
  Contacts: { select: { name: true, email: true, contact_role_id: true } },
};

const ASSIGNMENT_SELECT = {
  id: true,
  contract_site_id: true,
  is_primary: true,
  ContractSite: {
    select: {
      site_id: true,
      Site: {
        select: {
          store: true,
          mailing_address: true,
          mailing_city: true,
          mailing_state: true,
          mailing_zipcode: true,
          Client: { select: { client: true } },
        },
      },
      Contract: { select: { ServiceLine: { select: { name: true } } } },
    },
  },
};

const liveWhere = (vendorId) => ({
  vendor_id: vendorId,
  VendorSiteStatus: { category: { not: "closed" } },
});

/** Assignments → [{ site_id, client, store, address, lines: [...] }] */
function groupBySite(assignments) {
  const sites = new Map();
  for (const a of assignments) {
    const cs = a.ContractSite;
    const key = cs.site_id;
    if (!sites.has(key)) {
      sites.set(key, {
        site_id: key,
        client: cs.Site?.Client?.client ?? "",
        store: cs.Site?.store ?? `Site ${key}`,
        address: siteAddress(cs.Site),
        lines: [],
      });
    }
    sites.get(key).lines.push({
      assignment_id: a.id,
      contract_site_id: a.contract_site_id,
      service_line: cs.Contract?.ServiceLine?.name ?? "Service line",
      is_primary: a.is_primary,
    });
  }
  return [...sites.values()]
    .map((s) => ({ ...s, lines: s.lines.sort((x, y) => x.service_line.localeCompare(y.service_line)) }))
    .sort((a, b) => a.client.localeCompare(b.client) || a.store.localeCompare(b.store, undefined, { numeric: true }));
}

/** Today as YYYY-MM-DD in the server's time zone. */
const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const clean = (v) => (typeof v === "string" ? v.trim() : "");

export function registerTerminationRoutes(router, prisma) {
  // ── GET /api/vendors/:id/termination-options ────────────────────────────
  router.get("/:id/termination-options", async (req, res) => {
    const id = Number(req.params.id);
    try {
      const vendor = await prisma.vendors.findUnique({ where: { id }, select: VENDOR_SELECT });
      if (!vendor) return res.status(404).json({ error: "Vendor not found" });

      const assignments = await prisma.vendorContractSites.findMany({
        where: liveWhere(id),
        select: ASSIGNMENT_SELECT,
      });

      res.json({
        vendor: {
          id: vendor.id,
          company: vendor.company,
          recipient: terminationRecipient(vendor),
        },
        sites: groupBySite(assignments),
      });
    } catch (e) {
      console.error("Error loading termination options:", e);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // ── POST /api/vendors/:id/notices/termination ───────────────────────────
  router.post("/:id/notices/termination", async (req, res) => {
    const id = Number(req.params.id);
    const b = req.body ?? {};
    const userId = Number(b.user_id);
    const effective = clean(b.effective_date);
    const reason = clean(b.reason);
    const backCharge = b.back_charge === true;
    const backChargeDetails = clean(b.back_charge_details);
    const senderTitle = clean(b.sender_title);
    const senderPhone = clean(b.sender_phone);
    const ids = [...new Set((b.assignment_ids ?? []).map(Number))].filter(Number.isInteger);

    // ── Check the form ──
    const problems = [];
    if (!userId) problems.push("who's sending it");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(effective) || Number.isNaN(Date.parse(effective))) {
      problems.push("an effective date");
    } else if (effective < todayIso()) {
      return res.status(400).json({ error: "The effective date can't be in the past" });
    }
    if (!reason) problems.push("a reason");
    if (backCharge && !backChargeDetails) problems.push("the back charge details");
    if (!senderTitle) problems.push("your title");
    if (!senderPhone) problems.push("your phone number");
    if (!ids.length) problems.push("at least one service line");
    if (problems.length) {
      return res.status(400).json({ error: `Missing ${problems.join(", ")}` });
    }
    if ([reason, backChargeDetails].some((t) => t.length > TEXT_MAX)) {
      return res.status(400).json({ error: `Keep the reason and back charge under ${TEXT_MAX} characters` });
    }

    try {
      const [vendor, sender, assignments] = await Promise.all([
        prisma.vendors.findUnique({ where: { id }, select: VENDOR_SELECT }),
        prisma.employees.findUnique({ where: { id: userId }, select: { id: true, name: true, email: true } }),
        prisma.vendorContractSites.findMany({
          where: { ...liveWhere(id), id: { in: ids } },
          select: ASSIGNMENT_SELECT,
        }),
      ]);
      if (!vendor) return res.status(404).json({ error: "Vendor not found" });
      if (!sender) return res.status(400).json({ error: "Unknown sender" });
      if (assignments.length !== ids.length) {
        return res.status(409).json({
          error: "Some of those service lines have changed since the form opened. Close it and try again.",
        });
      }
      if (!terminationRecipient(vendor)) {
        return res.status(400).json({
          error: "This vendor has no email to send the notice to. Add a primary contact with an email first.",
        });
      }

      const sites = groupBySite(assignments);
      const siteSummary = sites.map((s) => ({ ...s, lines: s.lines.map((l) => l.service_line) }));
      const notice = {
        effectiveDate: effective,
        reason,
        backCharge,
        backChargeDetails,
        sites: siteSummary,
      };
      const senderInfo = { ...sender, title: senderTitle, phone: senderPhone };

      // ── 1. PandaDoc ──
      let sent;
      try {
        sent = await sendTerminationNotice(vendor, notice, senderInfo, { user_id: userId });
      } catch (e) {
        if (e.needsPandaDocAuth) {
          return res.status(409).json({
            needsPandaDocAuth: true,
            error: "Your PandaDoc connection needs renewing before you can send this.",
          });
        }
        console.error("PandaDoc termination send failed:", e.response?.data ?? e);
        return res.status(502).json({
          error: "PandaDoc didn't accept the notice, so nothing was changed. Try again in a moment.",
        });
      }

      // ── 2. Record it and take them off the lines ──
      let result;
      try {
        result = await prisma.$transaction(async (tx) => {
          const record = await tx.vendorWarnings.create({
            data: {
              vendor_id: id,
              notice_type: "termination",
              pandadoc_id: sent.documentId,
              status: "sent",
              date_sent: new Date(),
              sent_by: userId,
              effective_date: new Date(effective),
              reason,
              back_charge: backCharge,
              back_charge_details: backCharge ? backChargeDetails : null,
            },
            include: { SentBy: { select: { id: true, name: true } } },
          });

          const { closed, flagged } = await closeAssignments(tx, assignments, {
            reason: "Terminated",
            notes: reason,
            noticeId: record.id,
            flagReason: `${vendor.company} terminated: ${reason}`,
            userId,
          });

          // Every line gone → the vendor is terminated.
          const remaining = await tx.vendorContractSites.count({ where: liveWhere(id) });
          let terminatedStatus = null;
          if (remaining === 0) {
            terminatedStatus = await tx.vendorStatuses.findFirst({
              where: { name: TERMINATED_STATUS },
            });
            if (terminatedStatus && terminatedStatus.id !== vendor.status_id) {
              await tx.vendors.update({ where: { id }, data: { status_id: terminatedStatus.id } });
            } else if (!terminatedStatus) {
              console.warn(`No vendor status named "${TERMINATED_STATUS}"; status left as is`);
            }
          }

          const lineCount = assignments.length;
          await logActivity(tx, {
            entityTypeId: VENDOR_ENTITY_TYPE_ID,
            entityId: id,
            fieldChanged: "termination_notice",
            previousValue: null,
            newValue: `Sent termination notice: ${lineCount} service line${lineCount === 1 ? "" : "s"} at ${
              sites.length
            } site${sites.length === 1 ? "" : "s"}, effective ${effective}${
              remaining === 0 && terminatedStatus ? ". Vendor terminated" : ""
            }`,
            changedBy: userId,
            action: "CREATE",
          });
          for (const s of sites) {
            const text = `${vendor.company} terminated from ${s.lines
              .map((l) => l.service_line)
              .join(", ")} (notice sent, effective ${effective})`;
            await logActivity(tx, {
              entityTypeId: SITE_ENTITY_TYPE_ID,
              entityId: s.site_id,
              fieldChanged: "vendor_assignment",
              previousValue: vendor.company,
              newValue: text.length > 255 ? `${text.slice(0, 252)}…` : text,
              changedBy: userId,
              action: "UPDATE",
            });
          }

          return {
            record,
            closed,
            flagged,
            vendor_terminated: remaining === 0 && Boolean(terminatedStatus),
          };
        });
      } catch (e) {
        // The vendor HAS been sent the notice. Say so plainly so nobody sends
        // it twice, and log enough to fix the records by hand.
        console.error(
          `Termination notice ${sent.documentId} was sent to ${vendor.company} but recording it failed:`,
          e,
        );
        return res.status(500).json({
          error: `The notice was sent to ${vendor.company} (PandaDoc ${sent.documentId}), but saving it here failed. Don't send it again. Ask an admin to finish the termination.`,
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
        notice: serializeNotice(result.record),
        recipient: sent.recipient,
        closed: result.closed,
        flagged: result.flagged,
        vendor_terminated: result.vendor_terminated,
        email,
      });
    } catch (e) {
      console.error("Error sending termination notice:", e);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });
}

/** One email per recipient. Resolves to { sent, failed, skipped? }. */
async function emailAccounting({ vendor, sender, sites, notice, noticeUrl }) {
  const to = (process.env.TERMINATION_NOTIFY_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!to.length) {
    console.warn("TERMINATION_NOTIFY_EMAILS isn't set; accounting wasn't emailed");
    return { sent: 0, failed: 0, skipped: "no recipients configured" };
  }

  const base = (process.env.OPS_APP_URL ?? "").replace(/\/+$/, "");
  const subject = buildTerminationSubject({ vendor, sites, notice });
  const html = buildTerminationEmailBody({
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
    .forEach((r) => console.error("Termination email failed:", r.reason?.message ?? r.reason));
  const sent = results.filter((r) => r.status === "fulfilled").length;
  return { sent, failed: results.length - sent };
}

export default registerTerminationRoutes;
