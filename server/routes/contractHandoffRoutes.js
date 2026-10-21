// routes/contractHandoffRoutes.js
//
// The handoff side of a contract, mounted inside contractsRouter:
//
//   POST /api/contracts/:id/submit-handoff
//   GET  /api/contracts/:id/checklist
//   PUT  /api/contracts/:id/checklist/:itemId
//
// The contract and its handoff describe the agreement and the plan. Doing
// the work (schedule, sourcing, billing events, closeout) lives on work
// orders.
import { Router } from "express";
import { logActivity } from "../utils/logActivity.js";
import { handoffKind, toDate, todayPacific, ymd } from "../utils/handoff.js";

const CONTRACT_ENTITY_TYPE_ID = 5;

const GROUPS = [{ key: "handoff", label: "Before work orders" }];

const fail = (res, error, what) => {
  console.error(`Error ${what}:`, error);
  res.status(500).json({ error: "Internal Server Error" });
};

export default function makeContractHandoffRoutes(prisma, { loadContract }) {
  const router = Router();

  // ─── Submit handoff ──────────────────────────────────────────────────────
  //
  // POST /api/contracts/:id/submit-handoff   Body: { user_id }
  //
  // Stamps the handoff date and who submitted it. Refused
  // until the contract has a value, a scope, invoicing instructions and at
  // least one site.
  router.post("/:id/submit-handoff", async (req, res) => {
    const id = Number(req.params.id);
    const { user_id } = req.body ?? {};

    try {
      const c = await prisma.contracts.findUnique({ where: { id } });
      if (!c) return res.status(404).json({ error: "Contract not found" });
      if (c.handoff_on)
        return res.status(409).json({
          error: `The handoff was already submitted on ${ymd(c.handoff_on)}`,
        });

      const currentSites = await prisma.serviceLineStatus.count({
        where: { contract_id: id, is_current: true },
      });
      const missing = [
        !(Number(c.value) > 0) && "Contract value",
        !c.scope_of_work?.trim() && "Scope of work",
        !c.billing_trigger && "How we invoice",
        !currentSites && "At least one site",
      ].filter(Boolean);
      if (missing.length)
        return res.status(400).json({
          error: `Fill in before submitting: ${missing.join(", ")}`,
          missing,
        });

      const today = todayPacific();
      const data = { handoff_on: today, handoff_submitted_by: user_id ?? null };

      await prisma.$transaction(async (tx) => {
        await tx.contracts.update({ where: { id }, data });
        await logActivity(tx, {
          entityTypeId: CONTRACT_ENTITY_TYPE_ID,
          entityId: id,
          fieldChanged: "handoff",
          previousValue: null,
          newValue: `Handoff submitted ${ymd(today)}`,
          changedBy: user_id ?? null,
          action: "UPDATE",
        });
      });

      // TODO: notify operations and billing that the handoff is in.

      res.json(await loadContract(id));
    } catch (error) {
      fail(res, error, "submitting handoff");
    }
  });

  // ─── Checklist ───────────────────────────────────────────────────────────

  /** The contract's checklist, grouped, with what's done. */
  const loadChecklist = async (id) => {
    const contract = await prisma.contracts.findUnique({
      where: { id },
      include: { ServiceType: { select: { name: true } } },
    });
    if (!contract) return null;
    const kind = handoffKind(contract.ServiceType?.name);

    const [items, ticks] = await Promise.all([
      prisma.handoffChecklistItems.findMany({
        orderBy: [{ sort_order: "asc" }, { id: "asc" }],
      }),
      prisma.contractChecklistItems.findMany({
        where: { contract_id: id },
        include: { DoneBy: { select: { name: true } } },
      }),
    ]);
    const tickByItem = new Map(ticks.map((t) => [t.item_id, t]));

    const rows = items
      // Retired items still show where they were ticked, for the history.
      .filter((i) => i.is_active || tickByItem.has(i.id))
      // Project-only items are hidden on known non-project jobs.
      .filter((i) => !i.project_only || kind === "project" || kind == null)
      .map((i) => {
        const tick = tickByItem.get(i.id);
        // An item with auto_source ticks itself from that contract date.
        const auto = i.auto_source ? contract[i.auto_source] : undefined;
        return {
          id: i.id,
          key: i.key,
          group: i.group,
          label: i.label,
          auto: Boolean(i.auto_source),
          auto_source: i.auto_source,
          project_only: i.project_only,
          is_active: i.is_active,
          done: i.auto_source ? Boolean(auto) : Boolean(tick),
          done_on: ymd(i.auto_source ? auto : tick?.done_on),
          done_by_name: i.auto_source ? null : (tick?.DoneBy?.name ?? null),
          note: tick?.note ?? null,
        };
      });

    // Known groups first, then any group added to the table later.
    const keys = [
      ...GROUPS.map((g) => g.key),
      ...new Set(rows.map((r) => r.group)),
    ].filter((k, i, all) => all.indexOf(k) === i);
    const groups = keys
      .map((key) => {
        const its = rows.filter((r) => r.group === key);
        return {
          key,
          label: GROUPS.find((g) => g.key === key)?.label ?? key,
          items: its,
          done: its.filter((r) => r.done).length,
        };
      })
      .filter((g) => g.items.length);

    return {
      groups,
      done: rows.filter((r) => r.done).length,
      total: rows.length,
    };
  };

  // GET /api/contracts/:id/checklist
  router.get("/:id/checklist", async (req, res) => {
    try {
      const list = await loadChecklist(Number(req.params.id));
      if (!list) return res.status(404).json({ error: "Contract not found" });
      res.json(list);
    } catch (error) {
      fail(res, error, "fetching checklist");
    }
  });

  // PUT /api/contracts/:id/checklist/:itemId
  // Body: { done: true|false, done_on?: "YYYY-MM-DD", note?, user_id }
  // Tick or untick a hand-checked item. Items that tick themselves from a
  // date are refused — fill in the date instead.
  router.put("/:id/checklist/:itemId", async (req, res) => {
    const id = Number(req.params.id);
    const itemId = Number(req.params.itemId);
    const { done, done_on, note, user_id } = req.body ?? {};

    try {
      const [contract, item] = await Promise.all([
        prisma.contracts.findUnique({ where: { id }, select: { id: true } }),
        prisma.handoffChecklistItems.findUnique({ where: { id: itemId } }),
      ]);
      if (!contract)
        return res.status(404).json({ error: "Contract not found" });
      if (!item)
        return res.status(404).json({ error: "Checklist item not found" });
      if (item.auto_source)
        return res.status(400).json({
          error: `"${item.label}" ticks itself when ${item.auto_source} is filled in`,
        });

      const doneDate = done_on ? toDate(done_on) : todayPacific();
      if (doneDate === undefined)
        return res.status(400).json({ error: "done_on isn't a valid date" });
      const trimmed =
        note == null ? null : String(note).trim().slice(0, 300) || null;

      await prisma.$transaction(async (tx) => {
        const where = {
          contract_id_item_id: { contract_id: id, item_id: itemId },
        };
        const before = await tx.contractChecklistItems.findUnique({ where });
        if (done) {
          await tx.contractChecklistItems.upsert({
            where,
            create: {
              contract_id: id,
              item_id: itemId,
              done_on: doneDate,
              done_by: user_id ?? null,
              note: trimmed,
            },
            update: { done_on: doneDate, note: trimmed },
          });
        } else if (before) {
          await tx.contractChecklistItems.delete({ where });
        }
        if (Boolean(before) !== Boolean(done)) {
          await logActivity(tx, {
            entityTypeId: CONTRACT_ENTITY_TYPE_ID,
            entityId: id,
            fieldChanged: "checklist",
            previousValue: before ? `${item.label}: done` : null,
            newValue: done ? `${item.label}: done` : `${item.label}: not done`,
            changedBy: user_id ?? null,
            action: "UPDATE",
          });
        }
      });

      res.json(await loadChecklist(id));
    } catch (error) {
      fail(res, error, "updating checklist");
    }
  });

  return router;
}
