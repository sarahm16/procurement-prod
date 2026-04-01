import { Router } from "express";

export default function clientsRouter(prisma) {
  const router = Router();

  // GET /api/clients
  router.get("/", async (req, res) => {
    try {
      const clients = await prisma.clients.findMany();
      res.json(clients);
    } catch (error) {
      console.error("Error fetching clients:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  return router;
}
