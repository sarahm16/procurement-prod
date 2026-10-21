import { Router } from "express";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import serializeNote from "../serializer/noteSerializer.js";
import serializeActivityLogEntry from "../serializer/activityLogSerializer.js";
import { logActivity } from "../utils/logActivity.js";
import serializeContact from "../serializer/serializeContact.js";
import makeContactRoutes from "./makeContactRoutes.js";
import serializeRoleAssignment from "../serializer/roleAssignmentSerializer.js";
import { serializeContract } from "./contracts.js";

const CONTRACT_ENTITY_TYPE_ID = 5; // set to your actual Contracts entity type id

// ─── Derived status ──────────────────────────────────────────────────────────
//
// A client's status isn't stored. It comes from vw_ClientStatus: its
// contracts' dates (vw_ContractStatus), with one manual override — a pause
// (Clients.paused_at). Labels and colours live here so every endpoint, and
// the site endpoints, read the same way.

const CLIENT_STATUS = {
  paused: { name: "Paused", color: "#D97706" },
  active: { name: "Active", color: "#16A34A" },
  upcoming: { name: "Upcoming", color: "#2563EB" },
  inactive: { name: "Inactive", color: "#6B7280" },
  none: { name: "No contracts", color: "#9CA3AF" },
};

const CONTRACT_STATUS = {
  active: { name: "Active", color: "#16A34A" },
  upcoming: { name: "Upcoming", color: "#2563EB" },
  ended: { name: "Ended", color: "#6B7280" },
};

/** Dates out as "YYYY-MM-DD" — a Date would show the previous day in Pacific. */
const ymd = (d) => (d ? new Date(d).toISOString().slice(0, 10) : null);

/** Today in Pacific time as a Date at UTC midnight, for a @db.Date column. */
const todayPacific = () => {
  const s = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
  }).format(new Date()); // "YYYY-MM-DD"
  return new Date(`${s}T00:00:00Z`);
};

/**
 * The client's status fields, from a vw_ClientStatus row. `status` keeps the
 * { name, color } object shape the detail header already reads.
 */
const serializeClientStatus = (row, pausedByName = null) => {
  const key = row?.status ?? "none";
  const contractKey = row?.contract_status ?? "none";
  const meta = CLIENT_STATUS[key] ?? CLIENT_STATUS.none;
  return {
    status: { key, name: meta.name, color: meta.color },
    status_name: meta.name,
    status_color: meta.color,
    status_key: key,
    // What the contracts say on their own — differs from status_key only
    // while the client is paused.
    contract_status_key: contractKey,
    contract_status_name: (CLIENT_STATUS[contractKey] ?? CLIENT_STATUS.none)
      .name,
    active_contracts: row?.active_contracts ?? 0,
    upcoming_contracts: row?.upcoming_contracts ?? 0,
    ended_contracts: row?.ended_contracts ?? 0,
    total_contracts: row?.total_contracts ?? 0,
    next_start_date: ymd(row?.next_start_date),
    last_end_date: ymd(row?.last_end_date),
    is_paused: key === "paused",
    paused_at: ymd(row?.paused_at),
    paused_reason: row?.paused_reason ?? null,
    paused_by_name: pausedByName,
  };
};

// ─── Client service lines ────────────────────────────────────────────────────
//
// One row per service line the client is set up for (ClientServiceLines) or
// has ever had a contract on. The status comes from that line's contracts
// (vw_ContractStatus), the site counts from vw_ServiceLineStatus:
//
//   active    at least one active contract on this line
//   upcoming  none active, at least one starting later
//   ended     only ended contracts
//   none      set up for the client, no contract yet

const LINE_STATUS = {
  ...CONTRACT_STATUS,
  none: { name: "No contract", color: "#9CA3AF" },
};
const LINE_RANK = { active: 0, upcoming: 1, none: 2, ended: 3 };

/** Latest of a list of "YYYY-MM-DD" strings, or null. */
const maxYmd = (list) => list.filter(Boolean).sort().at(-1) ?? null;
const minYmd = (list) => list.filter(Boolean).sort()[0] ?? null;

