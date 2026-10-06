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

const entity_type_id = 2; // Site entity type

// ─── Sourcing ────────────────────────────────────────────────────────────────

// Prisma returns Decimal instances, which JSON-stringify to strings. Convert
// for the client so it isn't doing arithmetic on "1250.0000".
const toNumber = (v) => (v == null ? null : Number(v));

const serializeAssignmentPricing = (p) => {
  const vendor_price = toNumber(p.vendor_price);
  const client_price = toNumber(p.ContractSiteServices?.client_price);
  return {
    id: p.id,
    contract_site_service_id: p.contract_site_service_id,
    vendor_price,
    client_price,
    margin:
      vendor_price != null && client_price != null
        ? Number((client_price - vendor_price).toFixed(4))
        : null,
    created_at: p.created_at,
  };
};

// One row of the sourcing tab: a vendor assigned to a contract site.
// `id` is the VendorContractSites id — the handle every mutation uses.
const serializeVendorAssignment = (vcs) => {
  const pricing = (vcs.ServicePricing ?? []).map(serializeAssignmentPricing);
  return {
    id: vcs.id,
    is_primary: vcs.is_primary,
    created_at: vcs.created_at,

    // assignment status (VendorSiteStatuses)
    status_id: vcs.status_id ?? null,
    status: vcs.VendorSiteStatus?.name ?? null,
    status_category: vcs.VendorSiteStatus?.category ?? null,

    // vendor
    vendor_id: vcs.Vendor?.id ?? null,
    company: vcs.Vendor?.company ?? null,
    contact_name: vcs.Vendor?.contact_name ?? null,
    contact_email: vcs.Vendor?.contact_email ?? null,
    contact_phone: vcs.Vendor?.contact_phone ?? null,
    lat: toNumber(vcs.Vendor?.lat),
    lng: toNumber(vcs.Vendor?.lng),

    // company-level status — the eligibility gate, distinct from `status` above
    vendor_status: vcs.Vendor?.VendorStatus?.name ?? null,
    vendor_status_color: vcs.Vendor?.VendorStatus?.color ?? null,

    trades: (vcs.Vendor?.VendorTrades ?? [])
      .map((vt) => vt.Trade?.name)
      .filter(Boolean),

    pricing,
    priced_service_count: pricing.length,
  };
};

// ─── Derived status ──────────────────────────────────────────────────────────
//
// Nothing is stored. A line's status comes from vw_ServiceLineStatus (the
// contract's dates + the contract site's dates) and a site's from
// vw_SiteStatus (rolled up from its lines). Labels and colours live here so
// every endpoint says the same thing.

const LINE_STATUS = {
  active: { name: "Active", color: "#16A34A" },
  upcoming: { name: "Upcoming", color: "#2563EB" },
  removed: { name: "Removed", color: "#6B7280" },
  contract_ended: { name: "Contract ended", color: "#6B7280" },
};

const SITE_STATUS = {
  active: { name: "Active", color: "#16A34A" },
  upcoming: { name: "Upcoming", color: "#2563EB" },
  inactive: { name: "Inactive", color: "#6B7280" },
  none: { name: "No contracts", color: "#9CA3AF" },
};

/**
 * Dates go out as "YYYY-MM-DD", never as Date objects. A DATE column comes
 * back from Prisma as UTC midnight, and `new Date(...)` of that in a browser
 * in Pacific time shows the PREVIOUS day.
 */
const ymd = (d) => (d ? new Date(d).toISOString().slice(0, 10) : null);

