import { Router } from "express";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

// Helper functions
import serializeActivityLogEntry from "../serializer/activityLogSerializer.js";
import { logActivity } from "../utils/logActivity.js";
import serializeContact from "../serializer/serializeContact.js";
import makeContactRoutes from "./makeContactRoutes.js";

const serializeReply = (reply) => {
  return {
    id: reply.id,
    body: reply.body,
    date: reply.date,
    author_name: reply.Author ? reply.Author.name : "Unknown",
  };
};

const serializeNote = (note) => {
  return {
    id: note.id,
    body: note.body,
    date: note.date,
    author_name: note.Author ? note.Author.name : "Unknown",
    priority: note.priority,
    tagged_users: note.NoteTaggedUsers.map((tu) =>
      tu.TaggedUser ? tu.TaggedUser.name : "Unknown",
    ),
    replies: note.Replies.map(serializeReply),
  };
};

const serializeVendor = (vendor, notes, activityLog) => {
  return {
    id: vendor.id,
    company: vendor.company,
    status: vendor.VendorStatus,
    contact_name: vendor.contact_name,
    contact_email: vendor.contact_email,
    contact_phone: vendor.contact_phone,
    contact_phone2: vendor.contact_phone2,
    mailing_address: vendor.mailing_address,
    mailing_address2: vendor.mailing_address2,
    mailing_city: vendor.mailing_city,
    mailing_state: vendor.mailing_state,
    mailing_zipcode: vendor.mailing_zipcode,
    notes: notes.map(serializeNote),
    status: vendor.VendorStatus,
    trades: vendor.VendorTrades.map((vt) => vt.Trade),
    activity_log: activityLog.map(serializeActivityLogEntry),
    contacts: (vendor.Contacts || []).map(serializeContact),
  };
};

const entity_type_id = 1;

