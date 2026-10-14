import { Router } from "express";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import serializeNote from "../serializer/noteSerializer.js";
import serializeActivityLogEntry from "../serializer/activityLogSerializer.js";
import { logActivity } from "../utils/logActivity.js";
import {
  addBusinessDays,
  BILLING_TRIGGERS,
  handoffDefaults,
  handoffKind,
  internalSystemIdFor,
  loadHandoffRules,
  toDate,
  todayPacific,
  ymd,
} from "../utils/handoff.js";
import makeContractHandoffRoutes from "./contractHandoffRoutes.js";

const CONTRACT_ENTITY_TYPE_ID = 5; // Contracts entity type id

// ─── Statuses (worked out from dates — never stored) ─────────────────────────
//
// Contract: vw_ContractStatus. A site on the contract: vw_ServiceLineStatus.
// Same labels and colours as routes/clients.js and routes/sites.js.

const CONTRACT_STATUS = {
  active: { name: "Active", color: "#16A34A" },
  upcoming: { name: "Upcoming", color: "#2563EB" },
  ended: { name: "Ended", color: "#6B7280" },
};

const LINE_STATUS = {
  active: { name: "Active", color: "#16A34A" },
  upcoming: { name: "Upcoming", color: "#2563EB" },
  removed: { name: "Removed", color: "#6B7280" },
  contract_ended: { name: "Contract ended", color: "#6B7280" },
};

/** Decimals out as plain numbers. */
const num = (v) => (v == null ? null : Number(v));

// ─── Editable fields ─────────────────────────────────────────────────────────
//
// Every field the contract page can save, by kind. handoff_on and
// handoff_submitted_by aren't here: only "Submit handoff" sets them.

const TEXT_FIELDS = {
  // field: [max length, required]
  project_name: [255, true],
  executive_summary: [2000],
  scope_of_work: [null],
  client_sla: [200],
  lead_time_override_reason: [300],
  update_cadence: [100, true],
  communication_plan: [1000],
  client_payment_terms: [50],
  sub_payment_terms: [50],
  invoicing_notes: [1000],
  safety_notes: [1000],
  warranty_terms: [1000],
};
const ID_FIELDS = ["service_type_id", "software_id", "internal_system_id"];
const INT_FIELDS = {
  // field: [min, required]
  lead_time_days: [0, true],
  sub_award_business_days: [0, true],
  warranty_months: [0, false],
};
const MONEY_FIELDS = ["value"];
const PERCENT_FIELDS = {
  // field: required
  sub_budget_percent: true,
  target_margin_percent: true,
  deposit_percent: true,
  annual_increase_percent: false,
};
const BOOL_FIELDS = [
  "auto_renew",
  "permits_required",
  "traffic_control_required",
  "inspections_required",
];
const CHOICE_FIELDS = { billing_trigger: BILLING_TRIGGERS };
export const DATE_FIELDS = [
  "start_date",
  "end_date",
  "approved_on",
  "complete_by_on",
  "handoff_on",
];
const EDITABLE_DATES = DATE_FIELDS.filter((f) => f !== "handoff_on");
const DECIMAL_FIELDS = [...MONEY_FIELDS, ...Object.keys(PERCENT_FIELDS)];

const EDITABLE = new Set([
  ...Object.keys(TEXT_FIELDS),
  ...ID_FIELDS,
  ...Object.keys(INT_FIELDS),
  ...DECIMAL_FIELDS,
  ...BOOL_FIELDS,
  ...Object.keys(CHOICE_FIELDS),
  ...EDITABLE_DATES,
]);

const blank = (v) => v === undefined || v === null || v === "";

/**
 * Read one field from a request body. Returns { value } or { error }.
 * Errors are written for the person editing, not the developer.
 */
