// utils/dates.js

/** "2026-09-30T00:00:00.000Z" → a Date at LOCAL midnight on the 30th. */
export const parseDateOnly = (value) => {
  if (!value) return null;
  const [y, m, d] = String(value).slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
};

/** Display a date-only value. */
export const fmtDate = (value) => {
  const date = parseDateOnly(value);
  return date ? date.toLocaleDateString() : "—";
};

/** Value for <input type="date"> — no Date involved at all. */
export const toInputDate = (value) => (value ? String(value).slice(0, 10) : "");

/** Real timestamps (created_at, check-ins) still want normal parsing. */
export const fmtDateTime = (value) =>
  value ? new Date(value).toLocaleString() : "—";