async function loadClientServiceLines(db, clientId) {
  const [setUp, contracts, sites] = await Promise.all([
    db.clientServiceLines.findMany({
      where: { client_id: clientId },
      include: { ServiceLine: { select: { id: true, name: true } } },
    }),
    db.contractStatus.findMany({ where: { client_id: clientId } }),
    db.serviceLineStatus.findMany({
      where: { client_id: clientId, is_current: true },
      select: { service_line_id: true, site_id: true, status: true },
    }),
  ]);

  const byLine = new Map();
  const lineFor = (id, name) => {
    if (!byLine.has(id))
      byLine.set(id, { id, name, on_client: false, contracts: [], sites: [] });
    return byLine.get(id);
  };

  for (const csl of setUp)
    lineFor(csl.service_line_id, csl.ServiceLine?.name).on_client = true;
  for (const c of contracts)
    lineFor(c.service_line_id, c.service_line).contracts.push(c);
  for (const s of sites) byLine.get(s.service_line_id)?.sites.push(s);

  return [...byLine.values()]
    .map(({ contracts: cs, sites: ss, ...line }) => {
      const of = (k) => cs.filter((c) => c.status === k);
      const active = of("active");
      const upcoming = of("upcoming");
      const ended = of("ended");
      const key = active.length
        ? "active"
        : upcoming.length
          ? "upcoming"
          : ended.length
            ? "ended"
            : "none";
      const distinctSites = (k) =>
        new Set(ss.filter((s) => s.status === k).map((s) => s.site_id)).size;

      return {
        ...line,
        status_key: key,
        status: LINE_STATUS[key].name,
        status_color: LINE_STATUS[key].color,
        active_contracts: active.length,
        upcoming_contracts: upcoming.length,
        ended_contracts: ended.length,
        active_sites: distinctSites("active"),
        upcoming_sites: distinctSites("upcoming"),
        // When the first upcoming contract starts.
        next_start_date: minYmd(upcoming.map((c) => ymd(c.starts_on))),
        // The last day of the active contracts — null if any of them runs
        // open-ended (no end date, or auto-renew).
        ends_on:
          active.length && active.every((c) => c.ends_on)
            ? maxYmd(active.map((c) => ymd(c.ends_on)))
            : null,
        last_end_date: maxYmd(ended.map((c) => ymd(c.ends_on))),
        is_current: key !== "ended",
      };
    })
    .sort(
      (a, b) =>
        LINE_RANK[a.status_key] - LINE_RANK[b.status_key] ||
        String(a.name).localeCompare(String(b.name)),
    );
}

// The pause columns are written only through /pause and /unpause, never
// spread raw onto a response.
const stripPauseColumns = ({ paused_at, paused_reason, paused_by, ...rest }) =>
  rest;

// The client's work order platform. Sarlacc means they use our client portal.
const CLIENT_PORTAL_SOFTWARE = "Sarlacc";
const serializePlatform = (Software) => ({
  software: Software?.name ?? null,
  uses_client_portal: Software?.name === CLIENT_PORTAL_SOFTWARE,
});

const serializeClient = (client, statusRow) => {
  const { Segment, Software, ...rest } = client;
  return {
    ...stripPauseColumns(rest),
    segment: Segment?.name ?? null,
    ...serializePlatform(Software),
    service_lines: client.ClientServiceLines.map((csl) => csl.ServiceLine),
    role_assignments: (client.role_assignments || []).map(
      serializeRoleAssignment,
    ),
    ...serializeClientStatus(statusRow),
  };
};

