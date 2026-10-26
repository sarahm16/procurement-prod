/**
 * Warning notices to a vendor.
 *
 *   POST /api/vendors/:id/notices/warning      (multipart/form-data)
 *     fields: complaint, resolution, deadline, sender_title, sender_phone,
 *             assignment_ids (JSON array), user_id
 *     files:  files[]  — photos (JPG, PNG, GIF, WEBP; up to 15) fill the
 *             notice's image slots; PDFs are attached to the document
 *
 * A warning doesn't take the vendor off anything. It's recorded against the
 * service lines it's about (VendorWarningContractSites), so a site's history
 * can show how many warnings a vendor has had on a line before anyone
 * reaches for the termination form.
 *
 * Sending, in order:
 *   1. Photos go to blob storage, where PandaDoc can fetch them.
 *   2. The PandaDoc notice is created (photos in the slots), PDFs attached,
 *      and sent to the vendor.
 *   3. The warning is recorded with the lines it covers, and logged.
 *
 * The lines to pick from come from GET /api/vendors/:id/notice-options
 * (vendorTerminationRoutes.js).
 *
 * Register on the vendors router:
 *   import { registerWarningRoutes } from "./vendorWarningRoutes.js";
 *   registerWarningRoutes(router, prisma);
 *
 * .env (optional):
 *   PANDADOC_WARNING_TEMPLATE_ID   defaults to the old template
 *   WARNING_IMAGE_CONTAINER        blob container for the photos; must be
 *                                  publicly readable so PandaDoc can fetch
 *                                  them. Defaults to "sarlacc", where the
 *                                  old app put them.
 */
import multer from "multer";
import { logActivity } from "../utils/logActivity.js";
import { uploadToBlob } from "../services/blob/uploadToBlob.js";
import { terminationRecipient } from "../services/pandadoc/send/sendTerminationNotice.js";
import { MAX_IMAGES, sendWarningNotice } from "../services/pandadoc/send/sendWarningNotice.js";
import {
  ASSIGNMENT_SELECT,
  VENDOR_SELECT,
  clean,
  groupBySite,
  liveWhere,
  serializeNotice,
  sitesForNotice,
} from "../services/notices/noticeData.js";

const VENDOR_ENTITY_TYPE_ID = 1;
const SITE_ENTITY_TYPE_ID = 2;
const TEXT_MAX = 1000;
const DEADLINE_MAX = 100;
const MAX_PDFS = 10;
const MAX_FILE_MB = 25;

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const PDF_TYPE = "application/pdf";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_MB * 1024 * 1024, files: MAX_IMAGES + MAX_PDFS },
  fileFilter: (req, file, cb) =>
    IMAGE_TYPES.includes(file.mimetype) || file.mimetype === PDF_TYPE
      ? cb(null, true)
      : cb(Object.assign(new Error(`${file.originalname} isn't a photo or a PDF`), { status: 400 })),
});

/** Run multer, turning its errors into readable 400s. */
const acceptFiles = (req, res, next) =>
  upload.array("files")(req, res, (err) => {
    if (!err) return next();
    const message =
      err.code === "LIMIT_FILE_SIZE"
        ? `Each file has to be under ${MAX_FILE_MB} MB`
        : err.code === "LIMIT_FILE_COUNT"
          ? `Up to ${MAX_IMAGES} photos and ${MAX_PDFS} PDFs`
          : err.message;
    res.status(err.status ?? 400).json({ error: message });
  });

const parseIds = (raw) => {
  try {
    const list = typeof raw === "string" ? JSON.parse(raw) : raw;
    return [...new Set((Array.isArray(list) ? list : []).map(Number))].filter(Number.isInteger);
  } catch {
    return [];
  }
};

