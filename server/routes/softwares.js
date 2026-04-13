import { Router } from "express";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

export default function softwaresRouter(prisma) {
  const router = Router();

  // GET /api/softwares
  router.get("/", async (req, res) => {
    try {
      const softwares = await prisma.Softwares.findMany();
      res.json(softwares);
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        console.error("Prisma error fetching softwares:", error);
        res.status(400).json({
          error: "Database Error",
          code: error.code,
          message: error.message,
        });
      } else {
        console.error("Error fetching softwares:", error);
        res.status(500).json({ error: "Internal Server Error" });
      }
    }
  });

  // POST /api/softwares
  router.post("/", async (req, res) => {
    console.log("Body", req.body);
    try {
      const software = await prisma.softwares.create({
        data: req.body,
      });
      console.log("Software created:", software);
      res.status(201).json(software);
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        console.error("Prisma error creating software:", error);
        res.status(400).json({
          error: "Database Error",
          code: error.code,
          message: error.message,
        });
      } else {
        console.error("Error creating software:", error);
        res.status(500).json({ error: "Internal Server Error" });
      }
    }
  });

  return router;
}
