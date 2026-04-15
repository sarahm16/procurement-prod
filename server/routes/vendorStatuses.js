import { Router } from "express";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

export default function vendorStatusesRouter(prisma) {
  const router = Router();

  // GET /api/vendorStatuses
  router.get("/", async (req, res) => {
    try {
      const vendorStatuses = await prisma.VendorStatuses.findMany();
      res.json(vendorStatuses);
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        console.error("Prisma error fetching vendor statuses:", error);
        res.status(400).json({
          error: "Database Error",
          code: error.code,
          message: error.message,
        });
      } else {
        console.error("Error fetching vendor statuses:", error);
        res.status(500).json({ error: "Internal Server Error" });
      }
    }
  });

  // POST /api/vendorStatuses
  router.post("/", async (req, res) => {
    console.log("Body", req.body);
    try {
      const vendorStatus = await prisma.VendorStatuses.create({
        data: req.body,
      });
      console.log("Vendor status created:", vendorStatus);
      res.status(201).json(vendorStatus);
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        console.error("Prisma error creating vendor status:", error);
        res.status(400).json({
          error: "Database Error",
          code: error.code,
          message: error.message,
        });
      } else {
        console.error("Error creating vendor status:", error);
        res.status(500).json({ error: "Internal Server Error" });
      }
    }
  });

  // PUT /api/vendorStatuses/:id
  router.put("/:id", async (req, res) => {
    const { id } = req.params;
    console.log("Body", req.body); // Log the updates being sent to the server
    try {
      const updatedVendorStatus = await prisma.VendorStatuses.update({
        where: { id: parseInt(id) },
        data: req.body,
      });
      return res.json(updatedVendorStatus);
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        console.error("Prisma error updating vendor status:", error);
        res.status(400).json({
          error: "Database Error",
          code: error.code,
          message: error.message,
        });
      } else {
        console.error("Error updating vendor status:", error);
        res.status(500).json({ error: "Internal Server Error" });
      }
    }
  });

  return router;
}
