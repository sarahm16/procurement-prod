/**
 * Miscellaneous vendor documents: files the team uploads that don't go
 * through PandaDoc (correspondence, certificates, photos, spreadsheets…).
 *
 *   GET    /api/vendors/:id/misc-documents
 *   POST   /api/vendors/:id/misc-documents             (multipart/form-data)
 *            files:  files[]  (up to 20, 25 MB each)
 *            fields: names (JSON array, same order as files; optional),
 *                    notes (optional, applies to the whole batch), user_id
 *   PATCH  /api/vendors/:id/misc-documents/:docId      { name, notes, user_id }
 *   DELETE /api/vendors/:id/misc-documents/:docId      { user_id }
 *   GET    /api/vendors/:id/misc-documents/:docId/file[?download=1]
 *
 * Files live in the "vendor-documents" container at
 * vendors/{vendorId}/misc/{timestamp}-{file name}. The app reads them back
 * through /file, so opening and downloading keep working once the container
 * is made private.
 *
 * Deleting hides the document (deleted_at / deleted_by) and keeps the file,
 * so nothing is lost by a wrong click. Every upload, edit and delete is in
 * the vendor's activity log.
 *
 * Register on the vendors router:
 *   import { registerMiscDocumentRoutes } from "./vendorMiscDocumentRoutes.js";
 *   registerMiscDocumentRoutes(router, prisma);
 *
 * .env (optional):
 *   VENDOR_DOCUMENTS_CONTAINER   defaults to "vendor-documents"
 */
import path from "node:path";
import multer from "multer";
import { logActivity } from "../utils/logActivity.js";
import { uploadToBlob } from "../services/blob/uploadToBlob.js";
import { downloadFromBlob } from "../services/blob/downloadFromBlob.js";

const VENDOR_ENTITY_TYPE_ID = 1;
const MAX_FILES = 20;
const MAX_FILE_MB = 25;
const NAME_MAX = 255;
const NOTES_MAX = 1000;

const container = () => process.env.VENDOR_DOCUMENTS_CONTAINER || "vendor-documents";

// Documents, images, spreadsheets, email and archives. Anything runnable is refused.
const ALLOWED_EXTENSIONS = new Set([
  ".pdf",
  ".jpg", ".jpeg", ".png", ".gif", ".webp", ".heic", ".heif", ".tif", ".tiff", ".bmp",
  ".doc", ".docx", ".rtf", ".odt", ".txt",
  ".xls", ".xlsx", ".csv", ".ods",
  ".ppt", ".pptx",
  ".msg", ".eml",
  ".zip",
]);

// Stored content type by extension. Browsers often send Office, Outlook and
// HEIC files as application/octet-stream, so the extension decides.
const CONTENT_TYPES = {
  ".pdf": "application/pdf",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".heic": "image/heic",
  ".heif": "image/heif",
  ".tif": "image/tiff",
  ".tiff": "image/tiff",
  ".bmp": "image/bmp",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".rtf": "application/rtf",
  ".odt": "application/vnd.oasis.opendocument.text",
  ".txt": "text/plain",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".csv": "text/csv",
  ".ods": "application/vnd.oasis.opendocument.spreadsheet",
  ".ppt": "application/vnd.ms-powerpoint",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".msg": "application/vnd.ms-outlook",
  ".eml": "message/rfc822",
  ".zip": "application/zip",
};

/**
 * Busboy reads multipart file names as latin1, so "Façade.pdf" arrives as
 * "FaÃ§ade.pdf". Re-read it as UTF-8 when that gives a clean result.
 */
function fixFileName(name) {
  const utf8 = Buffer.from(name, "latin1").toString("utf8");
  return utf8 !== name && !utf8.includes("\uFFFD") ? utf8 : name;
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_MB * 1024 * 1024, files: MAX_FILES },
  fileFilter: (req, file, cb) => {
    file.originalname = fixFileName(file.originalname);
    const ext = path.extname(file.originalname).toLowerCase();
    return ALLOWED_EXTENSIONS.has(ext)
      ? cb(null, true)
      : cb(
          Object.assign(
            new Error(`${file.originalname} can't be uploaded. Use a document, image, spreadsheet, email or zip file.`),
            { status: 400 },
          ),
        );
  },
});

/** Run multer, turning its errors into readable 400s. */
const acceptFiles = (req, res, next) =>
  upload.array("files")(req, res, (err) => {
    if (!err) return next();
    const message =
      err.code === "LIMIT_FILE_SIZE"
        ? `Each file has to be under ${MAX_FILE_MB} MB`
        : err.code === "LIMIT_FILE_COUNT"
          ? `Up to ${MAX_FILES} files at a time`
          : err.message;
    res.status(err.status ?? 400).json({ error: message });
  });

const clean = (v) => (typeof v === "string" ? v.trim() : "");

