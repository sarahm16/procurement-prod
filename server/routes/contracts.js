import { Router } from "express";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import serializeNote from "../serializer/noteSerializer.js";
import serializeActivityLogEntry from "../serializer/activityLogSerializer.js";
import { logActivity } from "../utils/logActivity.js";

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

/** Dates out as "YYYY-MM-DD" — a Date would show the previous day in Pacific. */
const ymd = (d) => (d ? new Date(d).toISOString().slice(0, 10) : null);

/** Decimals out as plain numbers. */
const num = (v) => (v == null ? null : Number(v));

/** Fields the contract page can edit, and how each is read from the body. */
const FIELDS = {
  project_name: (v) => String(v ?? "").trim(),
  service_type_id: (v) => (v === "" || v == null ? null : Number(v)),
  software_id: (v) => (v === "" || v == null ? null : Number(v)),
  start_date: (v) => (v ? new Date(`${String(v).slice(0, 10)}T00:00:00Z`) : v),
  end_date: (v) => (v ? new Date(`${String(v).slice(0, 10)}T00:00:00Z`) : null),
  auto_renew: (v) => Boolean(v),
  value: (v) => (v === "" || v == null ? null : Number(v)),
  annual_increase_percent: (v) => (v === "" || v == null ? null : Number(v)),
};

/** Comparable form of a field value, for "did it change" and the log. */
const show = (key, v) => {
  if (v == null || v === "") return "";
  if (key.endsWith("_date")) return ymd(v);
  if (typeof v === "object" && "toNumber" in v) return String(v.toNumber());
  return String(v).trim();
};

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

/** One contract, flat, with its status and site counts. */
export const serializeContract = (contract, statusRow, siteCounts) => {
  const { Client, ServiceLine, ServiceType, Software, ContractSites, ...rest } =
    contract;
  const key = statusRow?.status ?? null;
  const meta = CONTRACT_STATUS[key] ?? { name: null, color: null };
  return {
    ...rest,
    start_date: ymd(rest.start_date),
    end_date: ymd(rest.end_date),
    value: num(rest.value),
    annual_increase_percent: num(rest.annual_increase_percent),
    client: Client?.client ?? null,
    service_line: ServiceLine?.name ?? null,
    service_type: ServiceType?.name ?? null,
    software: Software?.name ?? null,
    status: meta.name ? { key, name: meta.name, color: meta.color } : null,
    status_key: key,
    status_name: meta.name,
    status_color: meta.color,
    // auto_renew contracts never end, so ends_on is null for them.
    starts_on: ymd(statusRow?.starts_on),
    ends_on: ymd(statusRow?.ends_on),
    active_sites: siteCounts?.active_sites ?? 0,
    upcoming_sites: siteCounts?.upcoming_sites ?? 0,
  };
};

const CONTRACT_INCLUDE = {
  Client: { select: { id: true, client: true } },
  ServiceLine: { select: { id: true, name: true } },
  ServiceType: { select: { id: true, name: true } },
  Software: { select: { id: true, name: true } },
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
    const [contract, statusRow, siteRows] = await Promise.all([
      prisma.contracts.findUnique({ where: { id }, include: CONTRACT_INCLUDE }),
      prisma.contractStatus.findFirst({ where: { contract_id: id } }),
      prisma.serviceLineStatus.findMany({
        where: { contract_id: id, is_current: true },
        select: { contract_id: true, status: true },
      }),
    ]);
    if (!contract) return null;
    return serializeContract(contract, statusRow, countSites(siteRows).get(id));
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

    const requested = Object.entries(changes).filter(([k]) => k in FIELDS);
    if (!requested.length)
      return res.status(400).json({ error: "No valid fields to update" });

    let data;
    try {
      data = Object.fromEntries(requested.map(([k, v]) => [k, FIELDS[k](v)]));
    } catch {
      return res.status(400).json({ error: "Some values aren't valid" });
    }
    for (const k of ["start_date", "end_date"])
      if (data[k] instanceof Date && Number.isNaN(data[k].getTime()))
        return res.status(400).json({ error: `${k} isn't a valid date` });
    if ("project_name" in data && !data.project_name)
      return res.status(400).json({ error: "The contract needs a name" });
    if ("start_date" in data && !data.start_date)
      return res.status(400).json({ error: "The contract needs a start date" });
    for (const k of ["value", "annual_increase_percent"])
      if (k in data && data[k] != null && Number.isNaN(data[k]))
        return res.status(400).json({ error: `${k} must be a number` });

    try {
      const existing = await prisma.contracts.findUnique({ where: { id } });
      if (!existing)
        return res.status(404).json({ error: "Contract not found" });

      const start = data.start_date ?? existing.start_date;
      const end = "end_date" in data ? data.end_date : existing.end_date;
      if (end && start && end < start)
        return res
          .status(400)
          .json({ error: "The end date can't be before the start date" });

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
  router.post("/", async (req, res) => {
    try {
      const contract = await prisma.contracts.create({ data: req.body });
      res.status(201).json(contract);
    } catch (error) {
      dbError(res, error, "creating contract");
    }
  });

  return router;
}