export function registerWarningRoutes(router, prisma) {
  router.post("/:id/notices/warning", acceptFiles, async (req, res) => {
    const id = Number(req.params.id);
    const b = req.body ?? {};
    const userId = Number(b.user_id);
    const complaint = clean(b.complaint);
    const resolution = clean(b.resolution);
    const deadline = clean(b.deadline);
    const senderTitle = clean(b.sender_title);
    const senderPhone = clean(b.sender_phone);
    const ids = parseIds(b.assignment_ids);

    const files = req.files ?? [];
    const photos = files.filter((f) => IMAGE_TYPES.includes(f.mimetype));
    const pdfs = files.filter((f) => f.mimetype === PDF_TYPE);

    // ── Check the form ──
    const problems = [];
    if (!userId) problems.push("who's sending it");
    if (!ids.length) problems.push("at least one service line");
    if (!complaint) problems.push("the complaint");
    if (!resolution) problems.push("the resolution expected");
    if (!deadline) problems.push("a deadline");
    if (!senderTitle) problems.push("your title");
    if (!senderPhone) problems.push("your phone number");
    if (problems.length) {
      return res.status(400).json({ error: `Missing ${problems.join(", ")}` });
    }
    if ([complaint, resolution].some((t) => t.length > TEXT_MAX)) {
      return res
        .status(400)
        .json({ error: `Keep the complaint and resolution under ${TEXT_MAX} characters` });
    }
    if (deadline.length > DEADLINE_MAX) {
      return res.status(400).json({ error: `Keep the deadline under ${DEADLINE_MAX} characters` });
    }
    if (photos.length > MAX_IMAGES) {
      return res.status(400).json({
        error: `Only ${MAX_IMAGES} photos fit on the notice. Remove ${photos.length - MAX_IMAGES}.`,
      });
    }
    if (pdfs.length > MAX_PDFS) {
      return res.status(400).json({ error: `Attach up to ${MAX_PDFS} PDFs` });
    }

    try {
      const [vendor, sender, assignments] = await Promise.all([
        prisma.vendors.findUnique({ where: { id }, select: VENDOR_SELECT }),
        prisma.employees.findUnique({
          where: { id: userId },
          select: { id: true, name: true, email: true },
        }),
        prisma.vendorContractSites.findMany({
          where: { ...liveWhere(id), id: { in: ids } },
          select: ASSIGNMENT_SELECT,
        }),
      ]);
      if (!vendor) return res.status(404).json({ error: "Vendor not found" });
      if (!sender) return res.status(400).json({ error: "Unknown sender" });
      if (assignments.length !== ids.length) {
        return res.status(409).json({
          error:
            "Some of those service lines have changed since the form opened. Close it and try again.",
        });
      }
      if (!terminationRecipient(vendor)) {
        return res.status(400).json({
          error:
            "This vendor has no email to send the notice to. Add a primary contact with an email first.",
        });
      }

      const sites = groupBySite(assignments);

      // ── 1. Photos to blob storage ──
      let imageUrls;
      try {
        const container = process.env.WARNING_IMAGE_CONTAINER || "sarlacc";
        const stamp = Date.now();
        imageUrls = await Promise.all(
          photos.map((f, i) =>
            uploadToBlob(
              container,
              f.buffer,
              `vendor-warnings/${id}/${stamp}-${i + 1}-${f.originalname.replace(/[^\w.\-]/g, "_")}`,
              f.mimetype,
            ),
          ),
        );
      } catch (e) {
        console.error("Uploading warning photos failed:", e);
        return res
          .status(502)
          .json({ error: "Couldn't upload the photos, so nothing was sent. Try again." });
      }

      // ── 2. PandaDoc ──
      let sent;
      try {
        sent = await sendWarningNotice(
          vendor,
          {
            complaint,
            resolution,
            deadline,
            sites: sitesForNotice(sites),
            imageUrls,
            pdfs: pdfs.map((f) => ({
              buffer: f.buffer,
              filename: f.originalname,
              mimetype: f.mimetype,
            })),
          },
          { ...sender, title: senderTitle, phone: senderPhone },
          { user_id: userId },
        );
      } catch (e) {
        if (e.needsPandaDocAuth) {
          return res.status(409).json({
            needsPandaDocAuth: true,
            error: "Your PandaDoc connection needs renewing before you can send this.",
          });
        }
        console.error("PandaDoc warning send failed:", e.response?.data ?? e);
        return res.status(502).json({
          error: "PandaDoc didn't accept the notice, so nothing was sent. Try again in a moment.",
        });
      }

      // ── 3. Record it ──
      let record;
      try {
        record = await prisma.$transaction(async (tx) => {
          const warning = await tx.vendorWarnings.create({
            data: {
              vendor_id: id,
              notice_type: "warning",
              pandadoc_id: sent.documentId,
              status: "sent",
              date_sent: new Date(),
              sent_by: userId,
              reason: complaint,
              resolution,
              deadline,
              photo_count: photos.length,
              attachment_count: sent.attached,
              ContractSites: {
                create: assignments.map((a) => ({ vendor_contract_site_id: a.id })),
              },
            },
            include: { SentBy: { select: { id: true, name: true } } },
          });

          const lineCount = assignments.length;
          await logActivity(tx, {
            entityTypeId: VENDOR_ENTITY_TYPE_ID,
            entityId: id,
            fieldChanged: "warning_notice",
            previousValue: null,
            newValue: `Sent warning notice: ${lineCount} service line${lineCount === 1 ? "" : "s"} at ${
              sites.length
            } site${sites.length === 1 ? "" : "s"}. Deadline: ${deadline}`.slice(0, 255),
            changedBy: userId,
            action: "CREATE",
          });
          for (const s of sites) {
            const text = `Warning sent to ${vendor.company} about ${s.lines
              .map((l) => l.service_line)
              .join(", ")}: ${complaint}`;
            await logActivity(tx, {
              entityTypeId: SITE_ENTITY_TYPE_ID,
              entityId: s.site_id,
              fieldChanged: "vendor_warning",
              previousValue: null,
              newValue: text.length > 255 ? `${text.slice(0, 252)}…` : text,
              changedBy: userId,
              action: "CREATE",
            });
          }
          return warning;
        });
      } catch (e) {
        console.error(
          `Warning notice ${sent.documentId} was sent to ${vendor.company} but recording it failed:`,
          e,
        );
        return res.status(500).json({
          error: `The warning was sent to ${vendor.company} (PandaDoc ${sent.documentId}), but saving it here failed. Don't send it again. Ask an admin to record it.`,
          pandadoc_id: sent.documentId,
        });
      }

      res.status(201).json({
        notice: serializeNotice(record),
        recipient: sent.recipient,
        lines: assignments.length,
        sites: sites.length,
        photos: photos.length,
        attachments: sent.attached,
      });
    } catch (e) {
      console.error("Error sending warning notice:", e);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });
}

export default registerWarningRoutes;
