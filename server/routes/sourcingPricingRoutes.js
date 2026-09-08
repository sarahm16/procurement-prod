/**
 * Pricing routes for the sourcing panel.
 *
 *   GET /api/sourcing/contract-sites/:id/services
 *   PUT /api/sourcing/assignments/:id/pricing
 *
 * Register both on the sourcing router:
 *
 *   import { registerPricingRoutes } from "./sourcingPricingRoutes.js";
 *   ...
 *   registerPricingRoutes(router, prisma, serializeGridRow);
 *   return router;
 *
 * serializeGridRow is passed in rather than imported so this file and
 * sourcingRouter.js don't import each other. Export it from sourcingRouter.js:
 *
 *   export const serializeGridRow = (r) => ({ ... });
 */

import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { logActivity } from "../utils/logActivity.js";

const SITE_ENTITY_TYPE_ID = 2;

const num = (v) => (v == null ? null : Number(v));

/**
 * Where the human-readable service name lives.
 *
 * I haven't seen ServiceLineServices, so this tries the likely shapes. If the
 * name is one hop further out (e.g. ServiceLineServices -> Services), add the
 * nested include below and read it here.
 */
const serviceName = (css) =>
  css.ServiceLineService?.name ??
  css.ServiceLineService?.service_name ??
  css.ServiceLineService?.Service?.name ??
  `Service ${css.service_line_service_id}`;

/**
 * The assignment whose rates we're showing. Mirrors the OUTER APPLY in
 * vw_SourcingGrid so the panel and the grid never disagree about which vendor
 * is current. Pass ?assignment_id= to pin a specific one.
 */
async function currentAssignment(prisma, contractSiteId, assignmentId) {
  if (assignmentId) {
    return prisma.vendorContractSites.findUnique({
      where: { id: Number(assignmentId) },
      include: { Vendor: { select: { id: true, company: true } } },
    });
  }
  return prisma.vendorContractSites.findFirst({
    where: {
      contract_site_id: contractSiteId,
      VendorSiteStatus: { category: { not: "closed" } },
    },
    orderBy: [{ is_primary: "desc" }, { created_at: "desc" }],
    include: { Vendor: { select: { id: true, company: true } } },
  });
}

