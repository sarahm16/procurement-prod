// services/messageNotifications.js
//
// Emails people when a work order message is posted.
//
//   NFC → client   every active client login who can see the work order's
//                  site (site limits respected)
//   NFC → vendor   every active login at the vendor on the message
//   client/vendor → NFC
//                  everyone in the work order's Team card; if nobody is
//                  assigned, OPS_NOTIFICATIONS_EMAIL
//
// Once per burst: if the same side already posted in the same conversation
// in the last 10 minutes, no new email goes out — the first one already
// brought them in.
//
// Call it after the message is saved, without awaiting it, so a mail
// problem never fails the post:
//
//   notifyAboutMessage(prisma, message).catch((e) =>
//     console.error("Message email failed:", e));
//
// .env:
//   OPS_APP_URL              e.g. https://ops.yourdomain.com
//   VENDOR_PORTAL_URL        e.g. https://vendors.yourdomain.com
//   CLIENT_PORTAL_URL        e.g. https://clients.yourdomain.com
//   OPS_NOTIFICATIONS_EMAIL  shared mailbox for messages on work orders with
//                            no team assigned (optional)
import { sendMail } from "./mail.js";

const WORK_ORDER_ENTITY_TYPE_ID = 4;
export const BURST_MINUTES = 10;

const escapeHtml = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );

const trimUrl = (u) => (u ? String(u).replace(/\/+$/, "") : "");

/** Which side wrote it: "nfc" or "external" (client or vendor). */
const sideOf = (m) => (m.employee_id ? "nfc" : "external");

/** True when the same side already posted here within the burst window. */
async function inBurst(prisma, m) {
  const since = new Date(
    new Date(m.created_at).getTime() - BURST_MINUTES * 60 * 1000,
  );
  const earlier = await prisma.workOrderCommunications.findFirst({
    where: {
      id: { not: m.id },
      work_order_id: m.work_order_id,
      channel: m.channel,
      ...(m.channel === "vendor" && { vendor_id: m.vendor_id }),
      created_at: { gte: since, lte: m.created_at },
      employee_id: sideOf(m) === "nfc" ? { not: null } : null,
    },
    select: { id: true },
  });
  return Boolean(earlier);
}

/** Unique, non-empty, lowercased emails. */
const uniqueEmails = (rows) => [
  ...new Set(rows.map((r) => r.email?.trim().toLowerCase()).filter(Boolean)),
];

async function recipientsFor(prisma, m, wo) {
  if (sideOf(m) === "nfc") {
    if (m.channel === "client") {
      // Client logins who can see this site: no site limits, or this site
      // in their limits.
      const users = await prisma.clientUsers.findMany({
        where: {
          client_id: wo.Site.client_id,
          is_active: true,
          OR: [
            { Sites: { none: {} } },
            { Sites: { some: { site_id: wo.site_id } } },
          ],
        },
        select: { email: true },
      });
      return { audience: "client", emails: uniqueEmails(users) };
    }
    const users = await prisma.vendorUsers.findMany({
      where: { vendor_id: m.vendor_id, is_active: true },
      select: { email: true },
    });
    return { audience: "vendor", emails: uniqueEmails(users) };
  }

  // A client or vendor wrote it: our team on the work order.
  const team = await prisma.roleAssignments.findMany({
    where: { entity_type_id: WORK_ORDER_ENTITY_TYPE_ID, entity_id: wo.id },
    select: { Employee: { select: { email: true, terminated: true } } },
  });
  let emails = uniqueEmails(
    team.map((t) => t.Employee).filter((e) => e && !e.terminated),
  );
  if (!emails.length && process.env.OPS_NOTIFICATIONS_EMAIL) {
    emails = [process.env.OPS_NOTIFICATIONS_EMAIL.trim().toLowerCase()];
  }
  return { audience: "nfc", emails };
}

function linkFor(audience, wo) {
  if (audience === "nfc") {
    const base = trimUrl(process.env.OPS_APP_URL);
    return base ? `${base}/workorders/${wo.id}` : null;
  }
  const base = trimUrl(
    audience === "client"
      ? process.env.CLIENT_PORTAL_URL
      : process.env.VENDOR_PORTAL_URL,
  );
  return base ? `${base}/work-orders/${wo.id}` : null;
}

