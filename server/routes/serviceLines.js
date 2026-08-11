import { Router } from "express";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import serializeServiceLine from "../serializer/serviceLineSerializer.js";

export default function serviceLinesRouter(prisma) {
  const router = Router();

  // GET /api/serviceLines
  router.get("/", async (req, res) => {
    try {
      const serviceLines = await prisma.ServiceLines.findMany({
        include: {
          ServiceLineServices: true,
        },
      });
      res.json(serviceLines.map(serializeServiceLine));
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        console.error("Prisma error fetching service lines:", error);
        res.status(400).json({
          error: "Database Error",
          code: error.code,
          message: error.message,
        });
      } else {
        console.error("Error fetching service lines:", error);
        res.status(500).json({ error: "Internal Server Error" });
      }
    }
  });

  // POST /api/serviceLines
  router.post("/", async (req, res) => {
    console.log("Body", req.body);
    try {
      const serviceLine = await prisma.serviceLines.create({
        data: req.body,
      });
      console.log("Service line created:", serviceLine);
      res.status(201).json(serviceLine);
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        console.error("Prisma error creating service line:", error);
        res.status(400).json({
          error: "Database Error",
          code: error.code,
          message: error.message,
        });
      } else {
        console.error("Error creating service line:", error);
        res.status(500).json({ error: "Internal Server Error" });
      }
    }
  });

  // POST /api/serviceLines/:id/serviceLineServices
  router.post("/:id/serviceLineServices", async (req, res) => {
    const { id } = req.params;
    const { ...body } = req.body;
    try {
      const data = {
        name: body.name,
        service_line_id: parseInt(id, 10),
      };
      const serviceLineService = await prisma.serviceLineServices.create({
        data,
      });
      console.log("Service line service created:", serviceLineService);
      res.status(201).json(serviceLineService);
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        console.error("Prisma error creating service line service:", error);
        res.status(400).json({
          error: "Database Error",
          code: error.code,
          message: error.message,
        });
      } else {
        console.error("Error creating service line service:", error);
        res.status(500).json({ error: "Internal Server Error" });
      }
    }
  });

  // DELETE /api/serviceLines/:id/serviceLineServices/:sid
  router.delete("/serviceLineServices/:sid", async (req, res) => {
    const { sid } = req.params;
    try {
      const deletedService = await prisma.serviceLineServices.delete({
        where: {
          id: Number(sid),
        },
      });
      console.log("Service line service deleted:", deletedService);
      res.status(200).json(deletedService);
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        console.error("Prisma error deleting service line service:", error);
        res.status(400).json({
          error: "Database Error",
          code: error.code,
          message: error.message,
        });
      } else {
        console.error("Error deleting service line service:", error);
        res.status(500).json({ error: "Internal Server Error" });
      }
    }
  });

  return router;
}
