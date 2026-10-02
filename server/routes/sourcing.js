import { Router } from "express";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { logActivity } from "../utils/logActivity.js";
import { registerPricingRoutes } from "./sourcingPricingRoutes.js";
import { registerReplaceRoute } from "./sourcingReplaceRoute.js";
import { registerAssignRoute } from "./sourcingAssignRoute.js";
import registerSiteSourcingRoute from "./sourcingSiteRoute.js";
import registerVendorSitesRoute from "./sourcingVendorRoute.js";
import registerVendorWorkOrdersRoute from "./vendorWorkordersRoute.js";

const SITE_ENTITY_TYPE_ID = 2;

// Sort keys the client may ask for, mapped to real view columns. Never pass
// req.query straight into orderBy — Prisma will throw on an unknown field and
// it's an easy way to leak schema.
const SORTS = {
  site: "store",
  client: "client",
  line: "service_line",
  vendor: "company",
  w9: "has_w9",
  coi: "has_coi",
  msa: "has_msa",
  ach: "has_ach",
  rates: "has_rates",
  sent: "exhibit_sent",
  signed: "exhibit_signed",
  done: "completed_steps",
  // starts: "starts_on",   // ← add the column to the view first, see notes
};

// "Show me rows missing X" — each maps to a where clause on the view.
const MISSING = {
  vendor: { vendor_id: null },
  w9: { has_w9: false },
  coi: { has_coi: false },
  msa: { has_msa: false },
  ach: { has_ach: false },
  rates: { has_rates: false },
  sent: { exhibit_sent: false },
  signed: { exhibit_signed: false },
};

const DAY = 86400000;
const SOON_DAYS = 30;

const num = (v) => (v == null ? null : Number(v));
const trim = (v) => (typeof v === "string" ? v.trim() : v);

// The grid renders COI as three states, not two: on file and current,
// expiring or expired, or nothing at all.
const coiState = (r) => {
  if (!r.vendor_id) return null;
  if (!r.coi_expiration) return false;
  const exp = new Date(r.coi_expiration).getTime();
  if (exp <= Date.now()) return "warn";
  if (!r.has_coi) return "warn"; // on file but not verified as additionally insured
  return exp - Date.now() <= SOON_DAYS * DAY ? "warn" : true;
};

const serializeGridRow = (r) => ({
  contract_site_id: r.contract_site_id,
  site_id: r.site_id,
  site: r.store,
  city: [trim(r.mailing_city), trim(r.mailing_state)]
    .filter(Boolean)
    .join(", "),
  client_id: r.client_id,
  client: r.client,
  service_line_id: r.service_line_id,
  service_line: r.service_line,

  assignment_id: r.assignment_id,
  vendor_id: r.vendor_id,
  vendor: r.company,
  is_primary: r.is_primary,

  checks: {
    w9: r.has_w9,
    coi: coiState(r),
    msa: r.has_msa,
    ach: r.has_ach,
    rates: r.has_rates,
    sent: r.exhibit_sent,
    signed: r.exhibit_signed,
  },

  coi_expiration: r.coi_expiration,
  exhibit_sent_at: r.exhibit_sent_at,
  exhibit_signed_at: r.exhibit_signed_at,

  service_count: r.service_count,
  priced_count: r.priced_count,
  completed_steps: r.completed_steps,
  is_sourced: r.is_sourced,

  client_price_total: num(r.client_price_total),
  vendor_price_total: num(r.vendor_price_total),
  vendor: r.company,
  is_primary: r.is_primary,
  vendor_count: r.vendor_count,
  backup_vendor_count: r.backup_vendor_count,
});

// Accepts ?service_line_id=1&service_line_id=2 or ?service_line_id=1,2
const listParam = (v) =>
  (Array.isArray(v) ? v : v == null ? [] : String(v).split(","))
    .map((x) => String(x).trim())
    .filter(Boolean);

