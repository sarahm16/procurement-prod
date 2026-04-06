import { Router } from "express";

export default function softwaresRouter(prisma) {
  const router = Router();

  // GET /api/softwares
  router.get("/", async (req, res) => {
    try {
      const softwares = await prisma.Softwares.findMany();
      res.json(softwares);
    } catch (error) {
      console.error("Error fetching softwares:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  return router;
}