const serializeClientById = (
  client,
  statusRow,
  notes,
  activityLog,
  contacts,
  serviceLines,
) => {
  const { PausedBy, ClientServiceLines, Segment, Software, ...rest } = client;
  return {
    ...stripPauseColumns(rest),
    segment: Segment?.name ?? null,
    ...serializePlatform(Software),
    // With status and counts per line — see loadClientServiceLines.
    service_lines: serviceLines,
    notes: notes.map(serializeNote),
    activity_log: (activityLog || []).map(serializeActivityLogEntry),
    contacts: (contacts || []).map(serializeContact),
    ...serializeClientStatus(statusRow, PausedBy?.name ?? null),
  };
};

const entity_type_id = 3;

function clientsRouter(prisma) {
  const router = Router();

  // GET /api/clients
  router.get("/", async (req, res) => {
    try {
      const clients = await prisma.clients.findMany({
        include: {
          Segment: { select: { id: true, name: true } },
          Software: { select: { id: true, name: true } },
          ClientServiceLines: {
            include: {
              ServiceLine: true,
            },
          },
        },
      });

      const [roleAssignments, statusRows] = await Promise.all([
        prisma.roleAssignments.findMany({
          where: { entity_type_id: entity_type_id },
          include: {
            Employee: {
              select: {
                name: true,
              },
            },
            Role: {
              select: {
                name: true,
                id: true,
              },
            },
          },
        }),
        // Read whole: this endpoint returns every client anyway.
        prisma.clientStatus.findMany(),
      ]);
      const statusByClient = new Map(statusRows.map((r) => [r.client_id, r]));

      const clientsWithAssignments = clients.map((client) => ({
        ...client,
        role_assignments: roleAssignments.filter(
          (ra) => ra.entity_id === client.id,
        ),
      }));
      res.json(
        clientsWithAssignments.map((c) =>
          serializeClient(c, statusByClient.get(c.id)),
        ),
      );
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        console.error("Prisma error fetching clients:", error);
        res.status(400).json({
          error: "Database Error",
          code: error.code,
          message: error.message,
        });
      } else {
        console.error("Error fetching clients:", error);
        res.status(500).json({ error: "Internal Server Error" });
      }
    }
  });

  // Fetch all scopes of work
  // GET /api/clients/scopes
  // GET /api/clients/segments — the options for a client's segment
  // (Government, Commercial, Residential). Before /:id so "segments" isn't
  // read as an id.
  router.get("/segments", async (req, res) => {
    try {
      const segments = await prisma.clientSegments.findMany({
        orderBy: [{ sort_order: "asc" }, { name: "asc" }],
        select: { id: true, name: true },
      });
      res.json(segments);
    } catch (error) {
      console.error("Error fetching client segments:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  router.get("/scopes", async (req, res) => {
    try {
      const scopes = await prisma.clientServiceLineSOWs.findMany({
        include: {
          ServiceLine: true,
          Client: true,
        },
      });
      res.json(scopes);
    } catch (e) {
      console.error("Error loading scopes:", e);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // GET /api/clients/:id
  router.get("/:id", async (req, res) => {
    const { id } = req.params;
    try {
      const [client, statusRow, notes, activityLog, serviceLines] =
        await Promise.all([
          prisma.clients.findUnique({
            where: { id: Number(id) },
            include: {
              Segment: { select: { id: true, name: true } },
              Software: { select: { id: true, name: true } },
              ClientServiceLines: {
                include: {
                  ServiceLine: true,
                },
              },
              Contacts: {
                include: {
                  ContactRole: true,
                },
              },
              PausedBy: { select: { name: true } },
            },
          }),
          prisma.clientStatus.findFirst({ where: { client_id: Number(id) } }),
          prisma.notes.findMany({
            where: {
              entity_type_id: entity_type_id, // Client entity type
              entity_id: Number(id),
              parent_note_id: null,
            },
            include: {
              Author: true,
              Replies: {
                include: { Author: true },
              },
              NoteTaggedUsers: {
                include: { TaggedUser: true },
              },
            },
          }),
          prisma.activityLog.findMany({
            where: {
              entity_type_id: entity_type_id, // Client entity type
              entity_id: Number(id),
            },
            include: {
              Employee: true,
            },
          }),
          loadClientServiceLines(prisma, Number(id)),
        ]);
      // Without this, a bad id threw on client.ClientServiceLines.
      if (!client) return res.status(404).json({ error: "Client not found" });

      res.json(
        serializeClientById(
          client,
          statusRow,
          notes,
          activityLog,
          client.Contacts,
          serviceLines,
        ),
      );
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        console.error("Prisma error fetching client:", error);
        res.status(400).json({
          error: "Database Error",
          code: error.code,
          message: error.message,
        });
      } else {
        console.error("Error fetching client:", error);
        res.status(500).json({ error: "Internal Server Error" });
      }
    }
  });

  // GET /api/clients/:id/contracts
  router.get("/:id/contracts", async (req, res) => {
    const { id } = req.params;

    try {
      const contracts = await prisma.contracts.findMany({
        where: { client_id: Number(id) },
        include: {
          ServiceLine: { select: { id: true, name: true } },
          ServiceType: { select: { id: true, name: true } },
        },
        orderBy: { start_date: "desc" },
      });

      // Pull role assignments for these contracts (polymorphic — separate query)
      const contractIds = contracts.map((c) => c.id);
      const [roleAssignments, statusRows, siteRows] = await Promise.all([
        prisma.roleAssignments.findMany({
          where: {
            entity_type_id: CONTRACT_ENTITY_TYPE_ID,
            entity_id: { in: contractIds },
          },
          include: {
            Employee: { select: { id: true, name: true } },
            Role: { select: { id: true, name: true } },
          },
        }),
        prisma.contractStatus.findMany({
          where: { client_id: Number(id) },
        }),
        // Sites on each contract today, for the Sites column.
        prisma.serviceLineStatus.findMany({
          where: { client_id: Number(id), is_current: true },
          select: { contract_id: true, status: true },
        }),
      ]);
      const sitesByContract = new Map();
      for (const r of siteRows) {
        const c = sitesByContract.get(r.contract_id) ?? {
          active_sites: 0,
          upcoming_sites: 0,
        };
        if (r.status === "active") c.active_sites += 1;
        if (r.status === "upcoming") c.upcoming_sites += 1;
        sitesByContract.set(r.contract_id, c);
      }
      const statusByContract = new Map(
        statusRows.map((r) => [r.contract_id, r]),
      );

      // Attach each contract's assignments and its status (active, upcoming
      // or ended — worked out from its dates)
      const withAssignments = contracts.map((contract) => ({
        ...serializeContract(
          contract,
          statusByContract.get(contract.id),
          sitesByContract.get(contract.id),
        ),
        role_assignments: roleAssignments
          .filter((ra) => ra.entity_id === contract.id)
          .map((ra) => ({
            id: ra.id,
            internal_role_id: ra.internal_role_id,
            role_name: ra.Role?.name,
            employee_id: ra.employee_id,
            employee_name: ra.Employee?.name,
          })),
      }));

      res.status(200).json(withAssignments);
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        console.error("Prisma error fetching contracts:", error);
        res.status(400).json({
          error: "Database Error",
          code: error.code,
          message: error.message,
        });
      } else {
        console.error("Error fetching contracts:", error);
        res.status(500).json({ error: "Internal Server Error" });
      }
    }
  });

  // GET /api/clients/:id/sites
  router.get("/:id/sites", async (req, res) => {
    const { id } = req.params;

    try {
      const sites = await prisma.sites.findMany({
        where: { client_id: Number(id) },
      });
      res.status(200).json(sites);
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        console.error("Prisma error fetching sites:", error);
        res.status(400).json({
          error: "Database Error",
          code: error.code,
          message: error.message,
        });
      } else {
        console.error("Error fetching sites:", error);
        res.status(500).json({ error: "Internal Server Error" });
      }
    }
  });

  // POST /api/clients
  router.post("/", async (req, res) => {
    // Status isn't set on create any more — a new client is "No contracts"
    // until it has one. An older form may still send `status` (it used to be
    // required); drop it, along with the pause columns, which only
    // /pause and /unpause write.
    // eslint-disable-next-line no-unused-vars
    const { status, paused_at, paused_reason, paused_by, ...data } =
      req.body ?? {};
    try {
      const client = await prisma.clients.create({ data });
      res.status(201).json({
        ...client,
        ...serializeClientStatus({ status: "none", contract_status: "none" }),
      });
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        console.error("Prisma error creating client:", error);
        res.status(400).json({
          error: "Database Error",
          code: error.code,
          message: error.message,
        });
      } else {
        console.error("Error creating client:", error);
        res.status(500).json({ error: "Internal Server Error" });
      }
    }
  });

  const ALLOWED_FIELDS = new Set([
    "client",
    "legal_name",
    // "status" removed — it's worked out from contracts now. Pausing is
    // PUT /:id/pause and /:id/unpause.
    "brand",
    "segment_id",
    "software_id",
    "mailing_address",
    "mailing_address2",
    "mailing_city",
    "mailing_state",
    "mailing_zipcode",
    "billing_address",
    "billing_address2",
    "billing_city",
    "billing_state",
    "billing_zipcode",
    "lat",
    "lng",
  ]);

  // Treat null / undefined / "" as the same, and trim strings so Char(50)
  // padding (mailing_state!) doesn't register as a change.
  const norm = (v) => {
    if (v === null || v === undefined) return "";
    return typeof v === "string" ? v.trim() : v;
  };

  // PUT /api/clients/:id
  router.put("/:id", async (req, res) => {
    const { id } = req.params;
    const { user_id, changes } = req.body; // `changes` = the draft object

    if (!changes || typeof changes !== "object") {
      return res.status(400).json({ error: "No changes provided" });
    }

    // Drop anything not in the whitelist (strips id, relation keys, stray draft junk)
    const requested = Object.fromEntries(
      Object.entries(changes).filter(([key]) => ALLOWED_FIELDS.has(key)),
    );

    if (Object.keys(requested).length === 0) {
      return res.status(400).json({ error: "No valid fields to update" });
    }

    // Segment: a ClientSegments id, or empty to clear it.
    if ("segment_id" in requested) {
      const v = requested.segment_id;
      requested.segment_id = v === "" || v == null ? null : Number(v);
      if (requested.segment_id !== null) {
        const ok =
          Number.isInteger(requested.segment_id) &&
          (await prisma.clientSegments.findUnique({
            where: { id: requested.segment_id },
            select: { id: true },
          }));
        if (!ok) return res.status(400).json({ error: "Unknown segment" });
      }
    }

    // Platform: a Softwares id, or empty to clear it.
    if ("software_id" in requested) {
      const v = requested.software_id;
      requested.software_id = v === "" || v == null ? null : Number(v);
      if (requested.software_id !== null) {
        const ok =
          Number.isInteger(requested.software_id) &&
          (await prisma.softwares.findUnique({
            where: { id: requested.software_id },
            select: { id: true },
          }));
        if (!ok) return res.status(400).json({ error: "Unknown platform" });
      }
    }

    try {
      // Fetch existing values for just the fields being touched
      const existing = await prisma.clients.findUnique({
        where: { id: Number(id) },
        select: Object.fromEntries(
          Object.keys(requested).map((k) => [k, true]),
        ),
      });

      if (!existing) return res.status(404).json({ error: "Client not found" });

      // Keep only fields whose value actually differs
      const changedFields = Object.entries(requested).filter(
        ([key, value]) => norm(existing[key]) !== norm(value),
      );

      if (changedFields.length === 0) {
        return res.json(existing); // nothing really changed — skip update + log
      }

      const data = Object.fromEntries(changedFields);

      const updatedClient = await prisma.$transaction(async (tx) => {
        const updated = await tx.clients.update({
          where: { id: Number(id) },
          data,
        });

        const fieldNames = changedFields.map(([k]) => k);
        // Log the segment by name, not its id.
        const segmentName =
          "segment_id" in data && data.segment_id != null
            ? (
                await tx.clientSegments.findUnique({
                  where: { id: data.segment_id },
                  select: { name: true },
                })
              )?.name
            : null;
        // …and the platform by name.
        const platformName =
          "software_id" in data && data.software_id != null
            ? (
                await tx.softwares.findUnique({
                  where: { id: data.software_id },
                  select: { name: true },
                })
              )?.name
            : null;
        const summary = changedFields
          .map(([k, v]) =>
            k === "segment_id"
              ? `segment: ${segmentName ?? "cleared"}`
              : k === "software_id"
                ? `platform: ${platformName ?? "cleared"}`
                : `${k}: ${v}`,
          )
          .join(", ");

        await logActivity(tx, {
          entityTypeId: entity_type_id,
          entityId: Number(id),
          fieldChanged: fieldNames.join(", "), // e.g. "mailing_city, mailing_state, lat, lng"
          previousValue: null, // see note below
          newValue:
            summary.length > 255 ? summary.slice(0, 252) + "…" : summary,
          changedBy: user_id ?? null,
          action: "UPDATE",
        });

        return updated;
      });

      res.json(updatedClient);
    } catch (error) {
      console.error("Error updating client:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  const CONTRACT_ALLOWED_FIELDS = new Set([
    "start_date",
    "end_date",
    "auto_renew",
    "annual_increase_percent",
    "value",
    "project_name",
    "service_type_id",
    // sales_person_id, operations_person_id removed — no longer columns
  ]);

  // PUT /api/clients/:id/contacts/:cid - update a contact for a client
  router.put("/:id/contracts/:cid", async (req, res) => {
    const { id, cid } = req.params;
    const { user_id, changes } = req.body; // `changes` = the draft object

    if (!changes || typeof changes !== "object") {
      return res.status(400).json({ error: "No changes provided" });
    }

    // Drop anything not in the whitelist (strips id, relation keys, stray draft junk)
    const requested = Object.fromEntries(
      Object.entries(changes).filter(([key]) =>
        CONTRACT_ALLOWED_FIELDS.has(key),
      ),
    );

    if (Object.keys(requested).length === 0) {
      return res.status(400).json({ error: "No valid fields to update" });
    }

    try {
      // Fetch existing values for just the fields being touched
      const existing = await prisma.contracts.findUnique({
        where: { id: Number(cid) },
        select: Object.fromEntries(
          Object.keys(requested).map((k) => [k, true]),
        ),
      });

      if (!existing)
        return res.status(404).json({ error: "Contract not found" });

      // Keep only fields whose value actually differs
      const changedFields = Object.entries(requested).filter(
        ([key, value]) => norm(existing[key]) !== norm(value),
      );

      if (changedFields.length === 0) {
        return res.json(existing); // nothing really changed — skip update + log
      }

      const data = Object.fromEntries(changedFields);

      const updatedContract = await prisma.$transaction(async (tx) => {
        const updated = await tx.contracts.update({
          where: { id: Number(cid) },
          data,
        });

        const fieldNames = changedFields.map(([k]) => k);
        const summary = changedFields.map(([k, v]) => `${k}: ${v}`).join(", ");

        await logActivity(tx, {
          entityTypeId: entity_type_id,
          entityId: Number(id), // ← Should update on the client since we don't have a tab for contracts yet
          fieldChanged: fieldNames.join(", "),
          previousValue: null,
          newValue:
            summary.length > 255 ? summary.slice(0, 252) + "…" : summary,
          changedBy: user_id ?? null,
          action: "UPDATE",
        });

        return updated; // no more sales_person/operations_person flattening
      });

      res.json(updatedContract);
    } catch (error) {
      console.error("Error updating contract:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  /** Re-read the client's status from the view after a change. */
  const freshStatus = async (clientId) => {
    const [row, client] = await Promise.all([
      prisma.clientStatus.findFirst({ where: { client_id: clientId } }),
      prisma.clients.findUnique({
        where: { id: clientId },
        select: { PausedBy: { select: { name: true } } },
      }),
    ]);
    return serializeClientStatus(row, client?.PausedBy?.name ?? null);
  };

  // PUT /api/clients/:id/pause
  // Body: { reason, user_id }
  //
  // The one status that's set by hand. Overrides whatever the contracts say
  // until unpaused. Contracts and sites aren't touched. Calling it again on a
  // paused client updates the reason and keeps the original pause date.
  router.put("/:id/pause", async (req, res) => {
    const clientId = Number(req.params.id);
    const reason = String(req.body?.reason ?? "").trim();
    const { user_id } = req.body ?? {};

    if (!reason) {
      return res
        .status(400)
        .json({ error: "Add a reason so the next person knows why" });
    }
    if (reason.length > 200) {
      return res
        .status(400)
        .json({ error: "Keep the reason under 200 characters" });
    }

    try {
      const current = await prisma.clients.findUnique({
        where: { id: clientId },
        select: { id: true, paused_at: true, paused_reason: true },
      });
      if (!current) return res.status(404).json({ error: "Client not found" });

      await prisma.$transaction(async (tx) => {
        await tx.clients.update({
          where: { id: clientId },
          data: {
            paused_at: current.paused_at ?? todayPacific(),
            paused_reason: reason,
            paused_by: user_id ?? null,
          },
        });
        await logActivity(tx, {
          entityTypeId: entity_type_id,
          entityId: clientId,
          fieldChanged: "paused",
          previousValue: current.paused_at
            ? `Paused: ${current.paused_reason ?? ""}`
            : null,
          newValue: `Paused: ${reason}`,
          changedBy: user_id ?? null,
          action: "UPDATE",
        });
      });

      res.json(await freshStatus(clientId));
    } catch (error) {
      console.error("Error pausing client:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // PUT /api/clients/:id/unpause
  // Body: { user_id }
  // Back to whatever the contracts say.
  router.put("/:id/unpause", async (req, res) => {
    const clientId = Number(req.params.id);
    const { user_id } = req.body ?? {};

    try {
      const current = await prisma.clients.findUnique({
        where: { id: clientId },
        select: { id: true, paused_at: true, paused_reason: true },
      });
      if (!current) return res.status(404).json({ error: "Client not found" });
      if (!current.paused_at) return res.json(await freshStatus(clientId));

      await prisma.$transaction(async (tx) => {
        await tx.clients.update({
          where: { id: clientId },
          data: { paused_at: null, paused_reason: null, paused_by: null },
        });
        await logActivity(tx, {
          entityTypeId: entity_type_id,
          entityId: clientId,
          fieldChanged: "paused",
          previousValue: `Paused since ${ymd(current.paused_at)}: ${current.paused_reason ?? ""}`,
          newValue: "Unpaused",
          changedBy: user_id ?? null,
          action: "UPDATE",
        });
      });

      res.json(await freshStatus(clientId));
    } catch (error) {
      console.error("Error unpausing client:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // POST /api/clients/:id/service-lines
  // Body: { service_line_id, user_id }
  // Sets the client up for a service line. Returns the client's lines.
  router.post("/:id/service-lines", async (req, res) => {
    const clientId = Number(req.params.id);
    const serviceLineId = Number(req.body?.service_line_id);
    const { user_id } = req.body ?? {};
    if (!serviceLineId)
      return res.status(400).json({ error: "Pick a service line" });

    try {
      const [client, line, existing] = await Promise.all([
        prisma.clients.findUnique({
          where: { id: clientId },
          select: { id: true },
        }),
        prisma.serviceLines.findUnique({
          where: { id: serviceLineId },
          select: { id: true, name: true },
        }),
        prisma.clientServiceLines.findUnique({
          where: {
            client_id_service_line_id: {
              client_id: clientId,
              service_line_id: serviceLineId,
            },
          },
        }),
      ]);
      if (!client) return res.status(404).json({ error: "Client not found" });
      if (!line)
        return res.status(404).json({ error: "Service line not found" });

      if (!existing) {
        await prisma.$transaction(async (tx) => {
          await tx.clientServiceLines.create({
            data: { client_id: clientId, service_line_id: serviceLineId },
          });
          await logActivity(tx, {
            entityTypeId: entity_type_id,
            entityId: clientId,
            fieldChanged: "service_line",
            previousValue: null,
            newValue: `Added ${line.name}`,
            changedBy: user_id ?? null,
            action: "UPDATE",
          });
        });
      }

      res.json(await loadClientServiceLines(prisma, clientId));
    } catch (error) {
      console.error("Error adding client service line:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // DELETE /api/clients/:id/service-lines/:slid
  // Body: { user_id }
  // Takes a service line off the client. Refused while the client has an
  // active or upcoming contract on it — end the contract first. Ended
  // contracts stay on record, so the line still shows under past lines.
  router.delete("/:id/service-lines/:slid", async (req, res) => {
    const clientId = Number(req.params.id);
    const serviceLineId = Number(req.params.slid);
    const { user_id } = req.body ?? {};

    try {
      const [existing, current] = await Promise.all([
        prisma.clientServiceLines.findUnique({
          where: {
            client_id_service_line_id: {
              client_id: clientId,
              service_line_id: serviceLineId,
            },
          },
          include: { ServiceLine: { select: { name: true } } },
        }),
        prisma.contractStatus.count({
          where: {
            client_id: clientId,
            service_line_id: serviceLineId,
            is_current: true,
          },
        }),
      ]);
      if (!existing)
        return res.json(await loadClientServiceLines(prisma, clientId));
      if (current > 0) {
        return res.status(409).json({
          error: `${existing.ServiceLine?.name ?? "This line"} has ${current} active or upcoming contract${current === 1 ? "" : "s"}. End ${current === 1 ? "it" : "them"} first.`,
        });
      }

      await prisma.$transaction(async (tx) => {
        await tx.clientServiceLines.delete({
          where: {
            client_id_service_line_id: {
              client_id: clientId,
              service_line_id: serviceLineId,
            },
          },
        });
        await logActivity(tx, {
          entityTypeId: entity_type_id,
          entityId: clientId,
          fieldChanged: "service_line",
          previousValue: existing.ServiceLine?.name ?? null,
          newValue: `Removed ${existing.ServiceLine?.name ?? ""}`.trim(),
          changedBy: user_id ?? null,
          action: "UPDATE",
        });
      });

      res.json(await loadClientServiceLines(prisma, clientId));
    } catch (error) {
      console.error("Error removing client service line:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Fetch client scope of work by service line
  // This is used in sending exhibits to the vendor
  // GET /api/clients/:id/scopes/:sid
  router.get("/:id/scopes/:sid", async (req, res) => {
    const { id, sid } = req.params;
    try {
      const scope = await prisma.clientServiceLineSows.findUnique({
        where: { service_line_id: Number(sid), client_id: Number(id) },
      });
      if (!scope) {
        return res.status(404).json({ error: "Scope not found" });
      }
      res.json(scope);
    } catch (e) {
      console.error("Error loading scope:", e);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  router.post("/:id/scopes", async (req, res) => {
    const { id } = req.params;
    const { service_line_id, pandadoc_content_library_uuid } = req.body;
    try {
      const newScope = await prisma.clientServiceLineSOWs.upsert({
        where: {
          client_id_service_line_id: {
            service_line_id: Number(service_line_id),
            client_id: Number(id),
          },
        },
        update: {
          pandadoc_content_library_uuid,
        },

        create: {
          client_id: Number(id),
          service_line_id: Number(service_line_id),
          pandadoc_content_library_uuid, // Panda Doc content library id
        },
      });
      res.json(newScope);
    } catch (e) {
      console.error("Error creating scope:", e);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  router.use(
    makeContactRoutes({
      delegate: "clientContacts",
      foreignKey: "client_id",
      entityTypeId: 3,
    }),
  );

  return router;
}

export default clientsRouter;
