// routes/handoffRules.js — mount at /api/handoff-rules
//
//   GET /api/handoff-rules          every rule
//   PUT /api/handoff-rules/:key     Body: { value, user_id }
//
// Changing a rule affects contracts created afterwards only; existing
// contracts keep the values they were created with.
import { Router } from "express";

/** Rules whose value must be a number, and the range it must sit in. */
const NUMERIC = {
  sub_budget_percent: [0, 100],
  target_margin_percent: [0, 100],
  deposit_percent: [0, 100],
  lead_time_days: [0, 365],
  production_rate_default: [1, 10_000_000],
  production_rate_asphalt: [1, 10_000_000],
  sub_award_business_days: [0, 365],
};

const serialize = ({ UpdatedBy, ...r }) => ({
  ...r,
  updated_by_name: UpdatedBy?.name ?? null,
});

export default function handoffRulesRouter(prisma) {
  const router = Router();

  router.get("/", async (req, res) => {
    try {
      const rules = await prisma.handoffRules.findMany({
        orderBy: { id: "asc" },
        include: { UpdatedBy: { select: { name: true } } },
      });
      res.json(rules.map(serialize));
    } catch (error) {
      console.error("Error fetching handoff rules:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  router.put("/:key", async (req, res) => {
    const { key } = req.params;
    const raw = String(req.body?.value ?? "").trim();
    const { user_id } = req.body ?? {};

    if (!raw) return res.status(400).json({ error: "The rule needs a value" });
    if (raw.length > 200)
      return res
        .status(400)
        .json({ error: "Keep the value under 200 characters" });
    if (key in NUMERIC) {
      const [min, max] = NUMERIC[key];
      const n = Number(raw);
      if (!Number.isFinite(n) || n < min || n > max)
        return res
          .status(400)
          .json({ error: `${key} must be a number from ${min} to ${max}` });
    }

    try {
      const existing = await prisma.handoffRules.findUnique({ where: { key } });
      if (!existing) return res.status(404).json({ error: "Rule not found" });
      const updated = await prisma.handoffRules.update({
        where: { key },
        data: { value: raw, updated_by: user_id ?? null },
        include: { UpdatedBy: { select: { name: true } } },
      });
      res.json(serialize(updated));
    } catch (error) {
      console.error("Error updating handoff rule:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  return router;
}
