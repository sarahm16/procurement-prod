/**
 * Company reports.
 *
 *   GET /api/reports/summary?from=2026-01-01&to=2026-12-31[&type=Repair]
 *     margin, fulfillment, sourcing, vendors, the finance pipeline, and the
 *     work order type scorecard (one row per type).
 *     The range applies to work orders by due date and to notices by date
 *     sent. Sourcing and the finance pipeline are always "now".
 *     `type` limits every work order figure to one work order type; the
 *     scorecard always shows them all.
 *
 *   GET /api/reports/workload[?role_id=3][&type=Repair]
 *     open ops work orders and open tasks per person, now.
 *
 * Mount: app.use("/api/reports", reportsRouter(prisma));
 * Permissions come later; for now anyone signed in can see it.
 */
import { Router } from "express";
import { buildSummary, buildWorkload, addDays } from "../services/reports/reportData.js";
import { todayIso } from "../services/notes/noteData.js";

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_DAYS = 5 * 366;
const TYPE_MAX = 50;

const typeParam = (v) => {
  const t = typeof v === "string" ? v.trim() : "";
  return t && t.length <= TYPE_MAX ? t : null;
};

export default function reportsRouter(prisma) {
  const router = Router();

  router.get("/summary", async (req, res) => {
    const today = todayIso();
    const from = DAY_RE.test(req.query.from ?? "") ? req.query.from : `${today.slice(0, 4)}-01-01`;
    const to = DAY_RE.test(req.query.to ?? "") ? req.query.to : today;
    if (from > to) return res.status(400).json({ error: "The start date is after the end date" });
    if (addDays(from, MAX_DAYS) < to) return res.status(400).json({ error: "Pick a range of five years or less" });

    try {
      res.json(await buildSummary(prisma, { from, to, type: typeParam(req.query.type) }));
    } catch (e) {
      console.error("Error building report:", e);
      res.status(500).json({ error: "Couldn't build the report" });
    }
  });

  router.get("/workload", async (req, res) => {
    const roleId = req.query.role_id ? Number(req.query.role_id) : null;
    try {
      res.json(await buildWorkload(prisma, { roleId, type: typeParam(req.query.type) }));
    } catch (e) {
      console.error("Error building workload report:", e);
      res.status(500).json({ error: "Couldn't build the workload report" });
    }
  });


  return router;
}
