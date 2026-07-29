import { Router } from "express";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

export default function roleAssignmentsRouter(prisma) {
  const router = Router();

  // GET /api/roleAssignments
  router.get("/", async (req, res) => {
    try {
      const roleAssignments = await prisma.roleAssignments.findMany();
      res.json(roleAssignments);
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        console.error("Prisma error fetching role assignments:", error);
        res.status(400).json({
          error: "Database Error",
          code: error.code,
          message: error.message,
        });
      } else {
        console.error("Error fetching role assignments:", error);
        res.status(500).json({ error: "Internal Server Error" });
      }
    }
  });

  // Get role assignments for a specific entity type and entity type id
  // GET /api/roleAssignments/:etid/:id
  router.get("/:etid/:id", async (req, res) => {
    const { etid, id } = req.params;
    try {
      const roleAssignments = await prisma.roleAssignments.findMany({
        where: { entity_type_id: Number(etid), entity_id: Number(id) },
        include: {
          Role: true, // pull the role name, not just the id
          Employee: true, // pull the employee details, not just the id
        },
      });
      res.json(roleAssignments);
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        console.error("Prisma error fetching role assignments:", error);
        res.status(400).json({
          error: "Database Error",
          code: error.code,
          message: error.message,
        });
      } else {
        console.error("Error fetching role assignments:", error);
        res.status(500).json({ error: "Internal Server Error" });
      }
    }
  });

  // POST /api/roleAssignments
  router.post("/", async (req, res) => {
    console.log("Body", req.body);
    try {
      const role = await prisma.roleAssignments.create({
        data: req.body,
      });
      console.log("Role created:", role);
      res.status(201).json(role);
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        console.error("Prisma error creating role assignment:", error);
        res.status(400).json({
          error: "Database Error",
          code: error.code,
          message: error.message,
        });
      } else {
        console.error("Error creating role assignment:", error);
        res.status(500).json({ error: "Internal Server Error" });
      }
    }
  });

  return router;
}
