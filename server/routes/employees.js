import { Router } from "express";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

import { DefaultAzureCredential } from "@azure/identity";
import { Client } from "@microsoft/microsoft-graph-client";
import { TokenCredentialAuthenticationProvider } from "@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials/index.js";
import axios from "axios";

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
    // internal trigger auth (timer or admin button)
    if (req.headers["x-sync-secret"] !== process.env.SYNC_SECRET) {
      return res.status(401).end();
    }

    try {
      // --- get token (extract to services/graph later) ---
      const tokenResponse = await axios.post(
        `https://login.microsoftonline.com/${process.env.AZURE_EVB_TENANT_ID}/oauth2/v2.0/token`,
        new URLSearchParams({
          scope: "https://graph.microsoft.com/.default",
          grant_type: "client_credentials",
          client_id: process.env.AZURE_EMPLOYEES_SYNC_CLIENT_ID,
          client_secret: process.env.AZURE_EMPLOYEES_SYNC_CLIENT_SECRET,
        }),
        { headers: { "Content-Type": "application/x-www-form-urlencoded" } },
      );
      // NOTE: do not log tokenResponse.data — it contains the access token

      // --- fetch group members (paginate — see note) ---
      const msUsers = await axios.get(
        `https://graph.microsoft.com/v1.0/groups/${process.env.AZURE_EVB_GROUP_ID}/members`,
        {
          headers: {
            Authorization: `Bearer ${tokenResponse.data.access_token}`,
          },
        },
      );

      const members = msUsers.data.value ?? [];

      // SAFETY: never let an empty/failed fetch terminate everyone
      if (members.length === 0) {
        throw new Error("Graph returned no members — aborting sync");
      }

      const sqlUsers = await prisma.employees.findMany();
      const memberIds = new Set(members.map((m) => m.id));

      const newEmployees = members
        .filter((m) => !sqlUsers.some((e) => e.ms_user_id === m.id))
        .map((m) => ({
          email: m.mail,
          ms_user_id: m.id,
          name: m.displayName,
          terminated: false,
        }));

      const newlyTerminated = sqlUsers
        .filter((e) => !e.terminated && !memberIds.has(e.ms_user_id))
        .map((e) => e.id);

      const reactivated = sqlUsers
        .filter((e) => e.terminated && memberIds.has(e.ms_user_id))
        .map((e) => e.id);

      const result = await prisma.$transaction(async (tx) => {
        const created = await tx.employees.createMany({ data: newEmployees });
        const terminated = await tx.employees.updateMany({
          where: { id: { in: newlyTerminated } },
          data: { terminated: true },
        });
        const restored = await tx.employees.updateMany({
          where: { id: { in: reactivated } },
          data: { terminated: false },
        });
        return {
          created: created.count,
          terminated: terminated.count,
          reactivated: restored.count,
        };
      });

      console.log("Employee sync:", result); // counts only, no PII/tokens
      res.json(result);
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        console.error("Prisma error syncing employees:", error.code);
        res.status(400).json({ error: "Database Error", code: error.code });
      } else {
        console.error("Error syncing employees:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
      }
    }
  });

  return router;
}
