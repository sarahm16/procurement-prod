// services/vendors/vendorListExtras.js
//
// What the vendor LIST needs beyond the vendor row itself, worked out for
// every vendor in a handful of queries (not one per vendor):
//
//   compliance   { W9, MSA, ACH: "complete" | "pending" | "missing",
//                  coi: "valid" | "expiring" | "expired" | "missing",
//                  coi_expiration: "YYYY-MM-DD" | null }
//   live_lines   how many site service lines they're on right now
//   service_lines  [names] of those lines' service lines
//   notices      { warnings, compliance, terminations } sent in the last year
//
//   const extras = await vendorListExtras(prisma);
//   extras.get(vendor.id) → { compliance, live_lines, service_lines, notices }
//
// Reads whole tables rather than `id in (...)`: the list returns every vendor
// anyway, and SQL Server caps a query at 2,100 parameters.

const DOC_TYPES = ["W9", "MSA", "ACH"];
const PENDING = ["sent", "viewed", "draft"];
export const COI_SOON_DAYS = 30;
const DAY = 86400000;

const ymd = (d) => (d ? new Date(d).toISOString().slice(0, 10) : null);

export async function vendorListExtras(prisma, now = new Date()) {
  const yearAgo = new Date(now.getTime() - 365 * DAY);

  const [docs, cois, live, notices] = await Promise.all([
    prisma.vendorComplianceDocuments.findMany({
      where: { document_type: { in: DOC_TYPES } },
      select: { vendor_id: true, document_type: true, status: true },
    }),
    prisma.vendorCOIs.findMany({
      select: { vendor_id: true, expiration_date: true },
    }),
    prisma.vendorContractSites.findMany({
      where: { VendorSiteStatus: { category: { not: "closed" } } },
      select: {
        vendor_id: true,
        ContractSite: { select: { Contract: { select: { ServiceLine: { select: { name: true } } } } } },
      },
    }),
    prisma.vendorWarnings.findMany({
      where: { date_sent: { gte: yearAgo }, status: { not: "voided" } },
      select: { vendor_id: true, notice_type: true },
    }),
  ]);

  const out = new Map();
  const get = (id) => {
    if (!out.has(id)) {
      out.set(id, {
        compliance: { W9: "missing", MSA: "missing", ACH: "missing", coi: "missing", coi_expiration: null },
        live_lines: 0,
        service_lines: [],
        notices: { warnings: 0, compliance: 0, terminations: 0 },
      });
    }
    return out.get(id);
  };

  // Documents: completed beats pending beats missing.
  for (const d of docs) {
    const c = get(d.vendor_id).compliance;
    const status = String(d.status ?? "").toLowerCase();
    if (status === "completed") c[d.document_type] = "complete";
    else if (PENDING.includes(status) && c[d.document_type] === "missing") c[d.document_type] = "pending";
  }

  // COI: the one that runs latest decides.
  const latest = new Map();
  for (const c of cois) {
    const prev = latest.get(c.vendor_id);
    if (!prev || new Date(c.expiration_date) > prev) latest.set(c.vendor_id, new Date(c.expiration_date));
  }
  for (const [vendorId, exp] of latest) {
    const c = get(vendorId).compliance;
    c.coi_expiration = ymd(exp);
    c.coi = exp < now ? "expired" : exp.getTime() - now.getTime() <= COI_SOON_DAYS * DAY ? "expiring" : "valid";
  }

  // Live lines and which service lines they cover.
  const lines = new Map();
  for (const a of live) {
    const v = get(a.vendor_id);
    v.live_lines += 1;
    const name = a.ContractSite?.Contract?.ServiceLine?.name;
    if (name) {
      if (!lines.has(a.vendor_id)) lines.set(a.vendor_id, new Set());
      lines.get(a.vendor_id).add(name);
    }
  }
  for (const [vendorId, set] of lines) get(vendorId).service_lines = [...set].sort();

  for (const n of notices) {
    const counts = get(n.vendor_id).notices;
    if (n.notice_type === "warning") counts.warnings += 1;
    else if (n.notice_type === "compliance") counts.compliance += 1;
    else if (n.notice_type === "termination") counts.terminations += 1;
  }

  return out;
}

/** Extras for a vendor with nothing on file. */
export const EMPTY_EXTRAS = {
  compliance: { W9: "missing", MSA: "missing", ACH: "missing", coi: "missing", coi_expiration: null },
  live_lines: 0,
  service_lines: [],
  notices: { warnings: 0, compliance: 0, terminations: 0 },
};
