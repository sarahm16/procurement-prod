/**
 * POST /api/sourcing/assignments/:id/replace
 *
 * Swap the vendor on one assignment. The outgoing assignment is closed,
 * never deleted — its pricing and exhibits stay attached to it, which is the
 * whole reason VendorServicePricing hangs off the assignment rather than the
 * vendor.
 *
 * The incoming vendor takes the outgoing one's place: replace the primary and
 * the new vendor becomes primary; replace a backup and it becomes a backup.
 * Other vendors on the line are left alone.
 *
 * If the incoming vendor is already a live backup on this line, that
 * assignment is kept as-is (status, pricing, exhibits) and simply moves into
 * the outgoing vendor's role.
 *
 * Register on the sourcing router:
 *   registerReplaceRoute(router, prisma, serializeGridRow);
 */

import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { logActivity } from "../utils/logActivity.js";

const SITE_ENTITY_TYPE_ID = 2;

/** Statuses are looked up by category so ids can differ between environments. */
async function statusByCategory(tx, category) {
  const s = await tx.vendorSiteStatuses.findFirst({
    where: { category },
    orderBy: { id: "asc" },
  });
  if (!s)
    throw new Error(
      `No VendorSiteStatuses row with category '${category}' — seed the table`,
    );
  return s;
}

export function registerReplaceRoute(router, prisma, serializeGridRow) {
  router.post("/assignments/:id/replace", async (req, res) => {
    const oldAssignmentId = Number(req.params.id);
    const { vendor_id, user_id } = req.body;

    if (!Number.isInteger(oldAssignmentId)) {
      return res.status(400).json({ error: "Invalid assignment id" });
    }
    if (!vendor_id) {
      return res.status(400).json({ error: "vendor_id is required" });
    }

    const vendorId = Number(vendor_id);

    try {
      const outgoing = await prisma.vendorContractSites.findUnique({
        where: { id: oldAssignmentId },
        include: {
          Vendor: { select: { id: true, company: true } },
          VendorSiteStatus: { select: { category: true } },
          ContractSite: {
            select: {
              id: true,
              site_id: true,
              Contract: { select: { ServiceLine: { select: { name: true } } } },
            },
          },
        },
      });

      if (!outgoing)
        return res.status(404).json({ error: "Assignment not found" });
      if (outgoing.VendorSiteStatus?.category === "closed") {
        return res
          .status(400)
          .json({ error: "That assignment is already closed" });
      }
      if (outgoing.vendor_id === vendorId) {
        return res.status(400).json({
          error: "That vendor is already assigned to this service line",
        });
      }

      const contractSiteId = outgoing.contract_site_id;
      const becomesPrimary = outgoing.is_primary;

      const incoming = await prisma.$transaction(async (tx) => {
        const closed = await statusByCategory(tx, "closed");
        const sourcing = await statusByCategory(tx, "sourcing");

        // 1. Close the outgoing assignment. This also clears its primary
        //    flag, which has to happen before step 2 sets the new one —
        //    UX_VendorContractSites_Primary allows one primary at a time.
        await tx.vendorContractSites.update({
          where: { id: oldAssignmentId },
          data: { status_id: closed.id, is_primary: false },
        });

        // 2. Find the incoming vendor's existing row on this line, if any.
        //    @@unique([vendor_id, contract_site_id]) means there's at most one.
        const prior = await tx.vendorContractSites.findUnique({
          where: {
            vendor_id_contract_site_id: {
              vendor_id: vendorId,
              contract_site_id: contractSiteId,
            },
          },
          include: { VendorSiteStatus: { select: { category: true } } },
        });

        // Belt and braces: make sure nothing else on the line is still
        // marked primary before we set one.
        if (becomesPrimary) {
          await tx.vendorContractSites.updateMany({
            where: { contract_site_id: contractSiteId, is_primary: true },
            data: { is_primary: false },
          });
        }

        const include = { Vendor: { select: { company: true } } };

        const priorIsLive =
          prior && prior.VendorSiteStatus?.category !== "closed";

        // - Already a live backup here: keep its status and progress, just
        //   move it into the outgoing vendor's role.
        // - A closed row from a previous season: reopen it.
        // - Otherwise: insert.
        const created = priorIsLive
          ? await tx.vendorContractSites.update({
              where: { id: prior.id },
              data: { is_primary: becomesPrimary },
              include,
            })
          : prior
            ? await tx.vendorContractSites.update({
                where: { id: prior.id },
                data: { status_id: sourcing.id, is_primary: becomesPrimary },
                include,
              })
            : await tx.vendorContractSites.create({
                data: {
                  vendor_id: vendorId,
                  contract_site_id: contractSiteId,
                  status_id: sourcing.id,
                  is_primary: becomesPrimary,
                },
                include,
              });

        const line =
          outgoing.ContractSite.Contract?.ServiceLine?.name ?? "service line";
        const role = becomesPrimary ? "primary" : "backup";
        await logActivity(tx, {
          entityTypeId: SITE_ENTITY_TYPE_ID,
          entityId: outgoing.ContractSite.site_id,
          fieldChanged: "vendor_assignment",
          previousValue: `${outgoing.Vendor?.company ?? "Vendor"} — ${line}`,
          newValue: `${created.Vendor?.company ?? "Vendor"} — ${line} (replaced, ${role})`,
          changedBy: user_id ?? null,
          action: "UPDATE",
        });

        return created;
      });

      const rows = await prisma.sourcingGrid.findMany({
        where: { contract_site_id: contractSiteId },
      });

      res.json({
        assignment_id: incoming.id,
        replaced_assignment_id: oldAssignmentId,
        is_primary: becomesPrimary,
        rows: rows.map(serializeGridRow),
      });
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === "P2002") {
          return res.status(409).json({
            error: "Conflict",
            message:
              "Someone else changed the vendors on this line at the same time. Refresh and try again.",
          });
        }
        console.error("Prisma error replacing vendor:", error);
        res.status(400).json({
          error: "Database Error",
          code: error.code,
          message: error.message,
        });
      } else {
        console.error("Error replacing vendor:", error);
        res
          .status(500)
          .json({ error: error.message ?? "Internal Server Error" });
      }
    }
  });
}
