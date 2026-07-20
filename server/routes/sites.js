import { Router } from "express";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import serializeNote from "../serializer/noteSerializer.js";
import serializeActivityLogEntry from "../serializer/activityLogSerializer.js";
import { logActivity } from "../utils/logActivity.js";

const serializeSite = (site) => ({
  ...site,
  service_lines: serializeServiceLines(site.ContractSites),
  client: serializeClient(site.Client),
});

const serializeClient = (client) => client.client;

const serializeServiceLines = (contractSites) => {
  return contractSites.map(
    (contractSite) => contractSite.Contract.ServiceLine.name,
  );
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

const serializeSiteById = (site, notes, activityLog, contacts) => ({
  ...site,
  service_lines: serializeServiceLines(site.ContractSites),
  client: serializeClient(site.Client),
  notes: notes.map(serializeNote),
  activity_log: (activityLog || []).map(serializeActivityLogEntry),
  contacts: contacts.map(serializeContact),
});

const entity_type_id = 2; // Site entity type

// Treat null / undefined / "" as the same, and trim strings so Char(50)
// padding (mailing_state!) doesn't register as a change.
const norm = (v) => {
  if (v === null || v === undefined) return "";
  return typeof v === "string" ? v.trim() : v;
};

export default function sitesRouter(prisma) {
  const router = Router();

  // GET /api/sites
  router.get("/", async (req, res) => {
    try {
      const sites = await prisma.Sites.findMany({
        include: {
          Client: {
            select: {
              id: true,
              client: true,
            },
          },
          ContractSites: {
            select: {
              Contract: {
                select: {
                  ServiceLine: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
            },
          },
        },
      });
      res.json(sites.map(serializeSite));
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

  // GET /api/sites/:id
  router.get("/:id", async (req, res) => {
    const { id } = req.params;
    try {
      const [site, notes, activityLog] = await Promise.all([
        prisma.Sites.findUnique({
          where: { id: Number(id) },
          include: {
            Client: {
              select: {
                id: true,
                client: true,
              },
            },
            ContractSites: {
              select: {
                Contract: {
                  select: {
                    ServiceLine: {
                      select: {
                        id: true,
                        name: true,
                      },
                    },
                  },
                },
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
            entity_type_id: entity_type_id, // Site entity type
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
            entity_type_id: entity_type_id, // Site entity type
            entity_id: Number(id),
          },
          include: {
            Employee: true,
          },
        }),
      ]);
      res.json(serializeSiteById(site, notes, activityLog, site.Contacts));
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        console.error("Prisma error fetching site:", error);
        res.status(400).json({
          error: "Database Error",
          code: error.code,
          message: error.message,
        });
      } else {
        console.error("Error fetching site:", error);
        res.status(500).json({ error: "Internal Server Error" });
      }
    }
  });

  // POST /api/sites/:id/contacts - add a contact to a site
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

    console.log(`Adding a contact to site ${id}`);
    try {
      const contact = await prisma.$transaction(async (tx) => {
        const created = await tx.siteContacts.create({
          data: {
            site_id: Number(id),
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
          entityId: Number(id), // the site — keeps it in the site's feed
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

  // PUT /api/sites/:id/contacts/:cid - update a contact for a site
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
      const existing = await prisma.siteContacts.findUnique({
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
        const updated = await tx.siteContacts.update({
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

  // DELETE /api/sites/:id/contacts/:cid
  router.delete("/:id/contacts/:cid", async (req, res) => {
    const { id, cid } = req.params;
    try {
      const deleted = await prisma.siteContacts.delete({
        where: { id: Number(cid) },
      });
      res.json(deleted);
    } catch (error) {
      console.error("Error deleting contact:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // POST /api/sites
  router.post("/", async (req, res) => {
    console.log("Body", req.body);
    try {
      const site = await prisma.Sites.create({
        data: req.body,
      });
      console.log("Site created:", site);
      res.status(201).json(serializeSite(site));
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        console.error("Prisma error creating site:", error);
        res.status(400).json({
          error: "Database Error",
          code: error.code,
          message: error.message,
        });
      } else {
        console.error("Error creating site:", error);
        res.status(500).json({ error: "Internal Server Error" });
      }
    }
  });

  return router;
}
