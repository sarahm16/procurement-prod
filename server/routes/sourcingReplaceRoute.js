/**
 * POST /api/sourcing/assignments/:id/replace
 *
 * Swap the vendor on one contract site. The outgoing assignment is closed,
 * never deleted — its pricing and exhibits stay attached to it, which is the
 * whole reason VendorServicePricing hangs off the assignment rather than the
 * vendor.
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

    try {
      const outgoing = await prisma.vendorContractSites.findUnique({
        where: { id: oldAssignmentId },
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

      if (!outgoing)
        return res.status(404).json({ error: "Assignment not found" });
      if (outgoing.vendor_id === Number(vendor_id)) {
        return res.status(400).json({
          error: "That vendor is already assigned to this service line",
        });
      }

      const contractSiteId = outgoing.contract_site_id;

      const incoming = await prisma.$transaction(async (tx) => {
        const closed = await statusByCategory(tx, "closed");
        const sourcing = await statusByCategory(tx, "sourcing");

        await tx.vendorContractSites.update({
          where: { id: oldAssignmentId },
          data: { status_id: closed.id, is_primary: false },
        });

        // The incoming vendor may already have a closed assignment here from a
        // previous season. @@unique([vendor_id, contract_site_id]) means we
        // reopen that row rather than inserting a duplicate.
        const prior = await tx.vendorContractSites.findUnique({
          where: {
            vendor_id_contract_site_id: {
              vendor_id: Number(vendor_id),
              contract_site_id: contractSiteId,
            },
          },
        });

        const created = prior
          ? await tx.vendorContractSites.update({
              where: { id: prior.id },
              data: { status_id: sourcing.id },
              include: { Vendor: { select: { company: true } } },
            })
          : await tx.vendorContractSites.create({
              data: {
                vendor_id: Number(vendor_id),
                contract_site_id: contractSiteId,
                status_id: sourcing.id,
              },
              include: { Vendor: { select: { company: true } } },
            });

        const line =
          outgoing.ContractSite.Contract?.ServiceLine?.name ?? "service line";
        await logActivity(tx, {
          entityTypeId: SITE_ENTITY_TYPE_ID,
          entityId: outgoing.ContractSite.site_id,
          fieldChanged: "vendor_assignment",
          previousValue: `${outgoing.Vendor?.company ?? "Vendor"} — ${line}`,
          newValue: `${created.Vendor?.company ?? "Vendor"} — ${line} (replaced)`,
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
        rows: rows.map(serializeGridRow),
      });
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
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
