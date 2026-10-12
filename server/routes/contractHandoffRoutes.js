// routes/contractHandoffRoutes.js
//
// The handoff side of a contract, mounted inside contractsRouter:
//
//   POST   /api/contracts/:id/submit-handoff
//   GET    /api/contracts/:id/checklist
//   PUT    /api/contracts/:id/checklist/:itemId
//   GET    /api/contracts/:id/phases
//   POST   /api/contracts/:id/phases
//   PUT    /api/contracts/:id/phases/order
//   PUT    /api/contracts/:id/phases/:phaseId
//   DELETE /api/contracts/:id/phases/:phaseId
import { Router } from "express";
import { logActivity } from "../utils/logActivity.js";
import { DOC_TYPES } from "../utils/complianceDocs.js";
import {
  addDays,
  handoffKind,
  internalSystemIdFor,
  isAsphalt,
  loadHandoffRules,
  productionDaysFor,
  productionFinish,
  toDate,
  todayPacific,
  ymd,
} from "../utils/handoff.js";

const CONTRACT_ENTITY_TYPE_ID = 5;

const GROUPS = [
  { key: "operations", label: "Operations milestones" },
  { key: "subcontractor_file", label: "Subcontractor file" },
  { key: "risk", label: "Risk and compliance" },
  { key: "field_closeout", label: "Field closeout" },
  { key: "system_closeout", label: "System closeout" },
  { key: "accounting_closeout", label: "Accounting closeout" },
];

const fail = (res, error, what) => {
  console.error(`Error ${what}:`, error);
  res.status(500).json({ error: "Internal Server Error" });
};

