import { Router } from "express";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import serializeNote from "../serializer/noteSerializer.js";
import serializeActivityLogEntry from "../serializer/activityLogSerializer.js";
import { logActivity } from "../utils/logActivity.js";

const serializeClient = (client) => {
  return {
    ...client,
    service_lines: client.ClientServiceLines.map((csl) => csl.ServiceLine),
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

const serializeContact = (contact) => {
  return {
    id: contact.id,
    name: contact.name,
    email: contact.email,
    phone: contact.phone,
    contact_role: contact.ContactRole ? contact.ContactRole.name : null,
  };
};

const entity_type_id = 3;

export default function clientsRouter(prisma) {
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
      res.json(clients.map(serializeClient));
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
          ServiceLine: {
            select: {
              name: true,
            },
          },
          Software: {
            select: { name: true, id: true },
          },
          SalesPerson: {
            select: { name: true, id: true },
          },
          OperationsPerson: {
            select: { name: true, id: true },
          },
        },
      });

      console.log(
        `Fetched ${contracts.length} contracts for client ${id}:`,
        contracts,
      );

      res.status(200).json(contracts);
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

  // POST /api/clients/:id/contacts - add a contact to a client
  router.post("/:id/contacts", async (req, res) => {
    const { id } = req.params;
    const { user_id, ...body } = req.body;

    // Whitelist — never spread raw req.body into a Prisma create.
    const contactData = {
      name: body.name,
      email: body.email ?? null,
      phone: body.phone ?? null,
      contact_role_id: body.contact_role_id ?? null,
    };

    if (!contactData.name?.trim()) {
      return res.status(400).json({ error: "Contact name is required" });
    }

    console.log(`Adding a contact to client ${id}`);
    try {
      const contact = await prisma.$transaction(async (tx) => {
        const created = await tx.clientContacts.create({
          data: {
            client_id: Number(id),
            ...contactData,
          },
          include: { ContactRole: true }, // so the response carries the role name
        });

        const roleName = created.ContactRole?.name;
        const summary = roleName
          ? `Added ${roleName} contact: ${created.name}`
          : `Added contact: ${created.name}`;

        await logActivity(tx, {
          entityTypeId: entity_type_id,
          entityId: Number(id), // the client — keeps it in the client's feed
          fieldChanged: "contacts",
          previousValue: null,
          newValue:
            summary.length > 255 ? summary.slice(0, 252) + "…" : summary,
          changedBy: user_id ?? null,
          action: "CREATE",
        });

        return created;
      });

      console.log("Contact created:", contact);
      // flatten the role for the frontend (it expects contact_role, not ContactRole.name)
      res.status(201).json({
        ...contact,
        contact_role: contact.ContactRole?.name ?? null,
      });
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        console.error("Prisma error creating contact:", error);
        res.status(400).json({
          error: "Database Error",
          code: error.code,
          message: error.message,
        });
      } else {
        console.error("Error creating contact:", error);
        res.status(500).json({ error: "Internal Server Error" });
      }
    }
  });

  const CONTACT_ALLOWED_FIELDS = new Set([
    "name",
    "email",
    "phone",
    "contact_role_id",
  ]);

  // PUT /api/clients/:id/contacts/:cid - update a contact for a client
  router.put("/:id/contacts/:cid", async (req, res) => {
    const { id, cid } = req.params;
    const { user_id, changes } = req.body; // `changes` = the draft object

    if (!changes || typeof changes !== "object") {
      return res.status(400).json({ error: "No changes provided" });
    }

    // Drop anything not in the whitelist (strips id, relation keys, stray draft junk)
    const requested = Object.fromEntries(
      Object.entries(changes).filter(([key]) =>
        CONTACT_ALLOWED_FIELDS.has(key),
      ),
    );

    if (Object.keys(requested).length === 0) {
      return res.status(400).json({ error: "No valid fields to update" });
    }

    try {
      // Fetch existing values for just the fields being touched
      const existing = await prisma.clientContacts.findUnique({
        where: { id: Number(cid) },
        select: Object.fromEntries(
          Object.keys(requested).map((k) => [k, true]),
        ),
      });

      if (!existing)
        return res.status(404).json({ error: "Contact not found" });

      // Keep only fields whose value actually differs
      const changedFields = Object.entries(requested).filter(
        ([key, value]) => norm(existing[key]) !== norm(value),
      );

      if (changedFields.length === 0) {
        return res.json(existing); // nothing really changed — skip update + log
      }

      const data = Object.fromEntries(changedFields);

      const updatedContact = await prisma.$transaction(async (tx) => {
        const updated = await tx.clientContacts.update({
          where: { id: Number(cid) },
          data,
          include: { ContactRole: true }, // so the response carries the role name
        });

        const fieldNames = changedFields.map(([k]) => k);
        const summary = changedFields.map(([k, v]) => `${k}: ${v}`).join(", ");

        await logActivity(tx, {
          entityTypeId: entity_type_id,
          entityId: Number(id),
          fieldChanged: fieldNames.join(", "), // e.g. "name, email, phone"
          previousValue: null, // see note below
          newValue:
            summary.length > 255 ? summary.slice(0, 252) + "…" : summary,
          changedBy: user_id ?? null,
          action: "UPDATE",
        });

        return { ...updated, contact_role: updated.ContactRole?.name ?? null }; // flatten the role for the frontend
      });

      res.json(updatedContact);
    } catch (error) {
      console.error("Error updating contact:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // DELETE /api/clients/:id/contacts/:cid
  router.delete("/:id/contacts/:cid", async (req, res) => {
    const { id, cid } = req.params;
    try {
      const deleted = await prisma.clientContacts.delete({
        where: { id: Number(cid) },
      });
      res.json(deleted);
    } catch (error) {
      console.error("Error deleting contact:", error);
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
    "sales_person_id",
    "operations_person_id",
    "service_type_id",
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
          include: {
            SalesPerson: true,
            OperationsPerson: true,
          }, // so the response carries the role name
        });

        const fieldNames = changedFields.map(([k]) => k);
        const summary = changedFields.map(([k, v]) => `${k}: ${v}`).join(", ");

        await logActivity(tx, {
          entityTypeId: entity_type_id,
          entityId: Number(id),
          fieldChanged: fieldNames.join(", "), // e.g. "name, email, phone"
          previousValue: null, // see note below
          newValue:
            summary.length > 255 ? summary.slice(0, 252) + "…" : summary,
          changedBy: user_id ?? null,
          action: "UPDATE",
        });

        return {
          ...updated,
          sales_person: updated.SalesPerson?.name ?? null,
          operations_person: updated.OperationsPerson?.name ?? null,
        }; // flatten the role for the frontend
      });

      res.json(updatedContract);
    } catch (error) {
      console.error("Error updating contract:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  return router;
}
