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

  return router;
}
