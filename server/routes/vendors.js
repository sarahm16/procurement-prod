import { Router } from "express";

export default function vendorsRouter(prisma) {
  const router = Router();

  // GET /api/vendors
  router.get("/", async (req, res) => {
    try {
      const vendors = await prisma.Vendors.findMany();
      res.json(vendors);
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        console.error("Prisma error fetching vendors:", error);
        res.status(400).json({
          error: "Database Error",
          code: error.code,
          message: error.message,
        });
      } else {
        console.error("Error fetching vendors:", error);
        res.status(500).json({ error: "Internal Server Error" });
      }
    }
  });

  return router;
}