/** "Mike Dunn · Cascade Paving LLC", "Jane Doe · Walmart", "Sarah Carter · NFC". */
function authorLabel(m, wo) {
  if (m.employee_id) return `${m.Employee?.name ?? "Our team"} · NFC`;
  if (m.vendor_user_id)
    return [m.VendorUser?.name, m.Vendor?.company].filter(Boolean).join(" · ");
  return [m.ClientUser?.name, wo.Site?.Client?.client]
    .filter(Boolean)
    .join(" · ");
}

function buildEmail({ m, wo, audience, link }) {
  const site = [wo.Site?.store, wo.Site?.mailing_city, wo.Site?.mailing_state]
    .map((s) => (typeof s === "string" ? s.trim() : s))
    .filter(Boolean)
    .join(", ");
  const from = authorLabel(m, wo);
  // Our team sees which conversation it came in on.
  const conversation =
    audience === "nfc" ? `the ${m.channel} conversation` : null;

  const subject = `New message on ${wo.work_order_number}${site ? ` · ${site}` : ""}`;

  const html = `
  <div style="font-family: Arial, sans-serif; max-width: 560px; color: #1f2937;">
    <p style="margin: 0 0 4px; font-size: 13px; color: #6b7280;">
      ${escapeHtml(wo.work_order_number)}${site ? ` &middot; ${escapeHtml(site)}` : ""}
    </p>
    <p style="margin: 0 0 16px; font-size: 16px;">
      <strong>${escapeHtml(from)}</strong> sent a message${
        conversation ? ` in ${escapeHtml(conversation)}` : ""
      }:
    </p>
    <div style="border-left: 4px solid #E07B39; background: #f9fafb; padding: 12px 16px; white-space: pre-wrap; font-size: 15px; line-height: 1.5;">${escapeHtml(
      m.content,
    )}</div>
    ${
      link
        ? `<p style="margin: 24px 0;">
      <a href="${escapeHtml(link)}" style="background: #1B3A5C; color: #ffffff; text-decoration: none; padding: 12px 20px; border-radius: 4px; font-weight: bold; display: inline-block;">
        ${audience === "nfc" ? "Open the work order" : "View and reply"}
      </a>
    </p>`
        : ""
    }
    <p style="font-size: 12px; color: #9ca3af; margin-top: 24px;">
      ${
        audience === "nfc"
          ? "You're getting this because you're on this work order's team."
          : "Please reply in the portal rather than to this email, so the whole team sees it."
      }
    </p>
  </div>`;

  return { subject, html };
}

/**
 * Email the other side about a saved message. Resolves to
 * { sent: n, skipped?: reason } — never throws for a single bad address.
 */
export async function notifyAboutMessage(prisma, message) {
  const m = await prisma.workOrderCommunications.findUnique({
    where: { id: message.id },
    include: {
      Employee: { select: { name: true } },
      VendorUser: { select: { name: true } },
      ClientUser: { select: { name: true } },
      Vendor: { select: { company: true } },
    },
  });
  if (!m) return { sent: 0, skipped: "message not found" };

  if (await inBurst(prisma, m)) return { sent: 0, skipped: "burst" };

  const wo = await prisma.workOrders.findUnique({
    where: { id: m.work_order_id },
    select: {
      id: true,
      work_order_number: true,
      site_id: true,
      portal_released_at: true,
      Site: {
        select: {
          client_id: true,
          store: true,
          mailing_city: true,
          mailing_state: true,
          Client: { select: { client: true } },
        },
      },
    },
  });
  if (!wo) return { sent: 0, skipped: "work order not found" };

  const { audience, emails } = await recipientsFor(prisma, m, wo);
  if (!emails.length) return { sent: 0, skipped: "no recipients" };

  // A vendor can only open the work order once it's released to the portal;
  // before that the email still carries the message, just no button.
  const link =
    audience === "vendor" && !wo.portal_released_at
      ? null
      : linkFor(audience, wo);

  const { subject, html } = buildEmail({ m, wo, audience, link });

  // One email per person, so nobody sees anyone else's address.
  const results = await Promise.allSettled(
    emails.map((to) => sendMail({ to, subject, html })),
  );
  results
    .filter((r) => r.status === "rejected")
    .forEach((r) =>
      console.error("Message email failed:", r.reason?.message ?? r.reason),
    );
  return { sent: results.filter((r) => r.status === "fulfilled").length };
}
