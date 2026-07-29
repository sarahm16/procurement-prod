import { Router } from "express";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

import { DefaultAzureCredential } from "@azure/identity";
import { Client } from "@microsoft/microsoft-graph-client";
import { TokenCredentialAuthenticationProvider } from "@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials/index.js";

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

  // GET /api/employees/ms/:id - Fetch employee by Microsoft ID
  router.get("/ms/:id", async (req, res) => {
    try {
      const employee = await prisma.employees.findUnique({
        where: { ms_user_id: req.params.id },
      });
      console.log("Employee fetched by Microsoft ID:", req.params.id);
      res.json(employee);
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

  // POST /api/employees/sync
  router.post("/sync", async (req, res) => {
    // const { newEmployees, terminatedEmployees } = req.body;

    try {
      // const result = await prisma.$transaction(async (tx) => {
      //   const createdCount = await tx.employees.createMany({
      //     data: newEmployees,
      //   });

      //   const terminatedCount = await tx.employees.updateMany({
      //     where: {
      //       id: {
      //         in: terminatedEmployees, // List of IDs of terminated employees in SQL
      //       },
      //     },
      //     data: { terminated: true },
      //   });

      //   return { createdCount, terminatedCount };
      // });
      // res.json(result);

      const credential = new DefaultAzureCredential();
      const authProvider = new TokenCredentialAuthenticationProvider(
        credential,
        {
          scopes: ["https://graph.microsoft.com/.default"],
        },
      );
      const graph = Client.initWithMiddleware({ authProvider });

      const users = await graph
        .api("/groups/4aa44b4c-0655-4769-aae2-9030e4276471/members")
        .get();
      console.log("Users fetched from Microsoft Graph:", users);

      res.json(users);
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        console.error("Prisma error syncing employees:", error);
        res.status(400).json({
          error: "Database Error",
          code: error.code,
          message: error.message,
        });
      } else {
        console.error("Error syncing employees:", error);
        res.status(500).json({ error: "Internal Server Error" });
      }
    }
  });

  return router;
}
