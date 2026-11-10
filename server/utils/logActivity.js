// server/utils/logActivity.js
//
// The activity log: who did what, when, on which record.
//
//   await logActivity(tx, {
//     entityTypeId: 1,          // the record it happened to (vendors 1, sites 2,
//     entityId: vendor.id,      //   clients 3, work orders 4, contracts 5)
//     userId,                   // who did it (required)
//     action: "Sent MSA",       // one plain sentence, written for a person
//   });
//
// Good actions read like a feed: "Sent MSA", "Assigned North Shore Snow to
// Snow Removal", "Updated status to Active", "Uploaded COI (expires Mar 1, 2027)".
// Start with a past-tense verb and name the thing, not the column.
//
// When one action touches two records (assigning a vendor to a site), log it
// on both, each worded from that record's side.
//
// `event` is optional: a short fixed key for code that needs to find entries
// later. Nobody sees it. The reports use "phase_finance" and "phase_ops".

const ACTION_MAX = 500;

const clip = (s, max = ACTION_MAX) => {
  const t = String(s ?? "").replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
};

function entryData({ entityTypeId, entityId, userId, action, event }) {
  const by = Number(userId);
  if (!Number.isInteger(by) || by <= 0) {
    // ActivityLog.changed_by is required. Routes should check user_id up front.
    throw new Error(`logActivity: userId is required (logging "${action}")`);
  }
  const text = clip(action);
  if (!text) throw new Error("logActivity: action is required");
  return {
    entity_type_id: Number(entityTypeId),
    entity_id: Number(entityId),
    changed_by: by,
    action: text,
    event: event ?? null,
  };
}

/** One entry. Pass the transaction client when inside a transaction. */
export function logActivity(db, entry) {
  return db.activityLog.create({ data: entryData(entry) });
}

/** Several entries at once (one per site, say). Skips falsy ones. */
export function logActivities(db, entries) {
  const data = entries.filter(Boolean).map(entryData);
  if (!data.length) return Promise.resolve({ count: 0 });
  return db.activityLog.createMany({ data });
}

/** A record's activity, newest first. */
export function loadActivity(prisma, entityTypeId, entityId) {
  return prisma.activityLog.findMany({
    where: { entity_type_id: Number(entityTypeId), entity_id: Number(entityId) },
    orderBy: [{ changed_at: "desc" }, { id: "desc" }],
    include: { Employee: { select: { id: true, name: true } } },
  });
}

/* ── Wording helpers ─────────────────────────────────────────────────── */

/** "a", "a and b", "a, b and c" */
export function listText(items) {
  const xs = items.filter(Boolean);
  if (xs.length <= 1) return xs[0] ?? "";
  return `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`;
}

/** "1 site", "3 sites" */
export const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** "$1,250.00" */
export const moneyText = (n) =>
  Number(n ?? 0).toLocaleString("en-US", { style: "currency", currency: "USD" });

/** "Mar 1, 2027" from a Date or "YYYY-MM-DD" (date-only values aren't shifted by time zone). */
export function dateText(value) {
  if (!value) return "";
  const iso = value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
  const d = new Date(`${iso}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

/** "store_number" → "store number", "status_id" → "status" */
export const fieldLabel = (key) => String(key).replace(/_id$/, "").replace(/_/g, " ");

const SHORT_VALUE = 60;

/**
 * One sentence for a form save.
 *   changes: [{ label, value }]
 *     value: what it changed to, already readable ("Active", "Mar 1, 2027")
 *            null or ""  → cleared
 *            undefined   → say only that the field changed (long text, addresses)
 *   Entries with the same label are said once ("mailing address").
 *
 *   [{ label: "status", value: "Active" }]           → "Updated status to Active"
 *   [{ label: "phone", value: null }]                → "Cleared phone"
 *   two short ones                                   → "Updated status to Active and phone to 603-555-0100"
 *   more than two                                    → "Updated company, phone, email and mailing address"
 */
export function describeUpdate(changes, { max = 2 } = {}) {
  const seen = new Map();
  for (const c of changes) {
    if (!c?.label) continue;
    if (seen.has(c.label)) seen.set(c.label, { label: c.label, value: undefined });
    else seen.set(c.label, c);
  }
  const list = [...seen.values()];
  if (!list.length) return null;

  const cleared = (c) => c.value === null || c.value === "";
  const showValue = (c) => c.value !== undefined && !cleared(c) && String(c.value).length <= SHORT_VALUE;

  if (list.length === 1) {
    const [c] = list;
    if (cleared(c)) return `Cleared ${c.label}`;
    return showValue(c) ? `Updated ${c.label} to ${c.value}` : `Updated ${c.label}`;
  }
  if (list.length <= max) {
    const parts = list.map((c) => (cleared(c) ? `${c.label} to blank` : showValue(c) ? `${c.label} to ${c.value}` : c.label));
    return `Updated ${listText(parts)}`;
  }
  return `Updated ${listText(list.map((c) => c.label))}`;
}

/**
 * Turns [key, newValue] pairs from a PUT into describeUpdate() input.
 *   fields: { key: "label" | { label, show(value) → readable text, hide: true, long: true } }
 *   Keys not in `fields` get fieldLabel(key). Hidden keys (lat/lng) are skipped.
 */
export function changesFor(entries, fields = {}) {
  const ALWAYS_HIDDEN = ["lat", "lng", "user_id", "created_at", "updated_at"];
  const out = [];
  for (const [key, value] of entries) {
    const f = typeof fields[key] === "string" ? { label: fields[key] } : (fields[key] ?? {});
    if (f.hide || (ALWAYS_HIDDEN.includes(key) && !fields[key])) continue;
    const label = f.label ?? fieldLabel(key);
    let shown;
    if (f.long) shown = undefined;
    else if (value === null || value === undefined || value === "") shown = null;
    else if (f.show) shown = f.show(value);
    else if (typeof value === "boolean") shown = value ? "yes" : "no";
    else if (value instanceof Date) shown = dateText(value);
    else shown = String(value);
    out.push({ label, value: shown });
  }
  return out;
}

/** Address fields said as one "mailing address" / "billing address" change. */
export const ADDRESS_FIELDS = {
  mailing_address: { label: "mailing address", long: true },
  mailing_address2: { label: "mailing address", long: true },
  mailing_city: { label: "mailing address", long: true },
  mailing_state: { label: "mailing address", long: true },
  mailing_zipcode: { label: "mailing address", long: true },
  billing_address: { label: "billing address", long: true },
  billing_address2: { label: "billing address", long: true },
  billing_city: { label: "billing address", long: true },
  billing_state: { label: "billing address", long: true },
  billing_zipcode: { label: "billing address", long: true },
};
