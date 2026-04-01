import { Router } from "express";

export default function vendorsRouter(prisma) {
  const router = Router();

  // GET /api/vendors
  router.get("/", async (req, res) => {
    try {
      const vendors = await prisma.vendors.findMany();
      res.json(vendors);
    } catch (error) {
      console.error("Error fetching vendors:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  return router;
}