export function registerPricingRoutes(router, prisma, serializeGridRow) {
  // ── GET /api/sourcing/contract-sites/:id/services ────────────────────────
  // Every service on the contract site, with the client price and whatever
  // the current vendor is being paid. Rows come back even with no assignment,
  // so the panel can show the scope before anyone is picked.
  router.get("/contract-sites/:id/services", async (req, res) => {
    const contractSiteId = Number(req.params.id);
    if (!Number.isInteger(contractSiteId)) {
      return res.status(400).json({ error: "Invalid contract site id" });
    }

    try {
      const contractSite = await prisma.contractSites.findUnique({
        where: { id: contractSiteId },
        select: { id: true, site_id: true },
      });
      if (!contractSite) {
        return res.status(404).json({ error: "Contract site not found" });
      }

      const [services, assignment] = await Promise.all([
        prisma.contractSiteServices.findMany({
          where: { contract_site_id: contractSiteId },
          include: { ServiceLineService: true },
          orderBy: { id: "asc" },
        }),
        currentAssignment(prisma, contractSiteId, req.query.assignment_id),
      ]);

      const priced = assignment
        ? await prisma.vendorServicePricing.findMany({
            where: { vendor_contract_site_id: assignment.id },
            select: {
              id: true,
              contract_site_service_id: true,
              vendor_price: true,
            },
          })
        : [];

      const byService = new Map(
        priced.map((p) => [p.contract_site_service_id, p]),
      );

      res.json(
        services.map((css) => {
          const p = byService.get(css.id);
          return {
            id: css.id,
            name: serviceName(css),
            client_price: num(css.client_price),
            vendor_price: num(p?.vendor_price),
            vendor_service_pricing_id: p?.id ?? null,
            assignment_id: assignment?.id ?? null,
            vendor_id: assignment?.Vendor?.id ?? null,
          };
        }),
      );
    } catch (error) {
      console.error("Error fetching contract site services:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // ── PUT /api/sourcing/assignments/:id/pricing ────────────────────────────
  // Body: { prices: [{ contract_site_service_id, vendor_price }], user_id }
  // A null vendor_price clears that rate. Returns the affected grid rows so
  // the client can patch state without recomputing the seven checks.
  router.put("/assignments/:id/pricing", async (req, res) => {
    const assignmentId = Number(req.params.id);
    const { prices, user_id } = req.body;

    if (!Number.isInteger(assignmentId)) {
      return res.status(400).json({ error: "Invalid assignment id" });
    }
    if (!Array.isArray(prices) || prices.length === 0) {
      return res
        .status(400)
        .json({ error: "prices must be a non-empty array" });
    }

    try {
      const assignment = await prisma.vendorContractSites.findUnique({
        where: { id: assignmentId },
        include: {
          Vendor: { select: { id: true, company: true } },
          ContractSite: {
            select: {
              id: true,
              site_id: true,
              Contract: { select: { ServiceLine: { select: { name: true } } } },
            },
          },
        },
      });
      if (!assignment) {
        return res.status(404).json({ error: "Assignment not found" });
      }

      // Nothing in the schema stops a price row pointing at a service on a
      // different contract site than the assignment, so check it here.
      const ids = prices.map((p) => Number(p.contract_site_service_id));
      const valid = await prisma.contractSiteServices.findMany({
        where: {
          id: { in: ids },
          contract_site_id: assignment.contract_site_id,
        },
        select: { id: true },
      });
      const validIds = new Set(valid.map((v) => v.id));
      const stray = ids.filter((id) => !validIds.has(id));
      if (stray.length) {
        return res.status(400).json({
          error:
            "Some services don't belong to this assignment's contract site",
          contract_site_service_ids: stray,
        });
      }

      await prisma.$transaction(async (tx) => {
        for (const p of prices) {
          const cssId = Number(p.contract_site_service_id);
          const price =
            p.vendor_price === null || p.vendor_price === ""
              ? null
              : Number(p.vendor_price);

          if (price === null || isNaN(price)) {
            await tx.vendorServicePricing.deleteMany({
              where: {
                vendor_contract_site_id: assignmentId,
                contract_site_service_id: cssId,
              },
            });
            continue;
          }

          await tx.vendorServicePricing.upsert({
            where: {
              // from @@unique([vendor_contract_site_id, contract_site_service_id])
              vendor_contract_site_id_contract_site_service_id: {
                vendor_contract_site_id: assignmentId,
                contract_site_service_id: cssId,
              },
            },
            create: {
              vendor_contract_site_id: assignmentId,
              contract_site_service_id: cssId,
              vendor_price: price,
            },
            update: { vendor_price: price },
          });
        }

        await logActivity(tx, {
          entityTypeId: SITE_ENTITY_TYPE_ID,
          entityId: assignment.ContractSite.site_id,
          fieldChanged: "vendor_pricing",
          previousValue: null,
          newValue: `${assignment.Vendor?.company ?? "Vendor"} — ${assignment.ContractSite.Contract?.ServiceLine?.name ?? "service line"}: ${prices.length} rate(s) updated`,
          changedBy: user_id ?? null,
          action: "UPDATE",
        });
      });

      // Re-read from the view and serialize with the SAME function the grid
      // endpoint uses — the client merges these straight into its rows, so a
      // different shape here would silently corrupt the table.
      const rows = await prisma.sourcingGrid.findMany({
        where: { contract_site_id: assignment.contract_site_id },
      });

      res.json({ rows: rows.map(serializeGridRow) });
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        console.error("Prisma error saving pricing:", error);
        res.status(400).json({
          error: "Database Error",
          code: error.code,
          message: error.message,
        });
      } else {
        console.error("Error saving pricing:", error);
        res.status(500).json({ error: "Internal Server Error" });
      }
    }
  });
}
