// workorder-detail/finance.js
//
// Small money helpers shared by the Send to Finance dialog and the
// Accounting tab, so both show the same numbers.

export const OPS_DONE = "Completed";
export const FINANCE_START = "Fin Open";
const CHILD_FINISHED = ["Completed", "Cancelled"];

/** Margin bands — same as the work order list. */
export const MARGIN_GOOD = 50;
export const MARGIN_WATCH = 47;

export const fmtMoney = (n) =>
  n == null
    ? "—"
    : Number(n).toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
      });

export const sumPrices = (services = [], field) =>
  services.reduce((t, s) => t + (Number(s[field]) || 0), 0) || null;

export const marginPercent = (client, vendor) =>
  client > 0 && vendor != null ? ((client - vendor) / client) * 100 : null;

export const marginColor = (pct) =>
  pct == null
    ? "text.secondary"
    : pct >= MARGIN_GOOD
      ? "success.main"
      : pct >= MARGIN_WATCH
        ? "warning.main"
        : "error.main";

/**
 * The job's money. A parent's client price is its own (or, if it's only on
 * the children, theirs added up) and its cost is the children's. A
 * standalone work order uses its own numbers. A child shows its own vendor
 * cost and no margin — the client price lives on the parent.
 */
export function jobTotals({ services = [], linked }) {
  const ownClient = sumPrices(services, "client_price");
  const ownVendor = sumPrices(services, "vendor_price");

  if (linked?.isChild) {
    return { client: null, vendor: ownVendor, margin: null };
  }
  if (linked?.isParent) {
    const family = linked.family ?? [];
    const vendor =
      family.reduce((t, c) => t + (Number(c.vendor_total) || 0), 0) || null;
    const client = ownClient ?? linked.clientTotal ?? null;
    return { client, vendor, margin: marginPercent(client, vendor) };
  }
  return {
    client: ownClient,
    vendor: ownVendor,
    margin: marginPercent(ownClient, ownVendor),
  };
}

/** Children that still have work open (not Completed or Cancelled). */
export const openChildren = (family = []) =>
  family.filter((c) => !CHILD_FINISHED.includes(c.status));