/** Safe characters only in the blob key; the real name is kept in the table. */
const blobKeyName = (name) =>
  name.replace(/[^A-Za-z0-9._-]+/g, "_").replace(/_+/g, "_").slice(-100) || "file";

/** "Bid sheet" + "bid.xlsx" → "Bid sheet.xlsx", for the downloaded file's name. */
function downloadName(doc) {
  const ext = path.extname(doc.file_name);
  return ext && !doc.name.toLowerCase().endsWith(ext.toLowerCase()) ? `${doc.name}${ext}` : doc.name;
}

/** Content-Disposition that survives commas, quotes and accents in the name. */
function disposition(kind, filename) {
  const ascii = filename.replace(/[^\x20-\x7E]/g, "_").replace(/["\\]/g, "_");
  return `${kind}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

const DOC_SELECT = {
  id: true,
  vendor_id: true,
  name: true,
  file_name: true,
  blob_path: true,
  blob_url: true,
  content_type: true,
  size_bytes: true,
  notes: true,
  created_at: true,
  updated_at: true,
  UploadedBy: { select: { id: true, name: true } },
};

const serialize = ({ blob_path, ...doc }) => doc;

export function registerMiscDocumentRoutes(router, prisma) {
  const findDoc = (vendorId, docId) =>
    prisma.vendorDocuments.findFirst({
      where: { id: docId, vendor_id: vendorId, deleted_at: null },
      select: DOC_SELECT,
    });

  // ── List ──
  router.get("/:id/misc-documents", async (req, res) => {
    try {
      const docs = await prisma.vendorDocuments.findMany({
        where: { vendor_id: Number(req.params.id), deleted_at: null },
        select: DOC_SELECT,
        orderBy: { created_at: "desc" },
      });
      res.json(docs.map(serialize));
    } catch (e) {
      console.error("Error loading vendor documents:", e);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // ── Upload ──
  router.post("/:id/misc-documents", acceptFiles, async (req, res) => {
    const id = Number(req.params.id);
    const userId = Number(req.body.user_id);
    const files = req.files ?? [];
    const notes = clean(req.body.notes) || null;

    let names = [];
    try {
      names = req.body.names ? JSON.parse(req.body.names) : [];
    } catch {
      return res.status(400).json({ error: "The file names didn't come through. Try again." });
    }

    if (!userId) return res.status(400).json({ error: "Missing who's uploading" });
    if (!files.length) return res.status(400).json({ error: "Choose at least one file" });
    if (notes && notes.length > NOTES_MAX) {
      return res.status(400).json({ error: `Keep the note under ${NOTES_MAX} characters` });
    }

    // Display name: what they typed, or the file name without its extension.
    const items = files.map((file, i) => {
      const typed = clean(names[i]);
      const fallback = path.basename(file.originalname, path.extname(file.originalname));
      return { file, name: (typed || fallback || file.originalname).slice(0, NAME_MAX) };
    });

    try {
      const [vendor, user] = await Promise.all([
        prisma.vendors.findUnique({ where: { id }, select: { id: true, company: true } }),
        prisma.employees.findUnique({ where: { id: userId }, select: { id: true } }),
      ]);
      if (!vendor) return res.status(404).json({ error: "Vendor not found" });
      if (!user) return res.status(400).json({ error: "Unknown user" });

      // Upload everything; keep what made it and report what didn't.
      const stamp = Date.now();
      const results = await Promise.allSettled(
        items.map(async ({ file }, i) => {
          const ext = path.extname(file.originalname).toLowerCase();
          const contentType = CONTENT_TYPES[ext] ?? file.mimetype ?? "application/octet-stream";
          const blobPath = `vendors/${id}/misc/${stamp}-${i}-${blobKeyName(file.originalname)}`;
          const url = await uploadToBlob(container(), file.buffer, blobPath, contentType);
          return { blobPath, url, contentType };
        }),
      );

      const uploaded = [];
      const failed = [];
      results.forEach((r, i) => {
        if (r.status === "fulfilled") uploaded.push({ ...items[i], ...r.value });
        else {
          console.error(`Upload of ${items[i].file.originalname} failed:`, r.reason);
          failed.push(items[i].file.originalname);
        }
      });
      if (!uploaded.length) {
        return res.status(502).json({ error: "The upload to storage failed. Try again in a moment.", failed });
      }

      const documents = await prisma.$transaction(async (tx) => {
        const rows = [];
        for (const u of uploaded) {
          rows.push(
            await tx.vendorDocuments.create({
              data: {
                vendor_id: id,
                name: u.name,
                file_name: u.file.originalname.slice(0, NAME_MAX),
                blob_path: u.blobPath,
                blob_url: u.url,
                content_type: u.contentType,
                size_bytes: u.file.size,
                notes,
                uploaded_by: userId,
              },
              select: DOC_SELECT,
            }),
          );
        }
        const list = uploaded.map((u) => u.name).join(", ");
        await logActivity(tx, {
          entityTypeId: VENDOR_ENTITY_TYPE_ID,
          entityId: id,
          fieldChanged: "document",
          previousValue: null,
          newValue: `Uploaded ${uploaded.length === 1 ? "document" : `${uploaded.length} documents`}: ${list}`.slice(0, 255),
          changedBy: userId,
          action: "CREATE",
        });
        return rows;
      });

      res.status(201).json({ documents: documents.map(serialize), failed });
    } catch (e) {
      console.error("Error uploading vendor documents:", e);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // ── Rename / edit the note ──
  router.patch("/:id/misc-documents/:docId", async (req, res) => {
    const id = Number(req.params.id);
    const docId = Number(req.params.docId);
    const b = req.body ?? {};
    const userId = Number(b.user_id);
    const name = clean(b.name);
    const notes = clean(b.notes) || null;

    if (!userId) return res.status(400).json({ error: "Missing who's editing" });
    if (!name) return res.status(400).json({ error: "Give the document a name" });
    if (name.length > NAME_MAX) return res.status(400).json({ error: `Keep the name under ${NAME_MAX} characters` });
    if (notes && notes.length > NOTES_MAX) {
      return res.status(400).json({ error: `Keep the note under ${NOTES_MAX} characters` });
    }

    try {
      const doc = await findDoc(id, docId);
      if (!doc) return res.status(404).json({ error: "Document not found" });
      if (doc.name === name && (doc.notes ?? null) === notes) return res.json(serialize(doc));

      const updated = await prisma.$transaction(async (tx) => {
        const row = await tx.vendorDocuments.update({
          where: { id: docId },
          data: { name, notes },
          select: DOC_SELECT,
        });
        await logActivity(tx, {
          entityTypeId: VENDOR_ENTITY_TYPE_ID,
          entityId: id,
          fieldChanged: "document",
          previousValue: doc.name.slice(0, 255),
          newValue:
            doc.name === name ? `Edited the note on ${name}`.slice(0, 255) : `Renamed to ${name}`.slice(0, 255),
          changedBy: userId,
          action: "UPDATE",
        });
        return row;
      });
      res.json(serialize(updated));
    } catch (e) {
      console.error("Error updating vendor document:", e);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // ── Delete (hide; the file is kept) ──
  router.delete("/:id/misc-documents/:docId", async (req, res) => {
    const id = Number(req.params.id);
    const docId = Number(req.params.docId);
    const userId = Number(req.body?.user_id ?? req.query.user_id);
    if (!userId) return res.status(400).json({ error: "Missing who's deleting" });

    try {
      const doc = await findDoc(id, docId);
      if (!doc) return res.status(404).json({ error: "Document not found" });

      await prisma.$transaction(async (tx) => {
        await tx.vendorDocuments.update({
          where: { id: docId },
          data: { deleted_at: new Date(), deleted_by: userId },
        });
        await logActivity(tx, {
          entityTypeId: VENDOR_ENTITY_TYPE_ID,
          entityId: id,
          fieldChanged: "document",
          previousValue: doc.name.slice(0, 255),
          newValue: `Deleted document: ${doc.name}`.slice(0, 255),
          changedBy: userId,
          action: "DELETE",
        });
      });
      res.json({ id: docId, deleted: true });
    } catch (e) {
      console.error("Error deleting vendor document:", e);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // ── The file itself (view inline, or ?download=1) ──
  router.get("/:id/misc-documents/:docId/file", async (req, res) => {
    try {
      const doc = await prisma.vendorDocuments.findFirst({
        where: { id: Number(req.params.docId), vendor_id: Number(req.params.id), deleted_at: null },
        select: DOC_SELECT,
      });
      if (!doc) return res.status(404).json({ error: "Document not found" });

      const blob = await downloadFromBlob(container(), doc.blob_path);
      if (!blob) return res.status(404).json({ error: "The file is missing from storage" });

      res.setHeader("Content-Type", doc.content_type || blob.contentType || "application/octet-stream");
      if (blob.contentLength != null) res.setHeader("Content-Length", blob.contentLength);
      res.setHeader(
        "Content-Disposition",
        disposition(req.query.download ? "attachment" : "inline", downloadName(doc)),
      );
      res.setHeader("Cache-Control", "private, max-age=300");
      blob.stream.on("error", (e) => {
        console.error("Error streaming vendor document:", e);
        res.destroy(e);
      });
      blob.stream.pipe(res);
    } catch (e) {
      console.error("Error reading vendor document:", e);
      if (!res.headersSent) res.status(500).json({ error: "Internal Server Error" });
    }
  });
}

export default registerMiscDocumentRoutes;
