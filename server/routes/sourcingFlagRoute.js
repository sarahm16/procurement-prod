/**
 * DELETE /api/sourcing/contract-sites/:id/resourcing-flag   { user_id }
 *
 * Clear a line's "Resource now" flag by hand (someone's on it, or it was set
 * by mistake). It also clears by itself when a primary vendor is put back on
 * the line. The flag is set when a vendor is terminated from the line —
 * see services/sourcing/closeAssignments.js.
 *
 * Register on the sourcing router:
 *   registerResourcingFlagRoute(router, prisma, serializeGridRow);
 */
import { logActivity } from "../utils/logActivity.js";
import { clearResourcingFlag } from "../services/sourcing/closeAssignments.js";

const SITE_ENTITY_TYPE_ID = 2;

export function registerResourcingFlagRoute(router, prisma, serializeGridRow) {
  router.delete("/contract-sites/:id/resourcing-flag", async (req, res) => {
    const csId = Number(req.params.id);
    const { user_id } = req.body ?? {};
    if (!Number.isInteger(csId)) {
      return res.status(400).json({ error: "Invalid contract site id" });
    }
    try {
      const cs = await prisma.contractSites.findUnique({
        where: { id: csId },
        select: {
          site_id: true,
          resource_needed_at: true,
          resource_reason: true,
          Contract: { select: { ServiceLine: { select: { name: true } } } },
        },
      });
      if (!cs) return res.status(404).json({ error: "Service line not found" });

      if (cs.resource_needed_at) {
        await prisma.$transaction(async (tx) => {
          await clearResourcingFlag(tx, csId);
          await logActivity(tx, {
            entityTypeId: SITE_ENTITY_TYPE_ID,
            entityId: cs.site_id,
            fieldChanged: "resourcing_flag",
            previousValue: cs.resource_reason ?? "Needs resourcing",
            newValue: `Cleared the "Resource now" flag on ${cs.Contract?.ServiceLine?.name ?? "service line"}`,
            changedBy: user_id ?? null,
            action: "UPDATE",
          });
        });
      }

      const rows = await prisma.sourcingGrid.findMany({ where: { contract_site_id: csId } });
      res.json({ rows: rows.map(serializeGridRow) });
    } catch (error) {
      console.error("Error clearing resourcing flag:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });
}

export default registerResourcingFlagRoute;
