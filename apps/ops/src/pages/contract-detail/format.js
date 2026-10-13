// contract-detail/format.js — how the contract page writes dates and numbers.

/** "2026-11-01" → "Nov 1, 2026" without the timezone shifting the day. */
export const fmtDay = (ymd) =>
  ymd
    ? new Date(`${ymd}T00:00:00Z`).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      })
    : null;

/** Short form for tight spots: "Nov 1". */
export const fmtShortDay = (ymd) =>
  ymd
    ? new Date(`${ymd}T00:00:00Z`).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      })
    : null;

export const fmtMoney = (v, digits = 0) =>
  v == null || v === ""
    ? null
    : Number(v).toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      });

export const fmtNumber = (v) =>
  v == null || v === ""
    ? null
    : Number(v).toLocaleString("en-US", { maximumFractionDigits: 2 });

/** Today as "YYYY-MM-DD" in the user's own timezone. */
export const todayYmd = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
