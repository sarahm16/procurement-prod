import { Router } from "express";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

export default function rolesRouter(prisma) {
  const router = Router();

  // GET /api/roles
  router.get("/", async (req, res) => {
    try {
      const contactRoles = await prisma.contactRoles.findMany();
      res.json(contactRoles);
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        console.error("Prisma error fetching roles:", error);
        res.status(400).json({
          error: "Database Error",
          code: error.code,
          message: error.message,
        });
      } else {
        console.error("Error fetching roles:", error);
        res.status(500).json({ error: "Internal Server Error" });
      }
    }
  });

  // POST /api/roles
  router.post("/", async (req, res) => {
    console.log("Body", req.body);
    try {
      const role = await prisma.contactRoles.create({
        data: req.body,
      });
      console.log("Role created:", role);
      res.status(201).json(role);
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        console.error("Prisma error creating role:", error);
        res.status(400).json({
          error: "Database Error",
          code: error.code,
          message: error.message,
        });
      } else {
        console.error("Error creating role:", error);
        res.status(500).json({ error: "Internal Server Error" });
      }
    }
  });

  return router;
}
