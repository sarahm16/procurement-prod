/**
 * Vendor assignment routes for sourcing.
 *
 *   POST /api/sourcing/assignments                  assign a vendor to many lines
 *   PUT  /api/sourcing/assignments/:id/primary      make a backup the primary
 *   GET  /api/sourcing/contract-sites/:id/vendors   every vendor on a line
 *
 * A contract site (site x service line) can have several live vendors: one
 * primary and any number of backups. The database enforces "at most one
 * primary" with UX_VendorContractSites_Primary, so every write below clears
 * the old primary BEFORE setting the new one, inside the same transaction.
 *
 * Register as before (it now adds all three routes):
 *   registerAssignRoute(router, prisma, serializeGridRow);
 */

import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { logActivity } from "../utils/logActivity.js";

const SITE_ENTITY_TYPE_ID = 2;
const MODES = ["skip", "add", "replace"];

const num = (v) => (v == null ? null : Number(v));

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

/**
 * Live (not closed) assignments on a contract site, in the same order as the
 * OUTER APPLY in vw_SourcingGrid — so [0] is the one the grid shows. Keep the
 * two in step.
 */
function liveAssignments(tx, contractSiteId) {
  return tx.vendorContractSites.findMany({
    where: {
      contract_site_id: contractSiteId,
      VendorSiteStatus: { category: { not: "closed" } },
    },
    orderBy: [{ is_primary: "desc" }, { created_at: "desc" }],
    include: { Vendor: { select: { id: true, company: true } } },
  });
}

/** Clear any primary on the site. Must run before setting a new one. */
function clearPrimary(tx, contractSiteId) {
  return tx.vendorContractSites.updateMany({
    where: { contract_site_id: contractSiteId, is_primary: true },
    data: { is_primary: false },
  });
}

const serializeVendorRow = (r) => ({
  ...r,
  vendor_lat: num(r.vendor_lat),
  vendor_lng: num(r.vendor_lng),
  vendor_price_total: num(r.vendor_price_total),
});

function sendError(res, error, label) {
  if (error instanceof PrismaClientKnownRequestError) {
    // P2002 here means two people changed the same site's primary at once
    // and the unique index stopped the second one.
    if (error.code === "P2002") {
      return res.status(409).json({
        error: "Conflict",
        message:
          "Someone else changed the vendors on this line at the same time. Refresh and try again.",
      });
    }
    console.error(`Prisma error ${label}:`, error);
    return res.status(400).json({
      error: "Database Error",
      code: error.code,
      message: error.message,
    });
  }
  console.error(`Error ${label}:`, error);
  return res
    .status(500)
    .json({ error: error.message ?? "Internal Server Error" });
}

