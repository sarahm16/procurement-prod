/**
 * GET /api/sourcing/vendors/:vendorId
 *
 * Every site/service line this vendor is assigned to — the mirror of
 * /api/sourcing/sites/:siteId. Checks come from vw_SourcingGridVendors, which
 * computes them per assignment, so a backup vendor's row shows the backup's
 * own pricing and exhibits, never the primary's.
 *
 * Query:
 *   ?include_past=true   also return assignments this vendor no longer holds
 *
 * Each row has a `role`:
 *   primary — this vendor is the primary on the line
 *   backup  — live on the line, but someone else is primary
 *   past    — the assignment is closed
 *
 * Register on the sourcing router:
 *
 *   import { registerVendorSitesRoute } from "./sourcingVendorRoute.js";
 *   ...
 *   registerVendorSitesRoute(router, prisma);
 */

import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

const num = (v) => (v == null ? null : Number(v));
const trim = (v) => (typeof v === "string" ? v.trim() : v);

const DAY = 86400000;
const SOON_DAYS = 30;

/**
 * Same three-state COI logic as sourcing.js serializeGridRow.
 *
 * Duplicated rather than imported because this route serializes a different
 * shape (assignment-first, not contract-site-first). If you change the COI
 * rule, change it in both places — or hoist this one function into a shared
 * module, which is what I'd do the second time it moves.
 */
const coiState = (r) => {
  if (!r.vendor_id) return null;
  if (!r.coi_expiration) return false;
  const exp = new Date(r.coi_expiration).getTime();
  if (exp <= Date.now()) return "warn";
  if (!r.has_coi) return "warn";
  return exp - Date.now() <= SOON_DAYS * DAY ? "warn" : true;
};

/**
 * SQL Server caps a statement at 2100 parameters, and Prisma expands `in` to
 * one parameter per element. A vendor with 2000+ assignments is unlikely but
 * the failure mode is a hard 500 on the biggest, most important vendors, so
 * the query is chunked.
 */
async function gridRowsFor(prisma, contractSiteIds) {
  const CHUNK = 1000;
  const out = [];
  for (let i = 0; i < contractSiteIds.length; i += CHUNK) {
    const slice = contractSiteIds.slice(i, i + CHUNK);
    const rows = await prisma.sourcingGrid.findMany({
      where: { contract_site_id: { in: slice } },
    });
    out.push(...rows);
  }
  return out;
}

