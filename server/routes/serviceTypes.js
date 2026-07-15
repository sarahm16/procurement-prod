import { Router } from "express";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

export default function serviceTypesRouter(prisma) {
  const router = Router();

  // GET /api/service-types

  router.get("/", async (req, res) => {
    try {
      const serviceTypes = await prisma.ServiceTypes.findMany();
      res.json(serviceTypes);
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        console.error("Prisma error fetching service types:", error);
        res.status(400).json({
          error: "Database Error",
          code: error.code,
          message: error.message,
        });
      } else {
        console.error("Error fetching service types:", error);
        res.status(500).json({ error: "Internal Server Error" });
      }
    }
  });

  // POST /api/service-types
  router.post("/", async (req, res) => {
    console.log("Body", req.body);
    try {
      const serviceType = await prisma.ServiceTypes.create({
        data: req.body,
      });
      console.log("Service type created:", serviceType);
      res.status(201).json(serviceType);
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        console.error("Prisma error creating service type:", error);
        res.status(400).json({
          error: "Database Error",
          code: error.code,
          message: error.message,
        });
      } else {
        console.error("Error creating service type:", error);
        res.status(500).json({ error: "Internal Server Error" });
      }
    }
  });

  return router;
}
