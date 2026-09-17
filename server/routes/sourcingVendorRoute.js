/**
 * GET /api/sourcing/vendors/:vendorId
 *
 * Every site/service line this vendor is assigned to — the mirror of
 * /api/sourcing/sites/:siteId, read off the same view so the two tabs can
 * never disagree about a vendor's compliance.
 *
 * Query:
 *   ?include_past=true   also return assignments this vendor no longer holds
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
 * Same three-state COI logic as sourcingRouter.serializeGridRow.
 *
 * Duplicated rather than imported because this route serializes a different
 * shape (assignment-first, not contract-site-first) and importing the whole
 * serializer would drag in fields that are actively misleading here. If you
 * change the COI rule, change it in both places — or hoist this one function
 * into a shared module, which is what I'd do the second time it moves.
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
      // Start from the assignments, not the view: the view only carries the
      // CURRENT vendor per contract site, so starting there would silently
      // drop every line this vendor used to hold.
      const assignments = await prisma.vendorContractSites.findMany({
        where: { vendor_id: vendorId },
        include: {
          // Rename if your relation field isn't `Status`.
          VendorSiteStatus: {
            select: { id: true, name: true, category: true },
          },
        },
        orderBy: [{ created_at: "desc" }],
      });

      if (!assignments.length) {
        return res.json({
          vendor_id: vendorId,
          rows: [],
          compliance: null,
          summary: emptySummary(),
        });
      }

      const gridRows = await gridRowsFor(prisma, [
        ...new Set(assignments.map((a) => a.contract_site_id)),
      ]);
      const byContractSite = new Map(
        gridRows.map((r) => [r.contract_site_id, r]),
      );

      const rows = [];
      for (const a of assignments) {
        const g = byContractSite.get(a.contract_site_id);
        if (!g) continue; // contract site no longer in the view (contract ended)

        const isCurrent = g.assignment_id === a.id;
        if (!isCurrent && !includePast) continue;

        rows.push({
          assignment_id: a.id,
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

          is_current: isCurrent,
          is_primary: a.is_primary,
          status: a.Status?.name ?? null,
          status_category: a.Status?.category ?? null,
          created_at: a.created_at,

          // The site-level checks in the view are computed for whoever holds
          // the line NOW. Showing them against a replaced vendor would credit
          // one vendor with another's signed exhibit, so they're nulled and
          // the UI renders a dash. Same reasoning for the money.
          checks: isCurrent
            ? {
                rates: g.has_rates,
                sent: g.exhibit_sent,
                signed: g.exhibit_signed,
              }
            : { rates: null, sent: null, signed: null },

          service_count: isCurrent ? g.service_count : null,
          priced_count: isCurrent ? g.priced_count : null,
          vendor_price_total: isCurrent ? num(g.vendor_price_total) : null,
          client_price_total: isCurrent ? num(g.client_price_total) : null,
          is_sourced: isCurrent ? g.is_sourced : null,
          completed_steps: isCurrent ? g.completed_steps : null,

          // Who has the line instead — the single most useful thing to show on
          // a row that says "you used to work here".
          current_vendor: isCurrent ? null : (g.company ?? null),
          current_vendor_id: isCurrent ? null : (g.vendor_id ?? null),
        });
      }

      res.json({
        vendor_id: vendorId,
        rows,
        // W-9 / COI / MSA / ACH are properties of the vendor, identical on
        // every row, so they're lifted out of the table and sent once. Derived
        // from a view row rather than re-queried, which is what guarantees the
        // header strip and the sourcing grid always say the same thing.
        compliance: vendorCompliance(gridRows, vendorId),
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

/**
 * Returns null when this vendor holds no current line anywhere — the view
 * carries a vendor's documents only on rows where they're the active vendor.
 * The tab treats null as "look at the Compliance tab" rather than inventing
 * four empty circles, which would read as "nothing on file".
 */
function vendorCompliance(gridRows, vendorId) {
  const r = gridRows.find((g) => g.vendor_id === vendorId);
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
  sites: 0,
  clients: 0,
  sourced: 0,
  vendor_price_total: 0,
  client_price_total: 0,
});

function summarize(rows) {
  const current = rows.filter((r) => r.is_current);
  return {
    assignments: rows.length,
    current: current.length,
    sites: new Set(current.map((r) => r.site_id)).size,
    clients: new Set(current.map((r) => r.client_id).filter((v) => v != null))
      .size,
    sourced: current.filter((r) => r.is_sourced).length,
    vendor_price_total: current.reduce(
      (a, r) => a + (r.vendor_price_total ?? 0),
      0,
    ),
    client_price_total: current.reduce(
      (a, r) => a + (r.client_price_total ?? 0),
      0,
    ),
  };
}

export default registerVendorSitesRoute;
