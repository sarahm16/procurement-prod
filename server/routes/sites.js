import { Router } from "express";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import serializeNote from "../serializer/noteSerializer.js";
import serializeActivityLogEntry from "../serializer/activityLogSerializer.js";
import { logActivity } from "../utils/logActivity.js";
import makeContactRoutes from "./makeContactRoutes.js";
import serializeContact from "../serializer/serializeContact.js";

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

  router.use(
    makeContactRoutes({
      delegate: "siteContacts",
      foreignKey: "site_id",
      entityTypeId: 2,
    }),
  );

  return router;
}
