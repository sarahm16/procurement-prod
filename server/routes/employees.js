import { Router } from "express";

export default function employeesRouter(prisma) {
  const router = Router();

  // GET /api/employees
  router.get("/", async (req, res) => {
    try {
      const employees = await prisma.employees.findMany();
      res.json(employees);
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        console.error("Prisma error fetching employees:", error);
        res.status(400).json({
          error: "Database Error",
          code: error.code,
          message: error.message,
        });
      } else {
        console.error("Error fetching employees:", error);
        res.status(500).json({ error: "Internal Server Error" });
      }
    }
  });

  return router;
}
