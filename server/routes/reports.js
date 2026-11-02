/**
 * Company reports.
 *
 *   GET /api/reports/summary?from=2026-01-01&to=2026-12-31[&pillar=on_demand][&type=Repair]
 *     margin, fulfillment, sourcing, vendors, the finance pipeline, the
 *     pillar scorecard and the work order type scorecard.
 *     The range applies to work orders by due date and to notices by date
 *     sent. Sourcing and the finance pipeline are always "now".
 *     `pillar` is one of planned_maintenance, pm_subcontracted, pm_self,
 *     on_demand, projects (see services/reports/pillars.js).
 *     `type` limits every work order figure to one work order type.
 *     The scorecards always show everything.
 *
 *   GET /api/reports/workload[?role_id=3][&pillar=on_demand][&type=Repair]
 *     open ops work orders and open tasks per person, now.
 *
 * Mount: app.use("/api/reports", reportsRouter(prisma));
 * Permissions come later; for now anyone signed in can see it.
 */
import { Router } from "express";
import { buildSummary, buildWorkload, addDays } from "../services/reports/reportData.js";
import { PILLAR_FILTERS } from "../services/reports/pillars.js";
import { todayIso } from "../services/notes/noteData.js";

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_DAYS = 5 * 366;
const TYPE_MAX = 50;

const typeParam = (v) => {
  const t = typeof v === "string" ? v.trim() : "";
  return t && t.length <= TYPE_MAX ? t : null;
};

/** undefined → no pillar; null → an unknown one (400). */
const pillarParam = (v) => {
  if (v == null || v === "") return undefined;
  return PILLAR_FILTERS.includes(v) ? v : null;
};
const BAD_PILLAR = { error: `pillar must be one of ${PILLAR_FILTERS.join(", ")}` };

export default function reportsRouter(prisma) {
  const router = Router();

  router.get("/summary", async (req, res) => {
    const today = todayIso();
    const from = DAY_RE.test(req.query.from ?? "") ? req.query.from : `${today.slice(0, 4)}-01-01`;
    const to = DAY_RE.test(req.query.to ?? "") ? req.query.to : today;
    if (from > to) return res.status(400).json({ error: "The start date is after the end date" });
    if (addDays(from, MAX_DAYS) < to) return res.status(400).json({ error: "Pick a range of five years or less" });
    const pillar = pillarParam(req.query.pillar);
    if (pillar === null) return res.status(400).json(BAD_PILLAR);

    try {
      res.json(await buildSummary(prisma, { from, to, pillar, type: typeParam(req.query.type) }));
    } catch (e) {
      console.error("Error building report:", e);
      res.status(500).json({ error: "Couldn't build the report" });
    }
  });

  router.get("/workload", async (req, res) => {
    const roleId = req.query.role_id ? Number(req.query.role_id) : null;
    const pillar = pillarParam(req.query.pillar);
    if (pillar === null) return res.status(400).json(BAD_PILLAR);
    try {
      res.json(await buildWorkload(prisma, { roleId, pillar, type: typeParam(req.query.type) }));
    } catch (e) {
      console.error("Error building workload report:", e);
      res.status(500).json({ error: "Couldn't build the workload report" });
    }
  });

  return router;
}
