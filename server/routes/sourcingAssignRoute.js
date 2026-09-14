/**
 * POST /api/sourcing/assignments
 *
 * Assign one vendor to any number of contract sites in a single transaction.
 * Backs three flows: the panel's multi-line assign, the grid's inline cell
 * edit, and the bulk bar.
 *
 * Body:
 *   { vendor_id, contract_site_ids: [1,2,3], mode: "skip" | "replace", user_id }
 *
 * `mode` decides what happens to lines that already have a live vendor:
 *   skip     (default) — leave them alone and report them back
 *   replace  — close the incumbent assignment and open one for the new vendor
 *
 * Replaces the inline POST /assignments handler in sourcing.js — delete that
 * one and register this instead:
 *   registerAssignRoute(router, prisma, serializeGridRow);
 */

import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { logActivity } from "../utils/logActivity.js";

const SITE_ENTITY_TYPE_ID = 2;

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

/** Matches the OUTER APPLY in vw_SourcingGrid. Keep the two in step. */
function currentAssignment(tx, contractSiteId) {
  return tx.vendorContractSites.findFirst({
    where: {
      contract_site_id: contractSiteId,
      VendorSiteStatus: { category: { not: "closed" } },
    },
    orderBy: [{ is_primary: "desc" }, { created_at: "desc" }],
    include: { Vendor: { select: { id: true, company: true } } },
  });
}

export function registerAssignRoute(router, prisma, serializeGridRow) {
  router.post("/assignments", async (req, res) => {
    const { vendor_id, contract_site_ids, mode = "skip", user_id } = req.body;

    if (
      !vendor_id ||
      !Array.isArray(contract_site_ids) ||
      contract_site_ids.length === 0
    ) {
      return res
        .status(400)
        .json({ error: "vendor_id and contract_site_ids are required" });
    }
    if (contract_site_ids.length > 200) {
      return res
        .status(400)
        .json({ error: "Too many contract sites in one request (max 200)" });
    }

    const ids = [...new Set(contract_site_ids.map(Number))].filter(
      Number.isInteger,
    );
    const vendorId = Number(vendor_id);

    try {
      const summary = await prisma.$transaction(
        async (tx) => {
          const sourcing = await statusByCategory(tx, "sourcing");
          const closed =
            mode === "replace" ? await statusByCategory(tx, "closed") : null;

          const vendor = await tx.vendors.findUnique({
            where: { id: vendorId },
            select: { id: true, company: true },
          });
          if (!vendor) throw new Error("Vendor not found");

          const out = { assigned: [], replaced: [], skipped: [] };
          const perSite = new Map(); // site_id -> [{ line, action }]

          for (const csId of ids) {
            const contractSite = await tx.contractSites.findUnique({
              where: { id: csId },
              select: {
                id: true,
                site_id: true,
                Contract: {
                  select: { ServiceLine: { select: { name: true } } },
                },
              },
            });
            if (!contractSite) continue;

            const line =
              contractSite.Contract?.ServiceLine?.name ?? "service line";
            const incumbent = await currentAssignment(tx, csId);

            if (incumbent?.vendor_id === vendorId) {
              out.skipped.push({
                contract_site_id: csId,
                reason: "already assigned to this vendor",
              });
              continue;
            }

            if (incumbent && mode !== "replace") {
              out.skipped.push({
                contract_site_id: csId,
                reason: "already has a vendor",
                vendor: incumbent.Vendor?.company ?? null,
              });
              continue;
            }

            if (incumbent && mode === "replace") {
              await tx.vendorContractSites.update({
                where: { id: incumbent.id },
                data: { status_id: closed.id, is_primary: false },
              });
            }

            // The vendor may already have a closed assignment here from a
            // previous season — @@unique([vendor_id, contract_site_id]) means
            // we reopen that row rather than inserting a duplicate.
            const prior = await tx.vendorContractSites.findUnique({
              where: {
                vendor_id_contract_site_id: {
                  vendor_id: vendorId,
                  contract_site_id: csId,
                },
              },
            });

            const saved = prior
              ? await tx.vendorContractSites.update({
                  where: { id: prior.id },
                  data: { status_id: sourcing.id },
                })
              : await tx.vendorContractSites.create({
                  data: {
                    vendor_id: vendorId,
                    contract_site_id: csId,
                    status_id: sourcing.id,
                  },
                });

            (incumbent ? out.replaced : out.assigned).push({
              contract_site_id: csId,
              assignment_id: saved.id,
            });

            const bucket = perSite.get(contractSite.site_id) ?? [];
            bucket.push(
              incumbent
                ? `${line} (replaced ${incumbent.Vendor?.company ?? "vendor"})`
                : line,
            );
            perSite.set(contractSite.site_id, bucket);
          }

          // One activity entry per site rather than per row, so a 40-row bulk
          // assign doesn't bury the feed.
          for (const [siteId, lines] of perSite) {
            const text = `${vendor.company} → ${lines.join(", ")}`;
            await logActivity(tx, {
              entityTypeId: SITE_ENTITY_TYPE_ID,
              entityId: siteId,
              fieldChanged: "vendor_assignment",
              previousValue: null,
              newValue: text.length > 255 ? text.slice(0, 252) + "…" : text,
              changedBy: user_id ?? null,
              action: "CREATE",
            });
          }

          return out;
        },
        { timeout: 30000 }, // a 200-row bulk assign needs more than the 5s default
      );

      const rows = await prisma.sourcingGrid.findMany({
        where: { contract_site_id: { in: ids } },
      });

      res.status(201).json({ summary, rows: rows.map(serializeGridRow) });
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        console.error("Prisma error creating assignments:", error);
        res
          .status(400)
          .json({
            error: "Database Error",
            code: error.code,
            message: error.message,
          });
      } else {
        console.error("Error creating assignments:", error);
        res
          .status(500)
          .json({ error: error.message ?? "Internal Server Error" });
      }
    }
  });
}
