import { Router } from "express";

export default function workordersRouter(prisma) {
  const router = Router();

  // GET /api/workorders
  router.get("/", async (req, res) => {
    try {
      const workorders = await prisma.workorders.findMany();
      res.json(workorders);
    } catch (error) {
      console.error("Error fetching workorders:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  return router;
}