export default function makeContractHandoffRoutes(prisma, { loadContract }) {
  const router = Router();

  const contractExists = async (id) =>
    Boolean(
      await prisma.contracts.findUnique({
        where: { id },
        select: { id: true },
      }),
    );

  // ─── Submit handoff ──────────────────────────────────────────────────────
  //
  // POST /api/contracts/:id/submit-handoff   Body: { user_id }
  //
  // Stamps the handoff date and who submitted it, then fills whatever the
  // schedule is still missing, following the deck:
  //   target start   = handoff + lead time (projects) or the client's date
  //   production     = ceil(value ÷ daily rate), project jobs
  //   planned finish = target start + production days, skipping weekends
  //   internal system = UtilizeCore for PM, Sarlacc otherwise
  // and adds the first and last schedule phases if there are none.
  // Fields someone already filled in are left alone.
  router.post("/:id/submit-handoff", async (req, res) => {
    const id = Number(req.params.id);
    const { user_id } = req.body ?? {};

    try {
      const c = await prisma.contracts.findUnique({
        where: { id },
        include: {
          ServiceLine: { select: { name: true } },
          ServiceType: { select: { name: true } },
          _count: { select: { SchedulePhases: true } },
        },
      });
      if (!c) return res.status(404).json({ error: "Contract not found" });
      if (c.handoff_on)
        return res.status(409).json({
          error: `The handoff was already submitted on ${ymd(c.handoff_on)}`,
        });

      // The deck: every handoff must identify the money, the scope and where
      // the work is.
      const currentSites = await prisma.serviceLineStatus.count({
        where: { contract_id: id, is_current: true },
      });
      const missing = [
        !(Number(c.value) > 0) && "Contract value",
        !c.scope_of_work?.trim() && "Scope of work",
        !currentSites && "At least one site",
      ].filter(Boolean);
      if (missing.length)
        return res.status(400).json({
          error: `Fill in before submitting: ${missing.join(", ")}`,
          missing,
        });

      const kind = handoffKind(c.ServiceType?.name);
      const today = todayPacific();
      const rules = await loadHandoffRules(prisma);
      const data = { handoff_on: today, handoff_submitted_by: user_id ?? null };

      const rate =
        c.production_rate_per_day ??
        (isAsphalt(c.ServiceLine?.name)
          ? rules.production_rate_asphalt
          : rules.production_rate_default) ??
        null;
      if (c.production_rate_per_day == null && rate != null)
        data.production_rate_per_day = rate;

      let start = c.target_start_on;
      if (!start) {
        start =
          kind === "project" || !c.client_required_on
            ? addDays(today, c.lead_time_days ?? rules.lead_time_days ?? 21)
            : c.client_required_on;
        data.target_start_on = start;
      }

      let days = c.production_days;
      if (days == null && kind === "project") {
        days = productionDaysFor(c.value, rate);
        if (days) data.production_days = days;
      }

      if (!c.planned_finish_on && days) {
        const finish = productionFinish(start, days);
        if (finish) data.planned_finish_on = finish;
      }

      if (c.internal_system_id == null) {
        const sys = await internalSystemIdFor(prisma, kind);
        if (sys) data.internal_system_id = sys;
      }

      const finish = data.planned_finish_on ?? c.planned_finish_on ?? null;

      await prisma.$transaction(async (tx) => {
        await tx.contracts.update({ where: { id }, data });
        if (c._count.SchedulePhases === 0) {
          await tx.contractSchedulePhases.createMany({
            data: [
              {
                contract_id: id,
                sort_order: 1,
                label: "Day 1",
                description: "Mobilization + work area",
                planned_on: start,
              },
              {
                contract_id: id,
                sort_order: 2,
                label: "Final day",
                description: "Punch, cleanup and completion photos",
                planned_on: finish,
              },
            ],
          });
        }
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

      // TODO: notify operations and billing that the handoff is in (the deck
      // asks for it). Hook your email/Teams sender in here.

      res.json(await loadContract(id));
    } catch (error) {
      fail(res, error, "submitting handoff");
    }
  });

  // ─── Checklist ───────────────────────────────────────────────────────────

  /** Primary vendors on the sites that are on the contract today. */
  const primaryVendorIds = async (id) => {
    const current = await prisma.serviceLineStatus.findMany({
      where: { contract_id: id, is_current: true },
      select: { contract_site_id: true },
    });
    if (!current.length) return [];
    const rows = await prisma.vendorContractSites.findMany({
      where: {
        is_primary: true,
        contract_site_id: { in: current.map((r) => r.contract_site_id) },
      },
      select: { vendor_id: true },
    });
    return [...new Set(rows.map((r) => r.vendor_id))];
  };

  /** W-9 / COI state across the primary vendors, for the auto items. */
  const vendorChecks = async (id) => {
    const vendorIds = await primaryVendorIds(id);
    if (!vendorIds.length) {
      const none = {
        done: false,
        done_on: null,
        detail: "No primary vendor yet",
      };
      return { vendor_w9: none, vendor_coi: none };
    }
    const today = todayPacific();
    const [w9s, cois] = await Promise.all([
      prisma.vendorComplianceDocuments.findMany({
        where: {
          vendor_id: { in: vendorIds },
          document_type: DOC_TYPES.W9,
          date_completed: { not: null },
        },
        select: { vendor_id: true, date_completed: true },
      }),
      prisma.vendorCOIs.findMany({
        where: {
          vendor_id: { in: vendorIds },
          expiration_date: { gt: today },
          additionally_insured_verified: true,
        },
        select: { vendor_id: true },
      }),
    ]);
    const w9Vendors = new Set(w9s.map((r) => r.vendor_id));
    const coiVendors = new Set(cois.map((r) => r.vendor_id));
    const n = vendorIds.length;
    const of = (set, what) =>
      `${vendorIds.filter((v) => set.has(v)).length} of ${n} vendor${n === 1 ? "" : "s"} ${what}`;
    return {
      vendor_w9: {
        done: vendorIds.every((v) => w9Vendors.has(v)),
        done_on: ymd(
          w9s.map((r) => r.date_completed).sort((a, b) => b - a)[0] ?? null,
        ),
        detail: of(w9Vendors, "have a completed W-9"),
      },
      vendor_coi: {
        done: vendorIds.every((v) => coiVendors.has(v)),
        done_on: null,
        detail: of(coiVendors, "have a current, verified COI"),
      },
    };
  };

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
    const needsVendors = items.some((i) =>
      ["vendor_w9", "vendor_coi"].includes(i.auto_source),
    );
    const vendor = needsVendors ? await vendorChecks(id) : {};

    const rows = items
      // Retired items still show where they were ticked, for the history.
      .filter((i) => i.is_active || tickByItem.has(i.id))
      // Project-only items are hidden on known non-project jobs.
      .filter((i) => !i.project_only || kind === "project" || kind == null)
      .map((i) => {
        const tick = tickByItem.get(i.id);
        let state;
        if (i.auto_source?.startsWith("vendor_")) {
          state = vendor[i.auto_source];
        } else if (i.auto_source) {
          const v = contract[i.auto_source];
          state = { done: Boolean(v), done_on: ymd(v), detail: null };
        } else {
          state = {
            done: Boolean(tick),
            done_on: ymd(tick?.done_on),
            detail: null,
          };
        }
        return {
          id: i.id,
          key: i.key,
          group: i.group,
          label: i.label,
          auto: Boolean(i.auto_source),
          auto_source: i.auto_source,
          project_only: i.project_only,
          is_active: i.is_active,
          done: state.done,
          done_on: state.done_on,
          detail: state.detail,
          done_by_name: i.auto_source ? null : (tick?.DoneBy?.name ?? null),
          note: tick?.note ?? null,
        };
      });

    const groups = GROUPS.map((g) => {
      const its = rows.filter((r) => r.group === g.key);
      return { ...g, items: its, done: its.filter((r) => r.done).length };
    }).filter((g) => g.items.length);
    // Groups added to the table later still show, after the known ones.
    for (const r of rows)
      if (
        !GROUPS.some((g) => g.key === r.group) &&
        !groups.some((g) => g.key === r.group)
      )
        groups.push({
          key: r.group,
          label: r.group,
          items: rows.filter((x) => x.group === r.group),
          done: rows.filter((x) => x.group === r.group && x.done).length,
        });

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
  // date or the vendor's records are refused — change the source instead.
  router.put("/:id/checklist/:itemId", async (req, res) => {
    const id = Number(req.params.id);
    const itemId = Number(req.params.itemId);
    const { done, done_on, note, user_id } = req.body ?? {};

    try {
      const [exists, item] = await Promise.all([
        contractExists(id),
        prisma.handoffChecklistItems.findUnique({ where: { id: itemId } }),
      ]);
      if (!exists) return res.status(404).json({ error: "Contract not found" });
      if (!item)
        return res.status(404).json({ error: "Checklist item not found" });
      if (item.auto_source)
        return res.status(400).json({
          error: item.auto_source.startsWith("vendor_")
            ? `"${item.label}" ticks itself from the vendor's compliance records`
            : `"${item.label}" ticks itself when ${item.auto_source} is filled in`,
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

  // ─── Schedule phases ─────────────────────────────────────────────────────

  const loadPhases = async (id) => {
    const rows = await prisma.contractSchedulePhases.findMany({
      where: { contract_id: id },
      orderBy: [{ sort_order: "asc" }, { id: "asc" }],
      include: { Site: { select: { id: true, store: true } } },
    });
    return rows.map(({ Site, ...p }) => ({
      ...p,
      planned_on: ymd(p.planned_on),
      site: Site?.store ?? null,
    }));
  };

  /** Read a phase body. Returns { data } or { error }. */
  const readPhase = async (id, body, { partial }) => {
    const data = {};
    if (!partial || "label" in body) {
      const label = String(body.label ?? "").trim();
      if (!label) return { error: 'The phase needs a label (e.g. "Day 2")' };
      if (label.length > 50)
        return { error: "Keep the label under 50 characters" };
      data.label = label;
    }
    if ("description" in body)
      data.description =
        String(body.description ?? "")
          .trim()
          .slice(0, 500) || null;
    if ("planned_on" in body) {
      const d = body.planned_on ? toDate(body.planned_on) : null;
      if (d === undefined) return { error: "planned_on isn't a valid date" };
      data.planned_on = d;
    }
    if ("site_id" in body) {
      if (body.site_id == null || body.site_id === "") data.site_id = null;
      else {
        const onContract = await prisma.contractSites.findFirst({
          where: { contract_id: id, site_id: Number(body.site_id) },
          select: { id: true },
        });
        if (!onContract) return { error: "That site isn't on this contract" };
        data.site_id = Number(body.site_id);
      }
    }
    return { data };
  };

  // GET /api/contracts/:id/phases
  router.get("/:id/phases", async (req, res) => {
    try {
      res.json(await loadPhases(Number(req.params.id)));
    } catch (error) {
      fail(res, error, "fetching phases");
    }
  });

  // POST /api/contracts/:id/phases   Body: { label, description?, planned_on?, site_id? }
  // Adds a phase before the last one ("Final day"), or at the end if there's
  // only one.
  router.post("/:id/phases", async (req, res) => {
    const id = Number(req.params.id);
    try {
      if (!(await contractExists(id)))
        return res.status(404).json({ error: "Contract not found" });
      const r = await readPhase(id, req.body ?? {}, { partial: false });
      if (r.error) return res.status(400).json({ error: r.error });

      const phases = await prisma.contractSchedulePhases.findMany({
        where: { contract_id: id },
        orderBy: [{ sort_order: "asc" }, { id: "asc" }],
        select: { id: true },
      });
      await prisma.$transaction(async (tx) => {
        // Renumber so the new one slots in before the final phase.
        const at = phases.length >= 2 ? phases.length - 1 : phases.length;
        const order = [...phases.map((p) => p.id)];
        const created = await tx.contractSchedulePhases.create({
          data: { contract_id: id, sort_order: 0, ...r.data },
        });
        order.splice(at, 0, created.id);
        for (const [i, pid] of order.entries())
          await tx.contractSchedulePhases.update({
            where: { id: pid },
            data: { sort_order: i + 1 },
          });
      });
      res.status(201).json(await loadPhases(id));
    } catch (error) {
      fail(res, error, "adding phase");
    }
  });

  // PUT /api/contracts/:id/phases/order   Body: { ids: [phaseId, …] }
  // (Before /:phaseId, so "order" isn't read as an id.)
  router.put("/:id/phases/order", async (req, res) => {
    const id = Number(req.params.id);
    const ids = (req.body?.ids ?? []).map(Number);
    try {
      const phases = await prisma.contractSchedulePhases.findMany({
        where: { contract_id: id },
        select: { id: true },
      });
      const known = new Set(phases.map((p) => p.id));
      if (ids.length !== known.size || !ids.every((pid) => known.has(pid)))
        return res.status(400).json({
          error: "Send every phase of this contract, in the new order",
        });
      await prisma.$transaction(
        ids.map((pid, i) =>
          prisma.contractSchedulePhases.update({
            where: { id: pid },
            data: { sort_order: i + 1 },
          }),
        ),
      );
      res.json(await loadPhases(id));
    } catch (error) {
      fail(res, error, "reordering phases");
    }
  });

  // PUT /api/contracts/:id/phases/:phaseId   Body: any of label, description, planned_on, site_id
  router.put("/:id/phases/:phaseId", async (req, res) => {
    const id = Number(req.params.id);
    const phaseId = Number(req.params.phaseId);
    try {
      const phase = await prisma.contractSchedulePhases.findFirst({
        where: { id: phaseId, contract_id: id },
        select: { id: true },
      });
      if (!phase) return res.status(404).json({ error: "Phase not found" });
      const r = await readPhase(id, req.body ?? {}, { partial: true });
      if (r.error) return res.status(400).json({ error: r.error });
      await prisma.contractSchedulePhases.update({
        where: { id: phaseId },
        data: r.data,
      });
      res.json(await loadPhases(id));
    } catch (error) {
      fail(res, error, "updating phase");
    }
  });

  // DELETE /api/contracts/:id/phases/:phaseId
  router.delete("/:id/phases/:phaseId", async (req, res) => {
    const id = Number(req.params.id);
    const phaseId = Number(req.params.phaseId);
    try {
      const { count } = await prisma.contractSchedulePhases.deleteMany({
        where: { id: phaseId, contract_id: id },
      });
      if (!count) return res.status(404).json({ error: "Phase not found" });
      res.json(await loadPhases(id));
    } catch (error) {
      fail(res, error, "deleting phase");
    }
  });

  return router;
}
