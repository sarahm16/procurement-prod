import dotenv from "dotenv";

dotenv.config();

import express from "express";
import cors from "cors";
// import path from "path";
// import { fileURLToPath } from "url";

// app service object id (principal id): 665ddbea-342d-4a6c-ba90-86d7b9769cb9

// Routes
import clientsRouter from "./routes/clients.js";
import webhooksRouter from "./routes/webhooks/index.js";
import serviceLinesRouter from "./routes/serviceLines.js";
import tradesRouter from "./routes/trades.js";
import softwaresRouter from "./routes/softwares.js";
import vendorStatusesRouter from "./routes/vendorStatuses.js";
import vendorsRouter from "./routes/vendors.js";
import rolesRouter from "./routes/roles.js";
import employeesRouter from "./routes/employees.js";
import notesRouter from "./routes/notes.js";
import contactRolesRouter from "./routes/contactRoles.js";
import serviceTypesRouter from "./routes/serviceTypes.js";
import contractsRouter from "./routes/contracts.js";
import sitesRouter from "./routes/sites.js";
import internalRolesRouter from "./routes/internalRoles.js";
import roleEntityTypesRouter from "./routes/roleEntityTypes.js";
import roleAssignmentsRouter from "./routes/roleAssignments.js";
import pandadocRouter from "./routes/pandadoc.js";

import prisma from "./db.js";

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// main app file — mounted once, and NOTE the ordering
app.use("/api/webhooks", webhooksRouter); // raw-body routes

if (process.env.NODE_ENV !== "production") {
  app.use(cors({ origin: "http://localhost:5174" || "http://localhost:5175" }));
}

app.use(express.json());

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
app.use("/api/contactRoles", contactRolesRouter(prisma));
app.use("/api/service-types", serviceTypesRouter(prisma));
app.use("/api/contracts", contractsRouter(prisma));
app.use("/api/sites", sitesRouter(prisma));
app.use("/api/internalRoles", internalRolesRouter(prisma));
app.use("/api/roleEntityTypes", roleEntityTypesRouter(prisma));
app.use("/api/roleAssignments", roleAssignmentsRouter(prisma));
app.use("/api/pandadoc", pandadocRouter);

// Catch-all LAST — hands everything else to React Router
// app.get("/*splat", (req, res) => {
//   res.sendFile(path.join(__dirname, "../apps/ops/dist/index.html"));
// });

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
