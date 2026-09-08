// scripts/apply-views.js
//
// Applies every .sql file in prisma/sql to the database, in filename order.
//
// Two things this handles that a naive runner doesn't:
//
//  1. GO batch separators. Files are split on GO and each batch is sent on
//     its own, which is what lets a file do "drop if exists, then create" —
//     CREATE VIEW cannot share a batch with the DROP.
//
//  2. Prisma's SQL Server driver parameterizes raw queries, so a batch
//     starting with CREATE VIEW / PROCEDURE / FUNCTION / TRIGGER is rejected
//     with "Incorrect syntax near the keyword 'VIEW'". Those batches get
//     wrapped in sp_executesql, which gives the DDL a clean nested batch.
//     The wrapping (quote escaping, chunking around the 4000-char nvarchar
//     literal limit) happens here so the .sql files stay readable and can
//     still be pasted straight into a SQL client.
//
// Run after `prisma db push`: push does not know views exist, and dropping
// or renaming a referenced column silently invalidates them.

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";

const here = dirname(fileURLToPath(import.meta.url));
const sqlDir = resolve(here, "..", "prisma", "sql");

const DDL =
  /^CREATE\s+(?:OR\s+ALTER\s+)?(?:VIEW|PROC|PROCEDURE|FUNCTION|TRIGGER)\b/i;
const CHUNK = 3000; // stay well under the 4000-char nvarchar literal cap

function batchesOf(sql) {
  return sql
    .split(/^[ \t]*GO[ \t]*;?[ \t]*$/gim)
    .map((b) => b.trim())
    .filter((b) => b.length > 0);
}

function firstCodeLine(batch) {
  for (const line of batch.split("\n")) {
    const t = line.trim();
    if (t && !t.startsWith("--")) return t;
  }
  return "";
}

// DECLARE @sql NVARCHAR(MAX) = N'...'; SET @sql = @sql + N'...'; EXEC sp_executesql @sql;
function wrapDdl(batch) {
  const lines = batch
    .replace(/'/g, "''")
    .split("\n")
    .map((l) => l + "\n");

  const chunks = [];
  let cur = "";
  for (const line of lines) {
    if (cur && cur.length + line.length > CHUNK) {
      chunks.push(cur);
      cur = "";
    }
    cur += line;
  }
  if (cur) chunks.push(cur);

  return (
    chunks
      .map((c, i) =>
        i === 0
          ? `DECLARE @sql NVARCHAR(MAX) = N'${c}';`
          : `SET @sql = @sql + N'${c}';`,
      )
      .join("\n") + "\nEXEC sp_executesql @sql;"
  );
}

async function main() {
  if (!existsSync(sqlDir)) {
    console.error(`No SQL directory found at ${sqlDir}`);
    process.exit(1);
  }

  const files = readdirSync(sqlDir)
    .filter((f) => f.toLowerCase().endsWith(".sql"))
    .sort();

  if (files.length === 0) {
    console.log(`No .sql files in ${sqlDir} — nothing to apply.`);
    return;
  }

  const prisma = new PrismaClient();

  try {
    for (const file of files) {
      const batches = batchesOf(readFileSync(join(sqlDir, file), "utf8"));
      let wrapped = 0;

      for (let i = 0; i < batches.length; i++) {
        const raw = batches[i];
        const isDdl = DDL.test(firstCodeLine(raw));
        if (isDdl) wrapped++;

        try {
          await prisma.$executeRawUnsafe(isDdl ? wrapDdl(raw) : raw);
        } catch (err) {
          console.error(
            `\nFAILED  ${file}${batches.length > 1 ? `  (batch ${i + 1} of ${batches.length})` : ""}`,
          );
          console.error(`        ${firstCodeLine(raw)}\n`);
          console.error(String(err.message).split("\n").slice(0, 8).join("\n"));
          console.error("");
          throw err;
        }
      }

      const note = [
        batches.length > 1 ? `${batches.length} batches` : null,
        wrapped ? `${wrapped} wrapped` : null,
      ]
        .filter(Boolean)
        .join(", ");

      console.log(`  applied  ${file}${note ? `  (${note})` : ""}`);
    }

    console.log(`\n${files.length} file(s) applied.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(() => process.exit(1));
