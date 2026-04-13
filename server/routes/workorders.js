import { Router } from "express";

export default function workordersRouter(prisma) {
  const router = Router();

  // GET /api/workorders
  router.get("/", async (req, res) => {
    try {
      const workorders = await prisma.Workorders.findMany();
      res.json(workorders);
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        console.error("Prisma error fetching workorders:", error);
        res.status(400).json({
          error: "Database Error",
          code: error.code,
          message: error.message,
        });
      } else {
        console.error("Error fetching workorders:", error);
        res.status(500).json({ error: "Internal Server Error" });
      }
    }
  });

  return router;
}
