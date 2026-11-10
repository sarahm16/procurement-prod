/**
 * PUT /api/sourcing/contract-sites/:id/self-perform   { self_perform, user_id }
 *
 * Mark a site's service line as self-performed (our own crews do it) or
 * subcontracted. Self-performed lines:
 *   - drop off the Sourcing page and out of "needs a vendor" in the reports
 *   - count under Planned Maintenance → Self-performed on the Reports page
 *   - can't be flagged "Resource now"; turning self-perform on clears the flag
 * Vendors already on the line stay on it (as backups, say) until someone
 * removes them.
 *
 * Returns { rows: [gridRow] } like the other sourcing writes, so the site's
 * Sourcing tab can merge it with onRowsChanged.
 *
 * Register on the sourcing router:
 *   registerSelfPerformRoute(router, prisma, serializeGridRow);
 */
import { logActivity } from "../utils/logActivity.js";
import { clearResourcingFlag } from "../services/sourcing/closeAssignments.js";

const SITE_ENTITY_TYPE_ID = 2;

export function registerSelfPerformRoute(router, prisma, serializeGridRow) {
  router.put("/contract-sites/:id/self-perform", async (req, res) => {
    const csId = Number(req.params.id);
    const { self_perform, user_id } = req.body ?? {};
    const userId = Number(user_id);

    if (!Number.isInteger(csId)) return res.status(400).json({ error: "Invalid contract site id" });
    if (typeof self_perform !== "boolean") return res.status(400).json({ error: "self_perform must be true or false" });
    // ActivityLog.changed_by is required.
    if (!Number.isInteger(userId) || userId <= 0) return res.status(400).json({ error: "user_id is required" });

    try {
      const cs = await prisma.contractSites.findUnique({
        where: { id: csId },
        select: {
          site_id: true,
          self_perform: true,
          resource_needed_at: true,
          Contract: { select: { ServiceLine: { select: { name: true } } } },
        },
      });
      if (!cs) return res.status(404).json({ error: "Service line not found" });

      if (cs.self_perform !== self_perform) {
        const line = cs.Contract?.ServiceLine?.name ?? "service line";
        await prisma.$transaction(async (tx) => {
          await tx.contractSites.update({
            where: { id: csId },
            data: {
              self_perform,
              self_perform_set_at: new Date(),
              self_perform_set_by: userId,
            },
          });
          if (self_perform && cs.resource_needed_at) await clearResourcingFlag(tx, csId);
          await logActivity(tx, {
            entityTypeId: SITE_ENTITY_TYPE_ID,
            entityId: cs.site_id,
            userId,
            action: self_perform
              ? `Marked ${line} as self-performed`
              : `Marked ${line} as subcontracted`,
          });
        });
      }

      const rows = await prisma.sourcingGrid.findMany({ where: { contract_site_id: csId } });
      res.json({ rows: rows.map(serializeGridRow) });
    } catch (error) {
      console.error("Error setting self-perform:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });
}

export default registerSelfPerformRoute;
