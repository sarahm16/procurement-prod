import { Router } from "express";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { logActivity } from "../utils/logActivity.js";

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
    const { user_id, ...body } = req.body;
    const roleAssignment = {
      entity_type_id: body.entity_type_id,
      entity_id: body.entity_id,
      internal_role_id: body.internal_role_id,
      employee_id: body.employee_id,
    };

    try {
      const role = await prisma.$transaction(async (tx) => {
        const created = await tx.roleAssignments.create({
          data: roleAssignment,
          include: { Role: true, Employee: true },
        });

        await logActivity(tx, {
          // log against the ASSIGNED entity (the client/contract/site), not a role entity
          entityTypeId: created.entity_type_id,
          entityId: created.entity_id,
          fieldChanged: "role_assignment",
          previousValue: null,
          newValue: `Assigned ${created.Employee?.name ?? "employee"} as ${created.Role?.name ?? "role"}`,
          changedBy: user_id ?? null,
          action: "ASSIGN",
        });

        return created;
      });

      res.status(201).json(role);
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        console.error("Prisma error creating role assignment:", error);
        res
          .status(400)
          .json({
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

  // DELETE /api/roleAssignments/:id
  router.delete("/:id", async (req, res) => {
    const { id } = req.params;
    const { user_id } = req.body;

    try {
      await prisma.$transaction(async (tx) => {
        // fetch BEFORE deleting — need the details for the log entry
        const existing = await tx.roleAssignments.findUnique({
          where: { id: Number(id) },
          include: { Role: true, Employee: true },
        });

        if (!existing) {
          // throw to abort the transaction; caught below as a 404
          const err = new Error("Role assignment not found");
          err.statusCode = 404;
          throw err;
        }

        await tx.roleAssignments.delete({ where: { id: Number(id) } });

        await logActivity(tx, {
          entityTypeId: existing.entity_type_id,
          entityId: existing.entity_id,
          fieldChanged: "role_assignment",
          previousValue: `Removed ${existing.Employee?.name ?? "employee"} as ${existing.Role?.name ?? "role"}`,
          newValue: null,
          changedBy: user_id ?? null,
          action: "REMOVE",
        });
      });

      res.status(204).end();
    } catch (error) {
      if (error.statusCode === 404) {
        return res.status(404).json({ error: "Role assignment not found" });
      }
      if (error instanceof PrismaClientKnownRequestError) {
        console.error("Prisma error deleting role assignment:", error);
        res
          .status(400)
          .json({
            error: "Database Error",
            code: error.code,
            message: error.message,
          });
      } else {
        console.error("Error deleting role assignment:", error);
        res.status(500).json({ error: "Internal Server Error" });
      }
    }
  });

  return router;
}
