import { Router } from "express";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

export default function vendorsRouter(prisma) {
  const router = Router();

  // GET /api/vendors
  router.get("/", async (req, res) => {
    try {
      const vendors = await prisma.vendors.findMany({
        include: {
          VendorStatuses: true,
          VendorTrades: {
            include: { Trades: true },
          },
        },
      });
      const flatVendors = vendors.map((vendor) => ({
        ...vendor,
        VendorTrades: undefined,
        VendorStatus: undefined,
        trades: vendor.VendorTrades.map((vt) => vt.Trades),
        status: vendor.VendorStatuses,
      }));
      res.json(flatVendors);
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
      const vendor = await prisma.vendors.findUnique({
        where: { id: Number(id) },
        include: { VendorStatuses: true },
      });
      res.json(vendor);
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
      const vendor = await prisma.vendors.create({
        data: req.body,
      });
      console.log("Vendor created:", vendor);
      res.status(201).json(vendor);
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

  return router;
}
