import { Router } from "express";

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
      console.error("Error fetching serviceLines:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  return router;
}
