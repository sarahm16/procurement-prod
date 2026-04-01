import { Router } from "express";

export default function sitesRouter(prisma) {
  const router = Router();

  // GET /api/sites
  router.get("/", async (req, res) => {
    try {
      const sites = await prisma.sites.findMany();
      res.json(sites);
    } catch (error) {
      console.error("Error fetching sites:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  return router;
}
