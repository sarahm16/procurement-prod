import { Router } from "express";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

export default function contractsRouter(prisma) {
  const router = Router();

  // GET /api/contracts
  router.get("/", async (req, res) => {
    try {
      const contracts = await prisma.Contracts.findMany();
      res.json(contracts);
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        console.error("Prisma error fetching contracts:", error);
        res.status(400).json({
          error: "Database Error",
          code: error.code,
          message: error.message,
        });
      } else {
        console.error("Error fetching contracts:", error);
        res.status(500).json({ error: "Internal Server Error" });
      }
    }
  });

  // GET /api/contracts/:id/sites - fetch sites associated with a contract
  router.get("/:id/sites", async (req, res) => {
    const { id } = req.params;
    try {
      const contractSites = await prisma.ContractSites.findMany({
        where: { contract_id: parseInt(id) },
        include: { Site: true }, // Include the related Site data
      });
      res.json(contractSites);
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        console.error("Prisma error fetching contract sites:", error);
        res.status(400).json({
          error: "Database Error",
          code: error.code,
          message: error.message,
        });
      } else {
        console.error("Error fetching contract sites:", error);
        res.status(500).json({ error: "Internal Server Error" });
      }
    }
  });

  // POST /api/contracts
  router.post("/", async (req, res) => {
    console.log("Body", req.body);
    try {
      const contract = await prisma.Contracts.create({
        data: req.body,
      });
      console.log("Contract created:", contract);
      res.status(201).json(contract);
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        console.error("Prisma error creating contract:", error);
        res.status(400).json({
          error: "Database Error",
          code: error.code,
          message: error.message,
        });
      } else {
        console.error("Error creating contract:", error);
        res.status(500).json({ error: "Internal Server Error" });
      }
    }
  });

  return router;
}
