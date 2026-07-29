import { Router } from "express";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

export default function roleEntityTypesRouter(prisma) {
  const router = Router();

  // GET /api/roleEntityTypes
  router.get("/", async (req, res) => {
    try {
      const roles = await prisma.roleEntityTypes.findMany();
      res.json(roles);
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

  // Get roles available for a specific entity type, for example all roles applied to the Client { id: 3 }
  // GET /api/roleEntityTypes/:id
  router.get("/:id", async (req, res) => {
    const { id } = req.params;
    try {
      const roles = await prisma.roleEntityTypes.findMany({
        where: { entity_type_id: Number(id) },
        include: {
          InternalRole: true, // pull the role name, not just the id
        },
      });
      res.json(roles);
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        console.error("Prisma error fetching role:", error);
        res.status(400).json({
          error: "Database Error",
          code: error.code,
          message: error.message,
        });
      } else {
        console.error("Error fetching role:", error);
        res.status(500).json({ error: "Internal Server Error" });
      }
    }
  });

  // POST /api/roleEntityTypes
  router.post("/", async (req, res) => {
    console.log("Body", req.body);
    try {
      const role = await prisma.roleEntityTypes.create({
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
