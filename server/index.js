import dotenv from "dotenv";

dotenv.config();

import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
/* 
// Dynamic import for PrismaClient to avoid issues with top-level await in CommonJS
const { PrismaClient } = await import("@prisma/client"); */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let prisma;

try {
  const { PrismaClient } = await import("@prisma/client");
  prisma = new PrismaClient();
} catch (err) {
  console.error("Failed to initialize Prisma:", err);
  process.exit(1);
}

const app = express();
const PORT = 3001;

app.use(express.json());

if (process.env.NODE_ENV !== "production") {
  app.use(cors({ origin: "http://localhost:5174" }));
}

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.get("/api/clients", async (req, res) => {
  try {
    const clients = await prisma.clients.findMany();
    console.log("Fetched clients:", clients);
    res.json(clients);
  } catch (error) {
    console.error("Error fetching clients:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Catch-all LAST — hands everything else to React Router
app.get("/*splat", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/dist/index.html"));
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
