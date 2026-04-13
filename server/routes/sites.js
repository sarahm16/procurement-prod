import { Router } from "express";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

export default function sitesRouter(prisma) {
  const router = Router();

  // GET /api/sites
  router.get("/", async (req, res) => {
    try {
      const sites = await prisma.Sites.findMany();
      res.json(sites);
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        console.error("Prisma error fetching sites:", error);
        res.status(400).json({
          error: "Database Error",
          code: error.code,
          message: error.message,
        });
      } else {
        console.error("Error fetching sites:", error);
        res.status(500).json({ error: "Internal Server Error" });
      }
    }
  });

  // POST /api/sites
  router.post("/", async (req, res) => {
    console.log("Body", req.body);
    try {
      const site = await prisma.sites.create({
        data: req.body,
      });
      console.log("Site created:", site);
      res.status(201).json(site);
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        console.error("Prisma error creating site:", error);
        res.status(400).json({
          error: "Database Error",
          code: error.code,
          message: error.message,
        });
      } else {
        console.error("Error creating site:", error);
        res.status(500).json({ error: "Internal Server Error" });
      }
    }
  });

  return router;
}
