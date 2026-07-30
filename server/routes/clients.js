import { Router } from "express";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import serializeNote from "../serializer/noteSerializer.js";
import serializeActivityLogEntry from "../serializer/activityLogSerializer.js";
import { logActivity } from "../utils/logActivity.js";
import serializeContact from "../serializer/serializeContact.js";
import makeContactRoutes from "./makeContactRoutes.js";
import serializeRoleAssignment from "../serializer/roleAssignmentSerializer.js";

const CONTRACT_ENTITY_TYPE_ID = 5; // set to your actual Contracts entity type id

const serializeClient = (client) => {
  return {
    ...client,
    service_lines: client.ClientServiceLines.map((csl) => csl.ServiceLine),
    role_assignments: (client.role_assignments || []).map(
      serializeRoleAssignment,
    ),
  };
};

const serializeClientById = (client, notes, activityLog, contacts) => {
  console.log("serializing notes:", notes);
  return {
    ...client,
    service_lines: client.ClientServiceLines.map((csl) => csl.ServiceLine),
    notes: notes.map(serializeNote),
    activity_log: (activityLog || []).map(serializeActivityLogEntry),
    contacts: (contacts || []).map(serializeContact),
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

      const roleAssignments = await prisma.roleAssignments.findMany({
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
      });
      console.log("Fetched role assignments:", roleAssignments);

      const clientsWithAssignments = clients.map((client) => ({
        ...client,
        role_assignments: roleAssignments.filter(
          (ra) => ra.entity_id === client.id,
        ),
      }));
      res.json(clientsWithAssignments.map(serializeClient));
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

  // GET /api/clients/:id
  router.get("/:id", async (req, res) => {
    const { id } = req.params;
    try {
      const [client, notes, activityLog] = await Promise.all([
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
          },
        }),
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
      res.json(
        serializeClientById(client, notes, activityLog, client.Contacts),
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
          // SalesPerson / OperationsPerson removed — those columns no longer exist
        },
      });

      // Pull role assignments for these contracts (polymorphic — separate query)
      const contractIds = contracts.map((c) => c.id);
      const roleAssignments = await prisma.roleAssignments.findMany({
        where: {
          entity_type_id: CONTRACT_ENTITY_TYPE_ID,
          entity_id: { in: contractIds },
        },
        include: {
          Employee: { select: { id: true, name: true } },
          Role: { select: { id: true, name: true } },
        },
      });

      // Attach each contract's assignments
      const withAssignments = contracts.map((contract) => ({
        ...contract,
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
    console.log("Body", req.body);
    try {
      const client = await prisma.clients.create({
        data: req.body,
      });
      console.log("Client created:", client);
      res.status(201).json(client);
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
    "status",
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
          // no SalesPerson/OperationsPerson includes — those relations are gone
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