export default function sourcingRouter(prisma) {
  const router = Router();
  registerVendorWorkOrdersRoute(router, prisma);
  registerVendorSitesRoute(router, prisma);
  registerSiteSourcingRoute(router, prisma, serializeGridRow);
  registerPricingRoutes(router, prisma, serializeGridRow);
  registerReplaceRoute(router, prisma, serializeGridRow);
  registerAssignRoute(router, prisma, serializeGridRow);

  // GET /api/sourcing
  //   ?q=              free text over site, client, vendor
  //   &client_id=      exact client
  //   &service_line_id=1,2
  //   &state=          todo (default) | sourced | all
  //   &missing=coi,ach rows missing ANY of these
  //   &sort=site&dir=asc
  //   &page=1&limit=100
  router.get("/", async (req, res) => {
    const {
      q,
      client_id,
      state = "todo",
      sort = "site",
      dir = "asc",
      page = "1",
      limit = "100",
    } = req.query;

    const take = Math.min(Math.max(Number(limit) || 100, 1), 500);
    const skip = (Math.max(Number(page) || 1, 1) - 1) * take;

    const AND = [];

    if (q && String(q).trim()) {
      const term = String(q).trim();
      // No `mode: "insensitive"` — SQL Server handles that at the collation
      // level, and the default collation is already case-insensitive.
      AND.push({
        OR: [
          { store: { contains: term } },
          { client: { contains: term } },
          { company: { contains: term } },
          { mailing_city: { contains: term } },
        ],
      });
    }

    if (client_id) AND.push({ client_id: Number(client_id) });

    const lineIds = listParam(req.query.service_line_id)
      .map(Number)
      .filter((n) => !isNaN(n));
    if (lineIds.length) AND.push({ service_line_id: { in: lineIds } });

    if (state === "todo") AND.push({ is_sourced: false });
    else if (state === "sourced") AND.push({ is_sourced: true });

    const missing = listParam(req.query.missing).filter((k) => MISSING[k]);
    if (missing.length) AND.push({ OR: missing.map((k) => MISSING[k]) });

    const field = SORTS[sort] || SORTS.site;
    const direction = dir === "desc" ? "desc" : "asc";

    // Checklist columns sort gaps first, so "sort by COI" surfaces the ones
    // that need chasing rather than the ones already done.
    const orderBy = [{ [field]: direction }];
    if (field !== "store") orderBy.push({ store: "asc" });
    orderBy.push({ service_line: "asc" });

    const where = AND.length ? { AND } : {};

    try {
      const [rows, total] = await Promise.all([
        prisma.sourcingGrid.findMany({ where, orderBy, skip, take }),
        prisma.sourcingGrid.count({ where }),
      ]);

      res.json({
        rows: rows.map(serializeGridRow),
        total,
        page: Number(page) || 1,
        limit: take,
      });
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        console.error("Prisma error fetching sourcing grid:", error);
        res.status(400).json({
          error: "Database Error",
          code: error.code,
          message: error.message,
        });
      } else {
        console.error("Error fetching sourcing grid:", error);
        res.status(500).json({ error: "Internal Server Error" });
      }
    }
  });

  // GET /api/sourcing/clients — feeds the toolbar typeahead. Only clients
  // that actually have contract sites, so the picker never offers a dead end.
  router.get("/clients", async (req, res) => {
    try {
      const rows = await prisma.sourcingGrid.findMany({
        distinct: ["client_id"],
        where: { client_id: { not: null } },
        select: { client_id: true, client: true },
        orderBy: { client: "asc" },
      });
      res.json(rows.map((r) => ({ id: r.client_id, client: r.client })));
    } catch (error) {
      console.error("Error fetching sourcing clients:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // DELETE /api/sourcing/assignments/:id — undo a mistaken assignment.
  // A real termination is a status change, not a delete.
  router.delete("/assignments/:id", async (req, res) => {
    try {
      await prisma.vendorContractSites.delete({
        where: { id: Number(req.params.id) },
      });
      res.status(204).end();
    } catch (error) {
      console.error("Error deleting assignment:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  return router;
}
