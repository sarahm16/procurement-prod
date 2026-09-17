/**
 * GET /api/sourcing/vendors/:vendorId/workorders
 *
 * Every work order this vendor is on, with the parent it rolls up to.
 *
 * Register next to the vendor sites route:
 *
 *   import { registerVendorWorkOrdersRoute } from "./vendorWorkOrdersRoute.js";
 *   ...
 *   registerVendorWorkOrdersRoute(router, prisma);
 *
 * (If you'd rather this hang off the vendors router as
 * /api/vendors/:id/workorders, only the path string changes — but remember it
 * has to be registered ABOVE the vendors router's `/:id`.)
 *
 * Why this isn't just GET /api/workorders?vendor_id= :
 *
 * The list page derives a work order's parent from having the WHOLE set in
 * memory. Filter to one vendor and the parents mostly aren't there — a parent
 * carries the client price and no vendor, so it's precisely the row that gets
 * excluded. The parent numbers have to be fetched on purpose, which is the one
 * thing the generic list endpoint can't do for us.
 */

import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

/**
 * Which statuses mean "done".
 *
 * Adjust to your WorkOrderStatuses vocabulary. It lives here rather than being
 * inferred so that adding a status doesn't silently change what "open" means
 * on a vendor's profile — a number someone might quote in a vendor meeting.
 * If WorkOrderStatuses grows a `category` column, resolve by that instead;
 * that's the same trade we made for VendorSiteStatuses.
 */
const CLOSED_STATUSES = new Set([
  "Complete",
  "Completed",
  "Closed",
  "Cancelled",
  "Canceled",
  "Invoiced",
  "Paid",
]);

const num = (v) => (v == null ? null : Number(v));

const sumServices = (wo, field) =>
  (wo.Services ?? []).reduce((total, s) => total + (Number(s[field]) || 0), 0);

/**
 * Parent work order numbers, fetched by id rather than through a relation
 * include — one less thing that has to match your schema's relation naming,
 * and it's a single extra query however many rows come back.
 */
async function parentNumbers(prisma, ids) {
  if (!ids.length) return new Map();
  const CHUNK = 1000; // SQL Server's 2100-parameter ceiling
  const out = new Map();
  for (let i = 0; i < ids.length; i += CHUNK) {
    const rows = await prisma.workOrders.findMany({
      where: { id: { in: ids.slice(i, i + CHUNK) } },
      select: { id: true, work_order_number: true },
    });
    for (const r of rows) out.set(r.id, r.work_order_number);
  }
  return out;
}

export function registerVendorWorkOrdersRoute(router, prisma) {
  router.get("/vendors/:vendorId/workorders", async (req, res) => {
    const vendorId = Number(req.params.vendorId);
    if (!Number.isInteger(vendorId)) {
      return res.status(400).json({ error: "Invalid vendor id" });
    }

    try {
      const workorders = await prisma.workOrders.findMany({
        where: { vendor_id: vendorId },
        include: {
          Site: {
            select: {
              id: true,
              store: true,
              mailing_city: true,
              mailing_state: true,
              Client: { select: { id: true, client: true } },
            },
          },
          Status: { select: { id: true, name: true } },
          Services: { select: { client_price: true, vendor_price: true } },
        },
        orderBy: [{ due_date: "desc" }, { id: "desc" }],
      });

      const parents = await parentNumbers(prisma, [
        ...new Set(
          workorders.map((w) => w.parent_work_order_id).filter(Boolean),
        ),
      ]);

      const rows = workorders.map((w) => {
        const statusName = w.Status?.name ?? null;
        return {
          id: w.id,
          work_order_number: w.work_order_number,

          parent_work_order_id: w.parent_work_order_id ?? null,
          // Null when the parent was deleted or lives outside what we can see —
          // the UI renders a dash rather than a broken link.
          parent_work_order_number: w.parent_work_order_id
            ? (parents.get(w.parent_work_order_id) ?? null)
            : null,

          site_id: w.site_id,
          site: w.Site?.store ?? null,
          city: [w.Site?.mailing_city?.trim(), w.Site?.mailing_state?.trim()]
            .filter(Boolean)
            .join(", "),
          client_id: w.Site?.Client?.id ?? null,
          client: w.Site?.Client?.client ?? null,

          type: w.type ?? null,
          priority: w.priority ?? null,
          status: statusName,
          is_open: statusName ? !CLOSED_STATUSES.has(statusName) : true,

          external_id: w.external_id ?? null,
          scope_of_work: w.scope_of_work ?? null,

          start_date: w.start_date,
          due_date: w.due_date,
          date_completed: w.date_completed ?? null,
          created_at: w.created_at,

          // Summed here rather than in the browser so the header totals and
          // the grid can't drift apart the way they would if one added up
          // serialized strings and the other Decimals.
          vendor_total: sumServices(w, "vendor_price") || null,
          client_total: sumServices(w, "client_price") || null,
          service_count: w.Services?.length ?? 0,
        };
      });

      res.json({ vendor_id: vendorId, rows, summary: summarize(rows) });
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        console.error("Prisma error fetching vendor work orders:", error);
        res
          .status(400)
          .json({
            error: "Database Error",
            code: error.code,
            message: error.message,
          });
      } else {
        console.error("Error fetching vendor work orders:", error);
        res.status(500).json({ error: "Internal Server Error" });
      }
    }
  });
}

function summarize(rows) {
  const jan1 = new Date(new Date().getFullYear(), 0, 1);

  // Completion date if we have one, otherwise the due date — a closed work
  // order with neither doesn't get counted into a year it can't be placed in.
  const closedIn = (r) => {
    const d = r.date_completed ?? r.due_date;
    return d ? new Date(d) : null;
  };

  return {
    total: rows.length,
    open: rows.filter((r) => r.is_open).length,
    completed_ytd: rows.filter((r) => {
      if (r.is_open) return false;
      const d = closedIn(r);
      return d && d >= jan1;
    }).length,
    vendor_value: rows.reduce((a, r) => a + (r.vendor_total ?? 0), 0),
    vendor_value_ytd: rows.reduce((a, r) => {
      const d = closedIn(r);
      return d && d >= jan1 ? a + (r.vendor_total ?? 0) : a;
    }, 0),
    sites: new Set(rows.map((r) => r.site_id).filter(Boolean)).size,
  };
}

export default registerVendorWorkOrdersRoute;