const parseField = (k, v) => {
  if (k in TEXT_FIELDS) {
    const [max, required] = TEXT_FIELDS[k];
    const t = blank(v) ? null : String(v).trim() || null;
    if (required && !t) return { error: `${k} can't be empty` };
    if (t && max && t.length > max)
      return { error: `${k} is too long (max ${max} characters)` };
    return { value: t };
  }
  if (ID_FIELDS.includes(k)) {
    if (blank(v)) return { value: null };
    const n = Number(v);
    return Number.isInteger(n) ? { value: n } : { error: `${k} isn't valid` };
  }
  if (k in INT_FIELDS) {
    const [min, required] = INT_FIELDS[k];
    if (blank(v))
      return required ? { error: `${k} is required` } : { value: null };
    const n = Number(v);
    return Number.isInteger(n) && n >= min
      ? { value: n }
      : { error: `${k} must be a whole number of at least ${min}` };
  }
  if (k in PERCENT_FIELDS) {
    if (blank(v))
      return PERCENT_FIELDS[k]
        ? { error: `${k} is required` }
        : { value: null };
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 && n <= 100
      ? { value: n }
      : { error: `${k} must be between 0 and 100` };
  }
  if (MONEY_FIELDS.includes(k)) {
    if (blank(v))
      return k === "value" ? { error: "value is required" } : { value: null };
    const n = Number(v);
    return Number.isFinite(n) && n >= 0
      ? { value: n }
      : { error: `${k} must be a positive number` };
  }
  if (BOOL_FIELDS.includes(k)) return { value: Boolean(v) };
  if (k in CHOICE_FIELDS) {
    if (blank(v)) return { error: `${k} is required` };
    return CHOICE_FIELDS[k].includes(v)
      ? { value: v }
      : { error: `${k} must be one of: ${CHOICE_FIELDS[k].join(", ")}` };
  }
  if (DATE_FIELDS.includes(k)) {
    if (blank(v))
      return k === "start_date"
        ? { error: "The contract needs a start date" }
        : { value: null };
    const d = toDate(v);
    return d ? { value: d } : { error: `${k} isn't a valid date` };
  }
  return { error: `${k} can't be edited` };
};

/** Comparable form of a field value, for "did it change" and the log. */
const show = (key, v) => {
  if (v == null || v === "") return "";
  if (DATE_FIELDS.includes(key)) return ymd(v);
  if (typeof v === "object" && "toNumber" in v) return String(v.toNumber());
  if (DECIMAL_FIELDS.includes(key)) return String(Number(v));
  return String(v).trim();
};

const round2 = (n) => Math.round(n * 100) / 100;

/**
 * Site counts per contract from vw_ServiceLineStatus rows
 * ({ contract_id, status }). Only sites on the contract today count.
 */
const countSites = (rows) => {
  const counts = new Map();
  for (const r of rows) {
    const c = counts.get(r.contract_id) ?? {
      active_sites: 0,
      upcoming_sites: 0,
    };
    if (r.status === "active") c.active_sites += 1;
    if (r.status === "upcoming") c.upcoming_sites += 1;
    counts.set(r.contract_id, c);
  }
  return counts;
};

/**
 * One contract, flat, with its status, site counts and the handoff numbers
 * worked out from its fields. `extra.sourcing` = sub vs client price totals
 * (loadContract adds it; the client's contract list doesn't).
 */
