import { Router } from "express";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import serializeNote from "../serializer/noteSerializer.js";
import serializeActivityLogEntry from "../serializer/activityLogSerializer.js";
import { logActivity } from "../utils/logActivity.js";
import serializeContact from "../serializer/serializeContact.js";
import makeContactRoutes from "./makeContactRoutes.js";
import serializeRoleAssignment from "../serializer/roleAssignmentSerializer.js";

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

/** One contract's status fields, from a vw_ContractStatus row. */
const serializeContractStatus = (row) => {
  const key = row?.status ?? null;
  const meta = CONTRACT_STATUS[key] ?? { name: null, color: null };
  return {
    status_key: key,
    status: meta.name,
    status_color: meta.color,
    is_active: row?.is_active ?? false,
    starts_on: ymd(row?.starts_on),
    ends_on: ymd(row?.ends_on),
  };
};

// The pause columns are written only through /pause and /unpause, never
// spread raw onto a response.
const stripPauseColumns = ({ paused_at, paused_reason, paused_by, ...rest }) =>
  rest;

const serializeClient = (client, statusRow) => {
  return {
    ...stripPauseColumns(client),
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
) => {
  const { PausedBy, ...rest } = client;
  return {
    ...stripPauseColumns(rest),
    service_lines: client.ClientServiceLines.map((csl) => csl.ServiceLine),
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
      const [client, statusRow, notes, activityLog] = await Promise.all([
        prisma.clients.findUnique({
          where: { id: Number(id) },
          include: {
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
          ServiceLine: { select: { name: true } },
          Software: { select: { name: true, id: true } },
        },
      });

      // Pull role assignments for these contracts (polymorphic — separate query)
      const contractIds = contracts.map((c) => c.id);
      const [roleAssignments, statusRows] = await Promise.all([
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
      ]);
      const statusByContract = new Map(
        statusRows.map((r) => [r.contract_id, r]),
      );

      // Attach each contract's assignments and its status (active, upcoming
      // or ended — worked out from its dates)
      const withAssignments = contracts.map((contract) => ({
        ...contract,
        ...serializeContractStatus(statusByContract.get(contract.id)),
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
        const summary = changedFields.map(([k, v]) => `${k}: ${v}`).join(", ");

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
    "software_id",
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
