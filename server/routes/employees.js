import { Router } from "express";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

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

  // POST /api/employees
  router.post("/", async (req, res) => {
    console.log("Body", req.body);
    try {
      const employee = await prisma.employees.create({
        data: req.body,
      });
      console.log("Employee created:", employee);
      res.status(201).json(employee);
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        console.error("Prisma error creating employee:", error);
        res.status(400).json({
          error: "Database Error",
          code: error.code,
          message: error.message,
        });
      } else {
        console.error("Error creating employee:", error);
        res.status(500).json({ error: "Internal Server Error" });
      }
    }
  });

  return router;
}