export default function vendorsRouter(prisma) {
  const router = Router();

  // GET /api/vendors
  router.get("/", async (req, res) => {
    try {
      const vendors = await prisma.vendors.findMany({
        include: {
          VendorStatus: true,
          VendorTrades: {
            include: { Trade: true },
          },
        },
      });
      res.json(vendors.map((vendor) => serializeVendor(vendor, [], [])));
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        console.error("Prisma error fetching vendors:", error);
        res.status(400).json({
          error: "Database Error",
          code: error.code,
          message: error.message,
        });
      } else {
        console.error("Error fetching vendors:", error);
        res.status(500).json({ error: "Internal Server Error" });
      }
    }
  });

  // GET /api/vendors/:id
  router.get("/:id", async (req, res) => {
    const { id } = req.params;
    try {
      const [vendor, notes, activityLog] = await Promise.all([
        prisma.vendors.findUnique({
          where: { id: Number(id) },
          include: {
            VendorStatus: true,
            VendorTrades: {
              include: { Trade: true },
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
            entity_type_id: 1,
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
            entity_type_id: 1,
            entity_id: Number(id),
          },
          include: {
            Employee: true,
          },
        }),
      ]);
      res.json(serializeVendor(vendor, notes, activityLog));
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        console.error("Prisma error fetching vendor:", error);
        res.status(400).json({
          error: "Database Error",
          code: error.code,
          message: error.message,
        });
      } else {
        console.error("Error fetching vendor:", error);
        res.status(500).json({ error: "Internal Server Error" });
      }
    }
  });

  // POST /api/vendors
  router.post("/", async (req, res) => {
    console.log("Body", req.body);
    try {
      const { trade_ids, user_id, ...vendorData } = req.body; // Extract trade_ids, first activity log, and vendor data
      console.log("Vendor Data:", vendorData);
      console.log("Trade IDs:", trade_ids);

      const createdVendor = await prisma.vendors.create({
        data: vendorData,
      });
      console.log("Vendor created:", createdVendor);

      const createdTrades = await prisma.vendorTrades.createMany({
        data: (trade_ids || []).map((trade_id) => ({
          vendor_id: createdVendor.id,
          trade_id,
        })),
      });
      console.log("Vendor-Trades associations created:", createdTrades.count);

      const createdActivity = await logActivity(prisma, {
        entityTypeId: 1,
        entityId: createdVendor.id,
        action: "CREATE",
        newValue: vendorData?.company,
        changedBy: user_id || null,
      });
      console.log("Activity log created:", createdActivity);

      // Need to save item to activity log as well

      res.status(201).json(createdVendor);
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        console.error("Prisma error creating vendor:", error);
        res.status(400).json({
          error: "Database Error",
          code: error.code,
          message: error.message,
        });
      } else {
        console.error("Error creating vendor:", error);
        res.status(500).json({ error: "Internal Server Error" });
      }
    }
  });

  const ALLOWED_FIELDS = new Set([
    "company",
    "contact_name",
    "contact_phone",
    "contact_phone2",
    "contact_email",
    "quickbooks_id",
    "status_id",
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

  // PUT /api/vendors/:id
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
      const existing = await prisma.vendors.findUnique({
        where: { id: Number(id) },
        select: Object.fromEntries(
          Object.keys(requested).map((k) => [k, true]),
        ),
      });

      if (!existing) return res.status(404).json({ error: "Vendor not found" });

      // Keep only fields whose value actually differs
      const changedFields = Object.entries(requested).filter(
        ([key, value]) => norm(existing[key]) !== norm(value),
      );

      if (changedFields.length === 0) {
        return res.json(existing); // nothing really changed — skip update + log
      }

      const data = Object.fromEntries(changedFields);

      const updatedVendor = await prisma.$transaction(async (tx) => {
        const updated = await tx.vendors.update({
          where: { id: Number(id) },
          data,
          include: {
            VendorStatus: true,
          },
        });

        // For FK fields, show the human label from the included relation
        // instead of the raw id. Falls back to the raw value for scalar fields.
        const displayValue = (key, rawValue) => {
          switch (key) {
            case "status_id":
              return updated.VendorStatus?.name ?? rawValue;
            // add more as needed:
            // case "service_line_id": return updated.ServiceLine?.name ?? rawValue;
            default:
              return rawValue;
          }
        };

        const fieldNames = changedFields.map(([k]) => k);
        const summary = changedFields
          .map(([k, v]) => `${k}: ${displayValue(k, v)}`)
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

      res.json(updatedVendor);
    } catch (error) {
      console.error("Error updating vendor:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // POST /api/vendors/:id/trades/:tid - associate a trade with a vendor
  router.post("/:id/trades/:tid", async (req, res) => {
    const { id, tid } = req.params;
    const { user_id } = req.body;
    console.log(`Adding trade ${tid} to vendor ${id}`);

    try {
      const createdAssociation = await prisma.$transaction(async (tx) => {
        const association = await tx.vendorTrades.create({
          data: {
            vendor_id: Number(id),
            trade_id: Number(tid),
          },
          include: {
            Trade: true,
          },
        });
        console.log("Association created:", association);

        await logActivity(tx, {
          entityTypeId: entity_type_id,
          entityId: Number(id),
          fieldChanged: "trades", // e.g. "mailing_city, mailing_state, lat, lng"
          previousValue: null, // see note below
          newValue: `${association.Trade.name}`,
          changedBy: user_id ?? null,
          action: "ASSIGN",
        });

        return association;
      });
      res.status(201).json(createdAssociation);
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        console.error("Prisma error creating association:", error);
        res.status(400).json({
          error: "Database Error",
          code: error.code,
          message: error.message,
        });
      } else {
        console.error("Error creating association:", error);
        res.status(500).json({ error: "Internal Server Error" });
      }
    }
  });

  // DELETE /api/vendors/:id/trades/:tid - disassociate a trade from a vendor
  router.delete("/:id/trades/:tid", async (req, res) => {
    const { id, tid } = req.params;
    const { user_id } = req.body;
    console.log(`Deleting trade ${tid} from vendor ${id}`);

    try {
      const deletedAssociation = await prisma.$transaction(async (tx) => {
        const association = await tx.vendorTrades.delete({
          where: {
            vendor_id_trade_id: {
              vendor_id: Number(id),
              trade_id: Number(tid),
            },
          },
          include: {
            Trade: true,
          },
        });
        console.log("Association deleted:", association);

        await logActivity(tx, {
          entityTypeId: entity_type_id,
          entityId: Number(id),
          fieldChanged: "trades", // e.g. "mailing_city, mailing_state, lat, lng"
          previousValue: null, // see note below
          newValue: `${association.Trade.name}`,
          changedBy: user_id ?? null,
          action: "REMOVE",
        });

        return association;
      });
      res.status(200).json(deletedAssociation);
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        console.error("Prisma error deleting association:", error);
        res.status(400).json({
          error: "Database Error",
          code: error.code,
          message: error.message,
        });
      } else {
        console.error("Error deleting association:", error);
        res.status(500).json({ error: "Internal Server Error" });
      }
    }
  });

  router.use(
    makeContactRoutes({
      delegate: "vendorContacts",
      entityTypeId: entity_type_id,
      foreignKey: "vendor_id",
    }),
  );

  return router;
}
