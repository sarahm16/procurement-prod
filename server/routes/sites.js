import { Router } from "express";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import serializeNote from "../serializer/noteSerializer.js";
import serializeActivityLogEntry from "../serializer/activityLogSerializer.js";
import { logActivity } from "../utils/logActivity.js";
import makeContactRoutes from "./makeContactRoutes.js";
import serializeContact from "../serializer/serializeContact.js";

import multer from "multer";
import { uploadToBlob } from "../services/blob/uploadToBlob.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

const SITE_ATTACHMENTS_CONTAINER = "site-attachments"; // or reuse a shared container

const serializeAttachment = (a) => ({
  id: a.id,
  file_name: a.file_name,
  blob_url: a.blob_url,
  content_type: a.content_type,
  created_at: a.created_at,
  uploaded_by: a.uploaded_by,
});

const serializeSiteById = (site, notes, activityLog, contacts) => ({
  ...site,
  service_lines: serializeServiceLines(site.ContractSites),
  client: serializeClient(site.Client),
  notes: notes.map(serializeNote),
  activity_log: (activityLog || []).map(serializeActivityLogEntry),
  contacts: contacts.map(serializeContact),
  attachments: (site.Attachments ?? []).map(serializeAttachment), // ← add
});

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

  // POST /api/sites/:id/attachments
  // GET /api/sites/:id/attachments
  router.get("/:id/attachments", async (req, res) => {
    const { id } = req.params;
    try {
      const attachments = await prisma.siteAttachments.findMany({
        where: { site_id: Number(id) },
        orderBy: { created_at: "desc" },
      });
      res.json(attachments);
    } catch (error) {
      console.error("Error fetching site attachments:", error);
      res.status(500).json({ error: "Failed to fetch attachments" });
    }
  });

  // POST /api/sites/:id/attachments  (multipart: files[], user_id)
  router.post("/:id/attachments", upload.array("files"), async (req, res) => {
    const { id } = req.params;
    const { user_id } = req.body;

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "No files provided" });
    }

    try {
      const created = [];
      for (const file of req.files) {
        const safeName = file.originalname.replace(/[^\w.\-]/g, "_");
        const blobPath = `sites/${id}/${Date.now()}-${safeName}`;

        const blobUrl = await uploadToBlob(
          SITE_ATTACHMENTS_CONTAINER,
          file.buffer,
          blobPath,
          file.mimetype,
        );

        const record = await prisma.siteAttachments.create({
          data: {
            site_id: Number(id),
            blob_url: blobUrl,
            file_name: file.originalname,
            content_type: file.mimetype,
            uploaded_by: user_id ? Number(user_id) : null,
            category: "",
          },
        });
        created.push(record);
      }

      await logActivity(prisma, {
        entityTypeId: entity_type_id,
        entityId: Number(id),
        fieldChanged: "attachment",
        previousValue: null,
        newValue: `Uploaded ${created.length} file(s)`,
        changedBy: user_id ? Number(user_id) : null,
        action: "CREATE",
      });

      res.status(201).json(created);
    } catch (error) {
      console.error("Error uploading site attachments:", error);
      res.status(500).json({ error: "Failed to upload attachments" });
    }
  });

  // DELETE /api/sites/:id/attachments/:attachmentId
  router.delete("/:id/attachments/:attachmentId", async (req, res) => {
    const { attachmentId } = req.params;
    try {
      await prisma.siteAttachments.delete({
        where: { id: Number(attachmentId) },
      });
      res.status(204).end();
    } catch (error) {
      console.error("Error deleting site attachment:", error);
      res.status(500).json({ error: "Failed to delete attachment" });
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
