import dotenv from "dotenv";

dotenv.config();

import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

// Routes
import clientsRouter from "./routes/clients.js";
import serviceLinesRouter from "./routes/serviceLines.js";
import tradesRouter from "./routes/trades.js";
import softwaresRouter from "./routes/softwares.js";
import vendorStatusesRouter from "./routes/vendorStatuses.js";
import vendorsRouter from "./routes/vendors.js";
import rolesRouter from "./routes/roles.js";
import employeesRouter from "./routes/employees.js";
import notesRouter from "./routes/notes.js";

// Dynamic import for PrismaClient to avoid issues with top-level await in CommonJS
const { PrismaClient } = await import("@prisma/client");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

const app = express();
const PORT = 3001;

app.use(express.json());

if (process.env.NODE_ENV !== "production") {
  app.use(cors({ origin: "http://localhost:5174" }));
}

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.use("/api/clients", clientsRouter(prisma));
app.use("/api/softwares", softwaresRouter(prisma));
app.use("/api/serviceLines", serviceLinesRouter(prisma));
app.use("/api/trades", tradesRouter(prisma));
app.use("/api/vendorStatuses", vendorStatusesRouter(prisma));
app.use("/api/vendors", vendorsRouter(prisma));
app.use("/api/roles", rolesRouter(prisma));
app.use("/api/employees", employeesRouter(prisma));
app.use("/api/notes", notesRouter(prisma));

// Catch-all LAST — hands everything else to React Router
app.get("/*splat", (req, res) => {
  res.sendFile(path.join(__dirname, "../apps/ops/dist/index.html"));
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
