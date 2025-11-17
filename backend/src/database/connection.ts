import Database from "better-sqlite3";
import path from "node:path";
import { fileURLToPath } from "node:url";
import "dotenv/config";

// Recreate __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.resolve(__dirname, "netflixdb.sqlite");
export const db = new Database(dbPath);

export function getSchema() : string{
  const rows = db.prepare(
    "SELECT sql FROM sqlite_master WHERE type='table' AND sql IS NOT NULL"
  ).all() as { sql: string }[];

  return rows.map(r => r.sql).join("\n\n");
}

// console.log("DB opened at:", db.name);

// const schema = getSchema();
// console.log("\n=== SCHEMA ===\n");
// console.log(schema);