export function registerAssignRoute(router, prisma, serializeGridRow) {
  // ── POST /api/sourcing/assignments ───────────────────────────────────────
  //
  // Body:
  //   { vendor_id, contract_site_ids: [1,2,3], mode, make_primary, user_id }
  //
  // A line with no live vendor always gets the new vendor as its primary.
  // `mode` decides what happens on lines that already have one:
  //   skip    (default) — leave the line alone and report it back
  //   add     — add the vendor as a backup. With make_primary: true it
  //             becomes the primary instead, and the old primary stays on
  //             as a backup.
  //   replace — close the current primary and make the new vendor primary.
  //             Backups are left alone.
  router.post("/assignments", async (req, res) => {
    const {
      vendor_id,
      contract_site_ids,
      mode = "skip",
      make_primary = false,
      user_id,
    } = req.body;

    if (
      !vendor_id ||
      !Array.isArray(contract_site_ids) ||
      contract_site_ids.length === 0
    ) {
      return res
        .status(400)
        .json({ error: "vendor_id and contract_site_ids are required" });
    }
    if (!MODES.includes(mode)) {
      return res
        .status(400)
        .json({ error: `mode must be one of: ${MODES.join(", ")}` });
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

          const out = { assigned: [], added: [], replaced: [], skipped: [] };
          const perSite = new Map(); // site_id -> [description]

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
            const live = await liveAssignments(tx, csId);
            const current = live[0] ?? null; // what the grid shows

            const mine = live.find((a) => a.vendor_id === vendorId);
            if (mine) {
              out.skipped.push({
                contract_site_id: csId,
                reason: mine.is_primary
                  ? "already the primary vendor"
                  : "already a backup vendor — use make primary instead",
              });
              continue;
            }

            if (current && mode === "skip") {
              out.skipped.push({
                contract_site_id: csId,
                reason: "already has a vendor",
                vendor: current.Vendor?.company ?? null,
              });
              continue;
            }

            const becomesPrimary =
              !current ||
              mode === "replace" ||
              (mode === "add" && make_primary);

            // Order matters: the unique index allows one primary at a time.
            if (current && mode === "replace") {
              await tx.vendorContractSites.update({
                where: { id: current.id },
                data: { status_id: closed.id, is_primary: false },
              });
            }
            if (becomesPrimary) await clearPrimary(tx, csId);

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

            const data = { status_id: sourcing.id, is_primary: becomesPrimary };
            const saved = prior
              ? await tx.vendorContractSites.update({
                  where: { id: prior.id },
                  data,
                })
              : await tx.vendorContractSites.create({
                  data: {
                    ...data,
                    vendor_id: vendorId,
                    contract_site_id: csId,
                  },
                });

            const entry = {
              contract_site_id: csId,
              assignment_id: saved.id,
              is_primary: becomesPrimary,
            };
            const was = current?.Vendor?.company ?? "vendor";
            let text;
            if (!current) {
              out.assigned.push(entry);
              text = line;
            } else if (mode === "replace") {
              out.replaced.push(entry);
              text = `${line} (replaced ${was})`;
            } else if (becomesPrimary) {
              out.added.push(entry);
              text = `${line} (primary; ${was} moved to backup)`;
            } else {
              out.added.push(entry);
              text = `${line} (backup)`;
            }

            const bucket = perSite.get(contractSite.site_id) ?? [];
            bucket.push(text);
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
      sendError(res, error, "creating assignments");
    }
  });

  // ── PUT /api/sourcing/assignments/:id/primary ────────────────────────────
  // Body: { user_id }
  // Makes this assignment the primary on its line. The old primary stays
  // assigned as a backup. Returns the grid row and the line's vendor list.
  router.put("/assignments/:id/primary", async (req, res) => {
    const assignmentId = Number(req.params.id);
    const { user_id } = req.body ?? {};
    if (!Number.isInteger(assignmentId)) {
      return res.status(400).json({ error: "Invalid assignment id" });
    }

    try {
      const assignment = await prisma.vendorContractSites.findUnique({
        where: { id: assignmentId },
        include: {
          VendorSiteStatus: { select: { category: true } },
          Vendor: { select: { company: true } },
          ContractSite: {
            select: {
              site_id: true,
              Contract: { select: { ServiceLine: { select: { name: true } } } },
            },
          },
        },
      });
      if (!assignment) {
        return res.status(404).json({ error: "Assignment not found" });
      }
      if (assignment.VendorSiteStatus?.category === "closed") {
        return res
          .status(400)
          .json({ error: "A closed assignment can't be made primary" });
      }

      const csId = assignment.contract_site_id;

      if (!assignment.is_primary) {
        await prisma.$transaction(async (tx) => {
          const previous = await tx.vendorContractSites.findFirst({
            where: { contract_site_id: csId, is_primary: true },
            include: { Vendor: { select: { company: true } } },
          });

          await clearPrimary(tx, csId);
          await tx.vendorContractSites.update({
            where: { id: assignmentId },
            data: { is_primary: true },
          });

          const line =
            assignment.ContractSite.Contract?.ServiceLine?.name ??
            "service line";
          await logActivity(tx, {
            entityTypeId: SITE_ENTITY_TYPE_ID,
            entityId: assignment.ContractSite.site_id,
            fieldChanged: "primary_vendor",
            previousValue: previous?.Vendor?.company ?? null,
            newValue: `${assignment.Vendor?.company ?? "Vendor"} — ${line}`,
            changedBy: user_id ?? null,
            action: "UPDATE",
          });
        });
      }

      const [rows, vendors] = await Promise.all([
        prisma.sourcingGrid.findMany({ where: { contract_site_id: csId } }),
        prisma.sourcingGridVendors.findMany({
          where: {
            contract_site_id: csId,
            assignment_status_category: { not: "closed" },
          },
          orderBy: [{ is_primary: "desc" }, { assigned_at: "desc" }],
        }),
      ]);

      res.json({
        rows: rows.map(serializeGridRow),
        vendors: vendors.map(serializeVendorRow),
      });
    } catch (error) {
      sendError(res, error, "setting primary vendor");
    }
  });

  // ── GET /api/sourcing/contract-sites/:id/vendors ─────────────────────────
  // Every live vendor on the line, primary first, each with its seven checks.
  // ?include_closed=1 adds past assignments too.
  router.get("/contract-sites/:id/vendors", async (req, res) => {
    const contractSiteId = Number(req.params.id);
    if (!Number.isInteger(contractSiteId)) {
      return res.status(400).json({ error: "Invalid contract site id" });
    }

    try {
      const includeClosed = ["1", "true"].includes(
        String(req.query.include_closed),
      );
      const vendors = await prisma.sourcingGridVendors.findMany({
        where: {
          contract_site_id: contractSiteId,
          ...(includeClosed
            ? {}
            : { assignment_status_category: { not: "closed" } }),
        },
        orderBy: [{ is_primary: "desc" }, { assigned_at: "desc" }],
      });
      res.json(vendors.map(serializeVendorRow));
    } catch (error) {
      sendError(res, error, "fetching contract site vendors");
    }
  });
}