/** "YYYY-MM-DD" in → a Date at UTC midnight for a @db.Date column, or null. */
const parseYmd = (v) => {
  if (v === null || v === "") return null;
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return undefined;
  const d = new Date(`${v}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? undefined : d;
};

/** One line, from a vw_ServiceLineStatus row. */
const serializeLine = (l) => {
  const meta = LINE_STATUS[l.status] ?? { name: l.status, color: null };
  return {
    contract_site_id: l.contract_site_id,
    contract_id: l.contract_id,
    service_line: l.service_line,
    service_line_id: l.service_line_id,
    // `status` / `status_color` keep the old shape so existing chips render.
    status: meta.name,
    status_color: meta.color,
    status_key: l.status, // active | upcoming | removed | contract_ended
    is_active: l.is_active,
    is_current: l.is_current,
    starts_on: ymd(l.starts_on),
    ends_on: ymd(l.ends_on),
  };
};

/** The site's rolled-up status, from a vw_SiteStatus row (or none). */
const serializeSiteStatus = (row) => {
  const key = row?.status ?? "none";
  const meta = SITE_STATUS[key] ?? SITE_STATUS.none;
  return {
    // `status` keeps the old object shape — the header reads status.name.
    status: { key, name: meta.name, color: meta.color },
    status_name: meta.name,
    status_color: meta.color,
    status_key: key,
    active_lines: row?.active_lines ?? 0,
    upcoming_lines: row?.upcoming_lines ?? 0,
    ended_lines: row?.ended_lines ?? 0,
    next_start_date: ymd(row?.next_start_date),
    last_end_date: ymd(row?.last_end_date),
  };
};

/** Current lines (active, upcoming) first, then by name. */
const lineOrder = (a, b) =>
  Number(b.is_current) - Number(a.is_current) ||
  (a.service_line ?? "").localeCompare(b.service_line ?? "");

/**
 * Lines for one site. Also attaches `site_end_date` — the date the SITE comes
 * off the contract, as opposed to `ends_on`, which is the earlier of that and
 * the contract's own end. The site profile needs the difference to offer
 * "Cancel removal" only when the site itself is being removed.
 */
async function linesForSite(prisma, siteId) {
  const [rows, own] = await Promise.all([
    prisma.serviceLineStatus.findMany({ where: { site_id: siteId } }),
    prisma.contractSites.findMany({
      where: { site_id: siteId },
      select: { id: true, end_date: true },
    }),
  ]);
  const siteEnd = new Map(own.map((c) => [c.id, ymd(c.end_date)]));
  return rows.sort(lineOrder).map((l) => ({
    ...serializeLine(l),
    site_end_date: siteEnd.get(l.contract_site_id) ?? null,
  }));
}

const serializeSiteSourcing = (contractSites, lineById) =>
  (contractSites ?? []).map((cs) => {
    const vendors = (cs.VendorContractSites ?? []).map(
      serializeVendorAssignment,
    );
    const line = lineById.get(cs.id);
    return {
      contract_site_id: cs.id,
      service_line: cs.Contract?.ServiceLine?.name ?? null,
      service_line_id: cs.Contract?.ServiceLine?.id ?? null,
      status: line?.status ?? null,
      status_color: line?.status_color ?? null,
      status_key: line?.status_key ?? null,
      starts_on: line?.starts_on ?? null,
      ends_on: line?.ends_on ?? null,
      service_count: cs._count?.ContractSiteServices ?? 0,
      vendors,
      vendor_count: vendors.length,
    };
  });

const serializeAttachment = (a) => ({
  id: a.id,
  file_name: a.file_name,
  blob_url: a.blob_url,
  content_type: a.content_type,
  created_at: a.created_at,
  uploaded_by: a.uploaded_by,
});

// Always returns a plain string (or null) — never a Prisma object, so the
// client can render it directly.
const serializeClient = (client) => client?.client ?? null;

/** `lines` = serialized lines for this site; `statusRow` = its vw_SiteStatus row. */
const serializeSite = (site, lines, statusRow) => ({
  ...site,
  service_lines: lines,
  client: serializeClient(site.Client),
  ...serializeSiteStatus(statusRow),
});

const serializeSiteById = (site, lines, statusRow, notes, activityLog) => ({
  ...serializeSite(site, lines, statusRow),
  notes: (notes ?? []).map(serializeNote),
  activity_log: (activityLog ?? []).map(serializeActivityLogEntry),
  contacts: (site.Contacts ?? []).map(serializeContact),
  attachments: (site.Attachments ?? []).map(serializeAttachment),
});

// Treat null / undefined / "" as the same, and trim strings so Char(50)
// padding (mailing_state!) doesn't register as a change.
const norm = (v) => {
  if (v === null || v === undefined) return "";
  return typeof v === "string" ? v.trim() : v;
};

const sendError = (res, error, label) => {
  if (error instanceof PrismaClientKnownRequestError) {
    console.error(`Prisma error ${label}:`, error);
    return res.status(400).json({
      error: "Database Error",
      code: error.code,
      message: error.message,
    });
  }
  console.error(`Error ${label}:`, error);
  return res.status(500).json({ error: "Internal Server Error" });
};

const fmtDay = (ymdStr) =>
  ymdStr
    ? new Date(`${ymdStr}T00:00:00Z`).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      })
    : null;

export default function sitesRouter(prisma) {
  const router = Router();

  // GET /api/sites
  //
  // Every site with its service lines and rolled-up status. The two views are
  // read whole rather than filtered by site id: this endpoint returns every
  // site anyway, and an `in` list of thousands of ids would hit SQL Server's
  // 2,100-parameter limit.
  router.get("/", async (req, res) => {
    try {
      const [sites, lineRows, statusRows] = await Promise.all([
        prisma.Sites.findMany({
          include: { Client: { select: { id: true, client: true } } },
        }),
        prisma.serviceLineStatus.findMany(),
        prisma.siteStatus.findMany(),
      ]);

      const linesBySite = new Map();
      for (const l of lineRows.sort(lineOrder)) {
        if (!linesBySite.has(l.site_id)) linesBySite.set(l.site_id, []);
        linesBySite.get(l.site_id).push(serializeLine(l));
      }
      const statusBySite = new Map(statusRows.map((r) => [r.site_id, r]));

      res.json(
        sites.map((s) =>
          serializeSite(s, linesBySite.get(s.id) ?? [], statusBySite.get(s.id)),
        ),
      );
    } catch (error) {
      sendError(res, error, "fetching sites");
    }
  });

  // GET /api/sites/statuses — the old manual-status picker. Sites no longer
  // have a status you can set, so this answers with what the derived
  // statuses mean instead of 500-ing on a table that's gone. Delete once the
  // frontend stops calling it.
  router.get("/statuses", (req, res) => {
    res.json(
      Object.entries(SITE_STATUS).map(([key, v]) => ({
        key,
        name: v.name,
        color: v.color,
      })),
    );
  });

  // GET /api/sites/:id/sourcing
  router.get("/:id/sourcing", async (req, res) => {
    const siteId = Number(req.params.id);
    try {
      const [contractSites, lines] = await Promise.all([
        prisma.contractSites.findMany({
          where: { site_id: siteId },
          select: {
            id: true,
            _count: { select: { ContractSiteServices: true } },
            Contract: {
              select: { ServiceLine: { select: { id: true, name: true } } },
            },
            VendorContractSites: {
              select: {
                id: true,
                is_primary: true,
                status_id: true,
                created_at: true,
                VendorSiteStatus: {
                  select: { id: true, name: true, category: true },
                },
                Vendor: {
                  select: {
                    id: true,
                    company: true,
                    lat: true,
                    lng: true,
                    contact_name: true,
                    contact_email: true,
                    contact_phone: true,
                    VendorStatus: {
                      select: { id: true, name: true, color: true },
                    },
                    VendorTrades: {
                      select: { Trade: { select: { id: true, name: true } } },
                    },
                  },
                },
                ServicePricing: {
                  select: {
                    id: true,
                    vendor_price: true,
                    contract_site_service_id: true,
                    created_at: true,
                    ContractSiteServices: {
                      select: { id: true, client_price: true },
                    },
                  },
                },
              },
              orderBy: [{ is_primary: "desc" }, { created_at: "asc" }],
            },
          },
          orderBy: { id: "asc" },
        }),
        linesForSite(prisma, siteId),
      ]);

      const lineById = new Map(lines.map((l) => [l.contract_site_id, l]));
      res.json(serializeSiteSourcing(contractSites, lineById));
    } catch (error) {
      sendError(res, error, "fetching site sourcing");
    }
  });

  // GET /api/sites/:id
  router.get("/:id", async (req, res) => {
    const siteId = Number(req.params.id);
    try {
      const [site, lines, statusRow, notes, activityLog] = await Promise.all([
        prisma.Sites.findUnique({
          where: { id: siteId },
          include: {
            Client: { select: { id: true, client: true } },
            Contacts: { include: { ContactRole: true } },
          },
        }),
        linesForSite(prisma, siteId),
        prisma.siteStatus.findFirst({ where: { site_id: siteId } }),
        prisma.notes.findMany({
          where: {
            entity_type_id: entity_type_id, // Site entity type
            entity_id: siteId,
            parent_note_id: null,
          },
          include: {
            Author: true,
            Replies: { include: { Author: true } },
            NoteTaggedUsers: { include: { TaggedUser: true } },
          },
        }),
        prisma.activityLog.findMany({
          where: {
            entity_type_id: entity_type_id, // Site entity type
            entity_id: siteId,
          },
          include: { Employee: true },
        }),
      ]);

      // Without this, a bad id spread `null` and then threw on site.Contacts.
      if (!site) {
        return res.status(404).json({ error: "Site not found" });
      }

      res.json(serializeSiteById(site, lines, statusRow, notes, activityLog));
    } catch (error) {
      sendError(res, error, "fetching site");
    }
  });

  // POST /api/sites
  router.post("/", async (req, res) => {
    // A new site has no contracts, so its status is "No contracts" until it
    // is added to one. Ignore a status_id an old form might still send —
    // the column no longer exists and Prisma would reject the whole create.
    // eslint-disable-next-line no-unused-vars
    const { status_id, ...data } = req.body ?? {};
    try {
      const site = await prisma.Sites.create({
        data,
        include: { Client: { select: { id: true, client: true } } },
      });
      res.status(201).json(serializeSite(site, [], null));
    } catch (error) {
      sendError(res, error, "creating site");
    }
  });

  // GET /api/sites/:id/attachments
  router.get("/:id/attachments", async (req, res) => {
    const { id } = req.params;
    try {
      const attachments = await prisma.siteAttachments.findMany({
        where: { site_id: Number(id) },
        orderBy: { created_at: "desc" },
      });
      res.json(attachments.map(serializeAttachment));
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

      res.status(201).json(created.map(serializeAttachment));
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

  // PUT /api/sites/:id/status — retired. A site's status is worked out from
  // its contracts now; to change it, change a line's dates (below).
  router.put("/:id/status", (req, res) => {
    res.status(410).json({
      error: "Site status can't be set directly",
      message:
        "A site is Active when at least one of its service lines is. Remove a site from a contract with PUT /api/sites/:id/contract-sites/:contractSiteId.",
    });
  });

  // PUT /api/sites/:id/contract-sites/:contractSiteId/status — retired too.
  router.put("/:id/contract-sites/:contractSiteId/status", (req, res) => {
    res.status(410).json({
      error: "Service line status can't be set directly",
      message:
        "Set end_date to remove the site from the contract, or clear it to put the site back: PUT /api/sites/:id/contract-sites/:contractSiteId.",
    });
  });

  // PUT /api/sites/:id/contract-sites/:contractSiteId
  //
  // Body: { start_date?, end_date?, user_id }   dates as "YYYY-MM-DD"
  //
  //   Remove the site from this contract  →  { end_date: "2026-10-31" }
  //     (the LAST day of service; today or a future date both work, and the
  //      line flips to Removed on its own the day after)
  //   Put it back                          →  { end_date: null }
  //   Change when it joined                →  { start_date: "2026-11-01" }
  //
  // Only this site's line changes — the contract and its other sites don't.
  // Vendor assignments, rates and exhibits stay on the row as history, and
  // come back with it if the site is put back.
  //
  // Returns the line (same shape as one element of `service_lines`) plus the
  // site's new rolled-up status, so the page can update without a refetch.
  router.put("/:id/contract-sites/:contractSiteId", async (req, res) => {
    const siteId = Number(req.params.id);
    const contractSiteId = Number(req.params.contractSiteId);
    const { user_id } = req.body ?? {};

    const data = {};
    for (const key of ["start_date", "end_date"]) {
      if (!(key in (req.body ?? {}))) continue;
      const parsed = parseYmd(req.body[key]);
      if (parsed === undefined) {
        return res
          .status(400)
          .json({ error: `${key} must be "YYYY-MM-DD" or null` });
      }
      if (key === "start_date" && parsed === null) {
        return res.status(400).json({ error: "start_date can't be empty" });
      }
      data[key] = parsed;
    }
    if (!Object.keys(data).length) {
      return res.status(400).json({ error: "Send start_date and/or end_date" });
    }

    try {
      const current = await prisma.contractSites.findUnique({
        where: { id: contractSiteId },
        select: {
          id: true,
          site_id: true,
          start_date: true,
          end_date: true,
          Contract: { select: { ServiceLine: { select: { name: true } } } },
        },
      });
      if (!current || current.site_id !== siteId) {
        return res
          .status(404)
          .json({ error: "That service line isn't on this site" });
      }

      const start = data.start_date ?? current.start_date;
      const end = "end_date" in data ? data.end_date : current.end_date;
      if (end && start && end < start) {
        return res
          .status(400)
          .json({ error: "end_date can't be before start_date" });
      }

      const line = current.Contract?.ServiceLine?.name ?? "Service line";
      const before = ymd(current.end_date);
      const after = "end_date" in data ? ymd(data.end_date) : before;

      // Plain-English activity entry: what someone scanning the feed wants.
      let previousValue = null;
      let newValue;
      if (before !== after && after) {
        previousValue = before ? `Ending ${fmtDay(before)}` : "On contract";
        newValue = `${line}: removed from contract — last day ${fmtDay(after)}`;
      } else if (before !== after && !after) {
        previousValue = `Ending ${fmtDay(before)}`;
        newValue = `${line}: back on contract`;
      } else {
        previousValue = ymd(current.start_date);
        newValue = `${line}: start date ${fmtDay(ymd(data.start_date))}`;
      }

      await prisma.$transaction(async (tx) => {
        await tx.contractSites.update({
          where: { id: contractSiteId },
          data,
        });
        await logActivity(tx, {
          entityTypeId: entity_type_id, // 2 = Site
          entityId: siteId,
          fieldChanged: "service_line_dates",
          previousValue,
          newValue,
          changedBy: user_id ?? null,
          action: "UPDATE",
        });
      });

      // Read back through the views so the status is the real one.
      const [lineRow, statusRow] = await Promise.all([
        prisma.serviceLineStatus.findFirst({
          where: { contract_site_id: contractSiteId },
        }),
        prisma.siteStatus.findFirst({ where: { site_id: siteId } }),
      ]);

      res.json({
        line: lineRow
          ? { ...serializeLine(lineRow), site_end_date: ymd(end) }
          : null,
        site: serializeSiteStatus(statusRow),
      });
    } catch (error) {
      sendError(res, error, "updating service line dates");
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
