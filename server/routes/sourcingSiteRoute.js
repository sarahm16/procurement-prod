/**
 * GET /api/sourcing/sites/:siteId
 *
 * Every service line at one site, assigned or not, with the same seven checks
 * the sourcing grid shows — plus the full assignment history per line.
 *
 * Register on the sourcing router alongside the others:
 *
 *   import { registerSiteSourcingRoute } from "./sourcingSiteRoute.js";
 *   ...
 *   registerSiteSourcingRoute(router, prisma, serializeGridRow);
 *   registerPricingRoutes(router, prisma, serializeGridRow);
 *   return router;
 *
 * `serializeGridRow` is passed in for the same reason the pricing routes take
 * it: the site profile merges rows returned by assign / replace / pricing
 * straight into the ones this endpoint returned, so a second shape here would
 * silently corrupt the cards.
 *
 * Why not reuse GET /api/sourcing?site_id=… : that route defaults to
 * state="todo" and paginates. A site profile wants every line including the
 * finished ones, never paged, and it wants the history — different enough that
 * bending the list route would make both harder to read.
 */

import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

/**
 * The view carries the CURRENT assignment only (OUTER APPLY ... TOP 1). On the
 * sourcing queue that's right — you're chasing what's open. On a site profile
 * it isn't: "who did we have on snow last winter and why did they go away" is
 * exactly the question someone opens this tab to answer, and that history is
 * the reason assignments get a status instead of getting deleted.
 */
async function assignmentsByContractSite(prisma, contractSiteIds) {
  const rows = await prisma.vendorContractSites.findMany({
    where: { contract_site_id: { in: contractSiteIds } },
    include: {
      Vendor: { select: { id: true, company: true } },
      // If your relation field on VendorContractSites is named something other
      // than `Status` (VendorSiteStatus, etc.), rename it here — Prisma throws
      // on an unknown include rather than ignoring it.
      VendorSiteStatus: { select: { id: true, name: true, category: true } },
    },
    orderBy: [{ is_primary: "desc" }, { created_at: "desc" }],
  });

  const map = new Map();
  for (const a of rows) {
    if (!map.has(a.contract_site_id)) map.set(a.contract_site_id, []);
    map.get(a.contract_site_id).push({
      assignment_id: a.id,
      vendor_id: a.vendor_id,
      vendor: a.Vendor?.company ?? null,
      is_primary: a.is_primary,
      status_id: a.status_id,
      status: a.Status?.name ?? null,
      status_category: a.Status?.category ?? null,
      created_at: a.created_at,
    });
  }
  return map;
}

export function registerSiteSourcingRoute(router, prisma, serializeGridRow) {
  router.get("/sites/:siteId", async (req, res) => {
    const siteId = Number(req.params.siteId);
    if (!Number.isInteger(siteId)) {
      return res.status(400).json({ error: "Invalid site id" });
    }

    try {
      const rows = await prisma.sourcingGrid.findMany({
        where: { site_id: siteId },
        orderBy: [{ service_line: "asc" }],
      });

      // A site with no contract sites isn't an error — it just hasn't been set
      // up yet, and the tab has a perfectly good empty state for that.
      if (!rows.length) {
        return res.json({ site_id: siteId, rows: [], summary: emptySummary() });
      }

      const history = await assignmentsByContractSite(
        prisma,
        rows.map((r) => r.contract_site_id),
      );

      const serialized = rows.map((r) => {
        const base = serializeGridRow(r);
        const all = history.get(r.contract_site_id) ?? [];
        return {
          ...base,
          assignments: all,
          // Everything that isn't the one the view picked. Rendered collapsed,
          // so a line that's been re-sourced three times doesn't bury the
          // vendor who's actually working there now.
          prior_assignments: all.filter(
            (a) => a.assignment_id !== base.assignment_id,
          ),
        };
      });

      res.json({
        site_id: siteId,
        rows: serialized,
        summary: summarize(serialized),
      });
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        console.error("Prisma error fetching site sourcing:", error);
        res.status(400).json({
          error: "Database Error",
          code: error.code,
          message: error.message,
        });
      } else {
        console.error("Error fetching site sourcing:", error);
        res.status(500).json({ error: "Internal Server Error" });
      }
    }
  });
}

const emptySummary = () => ({
  service_lines: 0,
  assigned: 0,
  sourced: 0,
  client_price_total: 0,
  vendor_price_total: 0,
});

/**
 * Header numbers. Computed server-side so the tab shows the same totals
 * whether or not every card has been expanded.
 */
function summarize(rows) {
  return rows.reduce(
    (acc, r) => ({
      service_lines: acc.service_lines + 1,
      assigned: acc.assigned + (r.vendor_id ? 1 : 0),
      sourced: acc.sourced + (r.is_sourced ? 1 : 0),
      client_price_total: acc.client_price_total + (r.client_price_total ?? 0),
      vendor_price_total: acc.vendor_price_total + (r.vendor_price_total ?? 0),
    }),
    emptySummary(),
  );
}

export default registerSiteSourcingRoute;
