import { Router } from "express";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

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

const serializeVendor = (vendor, notes) => {
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
  };
};

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
      res.json(vendors.map((vendor) => serializeVendor(vendor, [])));
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
      const [vendor, notes] = await Promise.all([
        prisma.vendors.findUnique({
          where: { id: Number(id) },
          include: {
            VendorStatus: true,
            VendorTrades: {
              include: { Trade: true },
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
      ]);
      res.json(serializeVendor(vendor, notes));
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

      const createdActivity = await prisma.activityLog.create({
        data: {
          entity_type_id: 1,
          entity_id: createdVendor.id,
          action: "CREATE",
          new_value: vendorData?.company,
          changed_by: user_id || null,
        },
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

  // POST /api/vendors/:id/trades/:tid - associate a trade with a vendor
  router.post("/:id/trades/:tid", async (req, res) => {
    const { id, tid } = req.params;
    console.log(`Adding trade ${tid} to vendor ${id}`);
    try {
      const association = await prisma.vendorTrades.create({
        data: {
          vendor_id: Number(id),
          trade_id: Number(tid),
        },
      });
      console.log("Association created:", association);
      res.status(201).json(association);
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
    console.log(`Removing trade ${tid} from vendor ${id}`);
    try {
      const association = await prisma.vendorTrades.delete({
        where: {
          vendor_id_trade_id: {
            vendor_id: Number(id),
            trade_id: Number(tid),
          },
        },
      });
      console.log("Association removed:", association);
      res.status(200).json(association);
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        console.error("Prisma error removing association:", error);
        res.status(400).json({
          error: "Database Error",
          code: error.code,
          message: error.message,
        });
      } else {
        console.error("Error removing association:", error);
        res.status(500).json({ error: "Internal Server Error" });
      }
    }
  });

  return router;
}
