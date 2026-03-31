import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const PORT = 5000;

app.use(express.json());

if (process.env.NODE_ENV !== "production") {
  app.use(cors({ origin: "http://localhost:5174" }));
}

app.get("/", (req, res) => {
  res.send("Hello World!");
});

// Catch-all LAST — hands everything else to React Router
app.get("/*splat", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/dist/index.html"));
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
