// services/textRequest.js
//
// Reads text conversations from Text Request, on the server — the API key
// stays here instead of in the browser, and no CORS proxy is needed.
//
// .env:
//   TEXTREQUEST_API_KEY   the old VITE_TEXTREQUEST_API_KEY
//   TEXTREQUEST_API_BASE  optional, defaults to https://api.textrequest.com/api/v3
//
// Ported from the old app's src/api/textRequest.js; the comments on the
// API's quirks came with it.

const PAGE_SIZE = 100;
const MAX_PAGES = 20; // safety valve so a bad `meta` can never loop forever

// Text Request's `page` parameter is 0-indexed: page 0 is the first page.
// Starting at 1 silently skips the first PAGE_SIZE results.
const FIRST_PAGE = 0;

export class TextRequestError extends Error {
  constructor(status, message, detail) {
    super(message);
    this.status = status;
    this.detail = detail;
  }
}

const base = () =>
  (process.env.TEXTREQUEST_API_BASE || "https://api.textrequest.com/api/v3").replace(/\/+$/, "");

/** GET a Text Request path. Resolves to null on 404. */
async function trGet(path, params = {}) {
  const key = process.env.TEXTREQUEST_API_KEY;
  if (!key) {
    throw new TextRequestError(500, "Text Request isn't set up: TEXTREQUEST_API_KEY is missing");
  }
  const url = new URL(`${base()}${path}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));

  let res;
  try {
    res = await fetch(url, { headers: { "x-api-key": key, Accept: "application/json" } });
  } catch (e) {
    throw new TextRequestError(502, "Couldn't reach Text Request", e.message);
  }
  if (res.status === 404) return null;
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new TextRequestError(
      502,
      res.status === 401 || res.status === 403
        ? "Text Request turned the API key down. Check TEXTREQUEST_API_KEY."
        : `Text Request answered ${res.status}`,
      detail,
    );
  }
  return res.json();
}

/**
 * Vendor phone numbers come from free-text fields, so they arrive as
 * "(423) 555-0198", "423.555.0198", "+1 423-555-0198", "n/a", "call Bob", etc.
 *
 * Text Request keys contacts as 11 digits WITH the country code and WITHOUT a
 * plus sign — "14235550198". A bare 10-digit number matches no contact and
 * comes back as a perfectly valid, perfectly empty page.
 *
 * Returns that 11-digit string, or null if the value isn't a usable number.
 */
export function normalizePhone(value) {
  if (!value) return null;
  const digits = String(value).replace(/\D/g, "");
  if (digits.length === 10) return `1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return digits;
  return null; // 7 digits, extensions, junk text, empty
}

/**
 * The API documents its timestamps as UTC, but they can arrive without a
 * trailing "Z" — which would be read as local time. Make it explicit.
 */
export function parseUtc(timestamp) {
  if (!timestamp) return null;
  const iso = /[Zz]|[+-]\d{2}:?\d{2}$/.test(timestamp) ? timestamp : `${timestamp}Z`;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

/* ── Dashboards (our numbers) ─────────────────────────────────────────── */

// They hardly ever change; don't ask on every page load.
let dashboardCache = null; // { at, items }
const DASHBOARD_TTL_MS = 10 * 60 * 1000;

export async function fetchDashboards() {
  if (dashboardCache && Date.now() - dashboardCache.at < DASHBOARD_TTL_MS) {
    return dashboardCache.items;
  }
  const body = await trGet("/dashboards");
  const items = (body?.items ?? []).map((d) => ({
    id: d.dashboard_id ?? d.id,
    name: d.name ?? null,
    phone: d.phone_number ?? d.phone ?? null,
  }));
  dashboardCache = { at: Date.now(), items };
  return items;
}

/* ── Messages ─────────────────────────────────────────────────────────── */

/**
 * Every message with one number on one dashboard, walking the pages.
 * A dashboard that has never texted the number has no contact there (404):
 * that's "no messages", not a failure.
 */
async function fetchDashboardMessages(dashboardId, phone) {
  const messages = [];
  for (let page = FIRST_PAGE; page - FIRST_PAGE < MAX_PAGES; page += 1) {
    const body = await trGet(
      `/dashboards/${dashboardId}/contacts/${encodeURIComponent(phone)}/messages`,
      { page, page_size: PAGE_SIZE },
    );
    if (!body) break;
    const items = body.items ?? [];
    messages.push(...items);
    const total = body.meta?.total_items ?? messages.length;
    if (items.length === 0 || messages.length >= total) break;
  }
  return messages;
}

const serializeMessage = (m, dashboard, phone) => {
  const at = parseUtc(m.message_timestamp_utc);
  return {
    id: String(m.message_id ?? `${dashboard.id}-${m.message_timestamp_utc}`),
    direction: m.message_direction === "R" ? "received" : "sent",
    body: m.body ?? "",
    sent_at: at ? at.toISOString() : null,
    delivery_status: m.delivery_status ?? null,
    dashboard: dashboard.name,
    dashboard_phone: dashboard.phone,
    phone, // the vendor's number this was with
  };
};

/**
 * Every message with these numbers, across every dashboard, oldest first.
 * One dashboard failing doesn't blank the rest: the result says it's partial.
 * Resolves to { messages, failed } — failed is how many lookups errored.
 */
export async function fetchMessagesForNumbers(phones) {
  if (!phones.length) return { messages: [], failed: 0 };
  if (!process.env.TEXTREQUEST_API_KEY) {
    throw new TextRequestError(500, "Text Request isn't set up: TEXTREQUEST_API_KEY is missing");
  }
  const dashboards = await fetchDashboards();

  const jobs = phones.flatMap((phone) =>
    dashboards.map(async (d) =>
      (await fetchDashboardMessages(d.id, phone)).map((m) => serializeMessage(m, d, phone)),
    ),
  );
  const results = await Promise.allSettled(jobs);

  const failed = results.filter((r) => r.status === "rejected");
  failed.forEach((r) => console.warn("Text Request lookup failed:", r.reason?.detail ?? r.reason));
  if (failed.length && failed.length === results.length) {
    // Every lookup failed: that's an outage, not "no messages".
    throw failed[0].reason;
  }

  const seen = new Set();
  const messages = results
    .filter((r) => r.status === "fulfilled")
    .flatMap((r) => r.value)
    .filter((m) => !seen.has(m.id) && seen.add(m.id))
    .sort((a, b) => (a.sent_at ?? "").localeCompare(b.sent_at ?? ""));

  return { messages, failed: failed.length };
}
