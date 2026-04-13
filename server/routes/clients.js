import { Router } from "express";

export default function clientsRouter(prisma) {
  const router = Router();

  // GET /api/clients
  router.get("/", async (req, res) => {
    try {
      const clients = await prisma.clients.findMany();
      res.json(clients);
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        console.error("Prisma error fetching clients:", error);
        res.status(400).json({
          error: "Database Error",
          code: error.code,
          message: error.message,
        });
      } else {
        console.error("Error fetching clients:", error);
        res.status(500).json({ error: "Internal Server Error" });
      }
    }
  });

  return router;
}
