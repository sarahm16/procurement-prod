import { Router } from "express";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

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
      res.json(serviceLines);
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

  return router;
}