export const serializeContract = (
  contract,
  statusRow,
  siteCounts,
  extra = {},
) => {
  const {
    Client,
    ServiceLine,
    ServiceType,
    Software,
    InternalSystem,
    HandoffSubmittedBy,
    ContractSites,
    ChecklistItems,
    ...rest
  } = contract;
  const key = statusRow?.status ?? null;
  const meta = CONTRACT_STATUS[key] ?? { name: null, color: null };

  const dates = Object.fromEntries(
    DATE_FIELDS.filter((f) => f in rest).map((f) => [f, ymd(rest[f])]),
  );
  const decimals = Object.fromEntries(
    DECIMAL_FIELDS.filter((f) => f in rest).map((f) => [f, num(rest[f])]),
  );
  const value = decimals.value ?? 0;
  const pct = (p) => (p == null ? null : round2((value * p) / 100));

  // Source by: N business days from approval (or the handoff, if approval
  // wasn't recorded). The sourcing itself happens per site / work order.
  const awardFrom = rest.approved_on ?? rest.handoff_on ?? null;
  const sourceBy =
    awardFrom && rest.sub_award_business_days != null
      ? addBusinessDays(awardFrom, rest.sub_award_business_days)
      : null;
  const withDeposit = rest.billing_trigger === "deposit_and_completion";

  const sourcing = extra.sourcing ?? null;

  return {
    ...rest,
    ...dates,
    ...decimals,
    client: Client?.client ?? null,
    service_line: ServiceLine?.name ?? null,
    service_type: ServiceType?.name ?? null,
    software: Software?.name ?? null,
    internal_system: InternalSystem?.name ?? null,
    handoff_submitted_by_name: HandoffSubmittedBy?.name ?? null,
    status: meta.name ? { key, name: meta.name, color: meta.color } : null,
    status_key: key,
    status_name: meta.name,
    status_color: meta.color,
    // auto_renew contracts never end, so ends_on is null for them.
    starts_on: ymd(statusRow?.starts_on),
    ends_on: ymd(statusRow?.ends_on),
    active_sites: siteCounts?.active_sites ?? 0,
    upcoming_sites: siteCounts?.upcoming_sites ?? 0,

    // ── Handoff, worked out (never stored) ──
    handoff_kind: handoffKind(ServiceType?.name), // project | on_demand | planned_maintenance | null
    handoff_submitted: Boolean(rest.handoff_on),
    sub_ceiling: pct(decimals.sub_budget_percent),
    deposit_amount: withDeposit ? pct(decimals.deposit_percent) : null,
    final_percent:
      withDeposit && decimals.deposit_percent != null
        ? 100 - decimals.deposit_percent
        : null,
    source_by_on: ymd(sourceBy),
    // Sites on the contract today, and how many have a primary vendor.
    sites_total: extra.sites_total ?? null,
    sites_sourced: extra.sites_sourced ?? null,
    source_by_overdue: Boolean(
      sourceBy &&
      extra.sites_total != null &&
      extra.sites_sourced < extra.sites_total &&
      sourceBy < todayPacific(),
    ),
    // Sourcing: what we pay the primary vendors vs what the client pays, on
    // the sites on the contract today. Compared as a % because prices are
    // per service, not contract totals.
    sub_price_total: sourcing?.sub_total ?? null,
    client_price_total: sourcing?.client_total ?? null,
    sub_price_percent: sourcing?.percent ?? null,
    within_sub_budget:
      sourcing?.percent == null || decimals.sub_budget_percent == null
        ? null
        : sourcing.percent <= decimals.sub_budget_percent,
  };
};

const CONTRACT_INCLUDE = {
  Client: { select: { id: true, client: true } },
  ServiceLine: { select: { id: true, name: true } },
  ServiceType: { select: { id: true, name: true } },
  Software: { select: { id: true, name: true } },
  InternalSystem: { select: { id: true, name: true } },
  HandoffSubmittedBy: { select: { id: true, name: true } },
};

const dbError = (res, error, what) => {
  if (error instanceof PrismaClientKnownRequestError) {
    console.error(`Prisma error ${what}:`, error);
    return res.status(400).json({
      error: "Database Error",
      code: error.code,
      message: error.message,
    });
  }
  console.error(`Error ${what}:`, error);
  return res.status(500).json({ error: "Internal Server Error" });
};