export function registerVendorSitesRoute(router, prisma) {
  router.get("/vendors/:vendorId", async (req, res) => {
    const vendorId = Number(req.params.vendorId);
    if (!Number.isInteger(vendorId)) {
      return res.status(400).json({ error: "Invalid vendor id" });
    }

    const includePast = String(req.query.include_past) === "true";

    try {
      // Every assignment this vendor has, with its own seven checks.
      // Unfiltered on purpose: compliance below needs a row even when the
      // vendor only has past assignments.
      const assignments = await prisma.sourcingGridVendors.findMany({
        where: { vendor_id: vendorId },
        orderBy: [{ assigned_at: "desc" }],
      });

      if (!assignments.length) {
        return res.json({
          vendor_id: vendorId,
          rows: [],
          compliance: null,
          summary: emptySummary(),
        });
      }

      // Site, client and line details, plus who the grid shows on each line.
      // Status names are a tiny lookup table, so read it whole.
      const [gridRows, statuses] = await Promise.all([
        gridRowsFor(prisma, [
          ...new Set(assignments.map((a) => a.contract_site_id)),
        ]),
        prisma.vendorSiteStatuses.findMany({
          select: { id: true, name: true },
        }),
      ]);
      const statusName = new Map(statuses.map((s) => [s.id, s.name]));
      const byContractSite = new Map(
        gridRows.map((r) => [r.contract_site_id, r]),
      );

      const rows = [];
      for (const a of assignments) {
        const g = byContractSite.get(a.contract_site_id);
        if (!g) continue; // contract site no longer in the view (contract ended)

        const isLive = a.assignment_status_category !== "closed";
        if (!isLive && !includePast) continue;

        const role = !isLive ? "past" : a.is_primary ? "primary" : "backup";
        // The vendor the grid shows on this line, if it isn't this one.
        const other =
          g.assignment_id !== a.assignment_id && g.vendor_id != null
            ? { name: g.company ?? null, id: g.vendor_id }
            : null;

        rows.push({
          assignment_id: a.assignment_id,
          contract_site_id: a.contract_site_id,
          site_id: g.site_id,
          site: g.store,
          city: [trim(g.mailing_city), trim(g.mailing_state)]
            .filter(Boolean)
            .join(", "),
          client_id: g.client_id,
          client: g.client,
          service_line_id: g.service_line_id,
          service_line: g.service_line,

          role,
          is_current: isLive, // primary or backup — still working the line
          is_primary: a.is_primary,
          status: statusName.get(a.assignment_status_id) ?? null,
          status_id: a.assignment_status_id,
          status_category: a.assignment_status_category,
          created_at: a.assigned_at,

          // Past rows show dashes: the line has moved on, and a closed
          // assignment's progress isn't something anyone is chasing.
          checks: isLive
            ? {
                rates: a.has_rates,
                sent: a.exhibit_sent,
                signed: a.exhibit_signed,
              }
            : { rates: null, sent: null, signed: null },

          service_count: isLive ? a.service_count : null,
          priced_count: isLive ? a.priced_count : null,
          vendor_price_total: isLive ? num(a.vendor_price_total) : null,
          client_price_total: isLive ? num(g.client_price_total) : null,
          is_sourced: isLive ? a.is_sourced : null,
          completed_steps: isLive ? a.completed_steps : null,

          // backup → who the primary is ("backup to X")
          // past   → who holds the line now ("you used to work here")
          primary_vendor: role === "backup" ? (other?.name ?? null) : null,
          primary_vendor_id: role === "backup" ? (other?.id ?? null) : null,
          current_vendor: role === "past" ? (other?.name ?? null) : null,
          current_vendor_id: role === "past" ? (other?.id ?? null) : null,
        });
      }

      res.json({
        vendor_id: vendorId,
        rows,
        // W-9 / COI / MSA / ACH are properties of the vendor, identical on
        // every assignment row, so they're lifted out and sent once.
        compliance: vendorCompliance(assignments[0]),
        summary: summarize(rows),
      });
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        console.error("Prisma error fetching vendor sites:", error);
        res.status(400).json({
          error: "Database Error",
          code: error.code,
          message: error.message,
        });
      } else {
        console.error("Error fetching vendor sites:", error);
        res.status(500).json({ error: "Internal Server Error" });
      }
    }
  });
}

/** Any of the vendor's assignment rows carries the vendor-level documents. */
function vendorCompliance(r) {
  if (!r) return null;
  return {
    w9: r.has_w9,
    coi: coiState(r),
    msa: r.has_msa,
    ach: r.has_ach,
    coi_expiration: r.coi_expiration,
  };
}

const emptySummary = () => ({
  assignments: 0,
  current: 0,
  primary: 0,
  backup: 0,
  sites: 0,
  clients: 0,
  sourced: 0,
  vendor_price_total: 0,
  client_price_total: 0,
});

function summarize(rows) {
  const current = rows.filter((r) => r.is_current);
  // Money counts primary lines only: a backup isn't being paid for the line.
  const primary = current.filter((r) => r.role === "primary");
  return {
    assignments: rows.length,
    current: current.length,
    primary: primary.length,
    backup: current.length - primary.length,
    sites: new Set(current.map((r) => r.site_id)).size,
    clients: new Set(current.map((r) => r.client_id).filter((v) => v != null))
      .size,
    sourced: current.filter((r) => r.is_sourced).length,
    vendor_price_total: primary.reduce(
      (a, r) => a + (r.vendor_price_total ?? 0),
      0,
    ),
    client_price_total: primary.reduce(
      (a, r) => a + (r.client_price_total ?? 0),
      0,
    ),
  };
}

export default registerVendorSitesRoute;