export default function contractsRouter(prisma) {
  const router = Router();

  /** A contract as the detail page reads it, or null. */
  const loadContract = async (id) => {
    const [contract, statusRow, siteRows, pricing] = await Promise.all([
      prisma.contracts.findUnique({ where: { id }, include: CONTRACT_INCLUDE }),
      prisma.contractStatus.findFirst({ where: { contract_id: id } }),
      prisma.serviceLineStatus.findMany({
        where: { contract_id: id, is_current: true },
        select: { contract_id: true, contract_site_id: true, status: true },
      }),
      // Primary vendors' prices on this contract (Sourcing).
      prisma.vendorServicePricing.findMany({
        where: {
          VendorContractSite: {
            is_primary: true,
            ContractSite: { contract_id: id },
          },
        },
        select: {
          vendor_price: true,
          VendorContractSite: { select: { contract_site_id: true } },
          ContractSiteServices: { select: { client_price: true } },
        },
      }),
    ]);
    if (!contract) return null;

    const current = new Set(siteRows.map((r) => r.contract_site_id));
    const sourcedRows = current.size
      ? await prisma.vendorContractSites.findMany({
          where: { is_primary: true, contract_site_id: { in: [...current] } },
          select: { contract_site_id: true },
        })
      : [];
    const sitesSourced = new Set(sourcedRows.map((r) => r.contract_site_id))
      .size;
    let sub = 0;
    let client = 0;
    for (const p of pricing) {
      if (!current.has(p.VendorContractSite?.contract_site_id)) continue;
      sub += Number(p.vendor_price ?? 0);
      client += Number(p.ContractSiteServices?.client_price ?? 0);
    }
    const sourcing = pricing.length
      ? {
          sub_total: round2(sub),
          client_total: round2(client),
          percent: client > 0 ? Math.round((sub / client) * 1000) / 10 : null,
        }
      : null;

    return serializeContract(
      contract,
      statusRow,
      countSites(siteRows).get(id),
      {
        sourcing,
        sites_total: current.size,
        sites_sourced: sitesSourced,
      },
    );
  };

  // GET /api/contracts
  router.get("/", async (req, res) => {
    try {
      const contracts = await prisma.contracts.findMany();
      res.json(contracts);
    } catch (error) {
      dbError(res, error, "fetching contracts");
    }
  });

  // GET /api/contracts/:id — the contract page: fields, status, site
  // counts, notes and activity.
  router.get("/:id", async (req, res) => {
    const id = Number(req.params.id);
    try {
      const [contract, notes, activityLog] = await Promise.all([
        loadContract(id),
        prisma.notes.findMany({
          where: {
            entity_type_id: CONTRACT_ENTITY_TYPE_ID,
            entity_id: id,
            parent_note_id: null,
          },
          include: {
            Author: true,
            Replies: { include: { Author: true } },
            NoteTaggedUsers: { include: { TaggedUser: true } },
          },
        }),
        prisma.activityLog.findMany({
          where: { entity_type_id: CONTRACT_ENTITY_TYPE_ID, entity_id: id },
          include: { Employee: true },
        }),
      ]);
      if (!contract)
        return res.status(404).json({ error: "Contract not found" });

      res.json({
        ...contract,
        notes: notes.map(serializeNote),
        activity_log: activityLog.map(serializeActivityLogEntry),
      });
    } catch (error) {
      dbError(res, error, "fetching contract");
    }
  });

  // PUT /api/contracts/:id
  // Body: { user_id, changes: { field: value, … } }
  // Saves only the fields that changed, logs old → new on the contract, and
  // answers with the whole contract (its status may have moved with the
  // dates).
  router.put("/:id", async (req, res) => {
    const id = Number(req.params.id);
    const { user_id, changes } = req.body ?? {};
    if (!changes || typeof changes !== "object")
      return res.status(400).json({ error: "No changes provided" });

    const requested = Object.entries(changes).filter(([k]) => EDITABLE.has(k));
    if (!requested.length)
      return res.status(400).json({ error: "No valid fields to update" });

    const data = {};
    for (const [k, v] of requested) {
      const r = parseField(k, v);
      if (r.error) return res.status(400).json({ error: r.error, field: k });
      data[k] = r.value;
    }

    try {
      const existing = await prisma.contracts.findUnique({ where: { id } });
      if (!existing)
        return res.status(404).json({ error: "Contract not found" });

      // Pairs of dates that can't run backwards.
      const pick = (k) => (k in data ? data[k] : existing[k]);
      for (const [from, to, msg] of [
        [
          "start_date",
          "end_date",
          "The end date can't be before the start date",
        ],
      ]) {
        const a = pick(from);
        const b = pick(to);
        if (a && b && new Date(b) < new Date(a))
          return res.status(400).json({ error: msg, field: to });
      }

      const changed = Object.entries(data).filter(
        ([k, v]) => show(k, existing[k]) !== show(k, v),
      );
      if (changed.length) {
        await prisma.$transaction(async (tx) => {
          await tx.contracts.update({
            where: { id },
            data: Object.fromEntries(changed),
          });
          // One log row per field, so the Activity tab reads old → new.
          for (const [k, v] of changed) {
            await logActivity(tx, {
              entityTypeId: CONTRACT_ENTITY_TYPE_ID,
              entityId: id,
              fieldChanged: k,
              previousValue: show(k, existing[k]) || null,
              newValue: show(k, v) || null,
              changedBy: user_id ?? null,
              action: "UPDATE",
            });
          }
        });
      }

      res.json(await loadContract(id));
    } catch (error) {
      dbError(res, error, "updating contract");
    }
  });

  // GET /api/contracts/:id/sites — every site ever on the contract, with
  // its status on it (active | upcoming | removed | contract_ended).
  router.get("/:id/sites", async (req, res) => {
    const id = Number(req.params.id);
    try {
      const [contractSites, statusRows] = await Promise.all([
        prisma.contractSites.findMany({
          where: { contract_id: id },
          include: {
            Site: {
              select: {
                id: true,
                store: true,
                mailing_address: true,
                mailing_address2: true,
                mailing_city: true,
                mailing_state: true,
                mailing_zipcode: true,
              },
            },
          },
        }),
        prisma.serviceLineStatus.findMany({ where: { contract_id: id } }),
      ]);
      const statusById = new Map(
        statusRows.map((r) => [r.contract_site_id, r]),
      );

      res.json(
        contractSites.map(({ Site, ...cs }) => {
          const st = statusById.get(cs.id);
          const meta = LINE_STATUS[st?.status] ?? { name: null, color: null };
          return {
            id: cs.id, // contract_site_id
            site_id: cs.site_id,
            store: Site?.store ?? null,
            mailing_address: Site?.mailing_address ?? null,
            mailing_address2: Site?.mailing_address2 ?? null,
            mailing_city: Site?.mailing_city ?? null,
            mailing_state: Site?.mailing_state?.trim() || null,
            mailing_zipcode: Site?.mailing_zipcode ?? null,
            high_risk: cs.high_risk,
            // This site's own dates on the contract.
            site_start_date: ymd(cs.start_date),
            site_end_date: ymd(cs.end_date),
            status_key: st?.status ?? null,
            status_name: meta.name,
            status_color: meta.color,
            is_current: st?.is_current ?? false,
            starts_on: ymd(st?.starts_on),
            ends_on: ymd(st?.ends_on),
          };
        }),
      );
    } catch (error) {
      dbError(res, error, "fetching contract sites");
    }
  });

  // POST /api/contracts
  // A new contract starts with the handoff defaults from HandoffRules (and
  // our internal system by service type). Anything in the body wins.
  router.post("/", async (req, res) => {
    try {
      const body = req.body ?? {};
      const [rules, type] = await Promise.all([
        loadHandoffRules(prisma),
        body.service_type_id
          ? prisma.serviceTypes.findUnique({
              where: { id: Number(body.service_type_id) },
              select: { name: true },
            })
          : null,
      ]);
      const kind = handoffKind(type?.name);
      const defaults = handoffDefaults(rules, { kind });
      if (body.internal_system_id == null) {
        const sys = await internalSystemIdFor(prisma, kind);
        if (sys) defaults.internal_system_id = sys;
      }
      const contract = await prisma.contracts.create({
        data: { ...defaults, ...body },
      });
      res.status(201).json(contract);
    } catch (error) {
      dbError(res, error, "creating contract");
    }
  });

  // Handoff: submit and checklist.
  router.use(makeContractHandoffRoutes(prisma, { loadContract }));

  return router;
}
