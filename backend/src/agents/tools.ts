// src/tools.ts
import { tool } from "langchain";
import * as z from "zod";
import { getDb, getSchema } from "../database/connection";

// --- example non-DB tool ---
export const getWeather = tool(
  ({ city }) => `It's always sunny in ${city}!`,
  {
    name: "get_weather",
    description: "Get the weather for a given city",
    schema: z.object({ city: z.string() }),
  }
);

// --- simple SQL sanitizer (read-only) ---
const DENY_RE = /\b(INSERT|UPDATE|DELETE|ALTER|DROP|CREATE|REPLACE|TRUNCATE|ATTACH|DETACH|PRAGMA)\b/i;
const HAS_LIMIT_TAIL_RE = /\blimit\b\s+\d+(\s*,\s*\d+)?\s*;?\s*$/i;

function sanitizeSqlQuery(q: string): string {
  let query = q.trim();

  // block multiple statements (allow one optional trailing ;)
  const semis = [...query].filter((c) => c === ";").length;
  if (semis > 1 || (query.endsWith(";") && query.slice(0, -1).includes(";"))) {
    throw new Error("Multiple statements are not allowed.");
  }
  query = query.replace(/;+\s*$/g, "").trim();

  // read-only gate (handle comments/leading parens lightly)
  const stripped = query
    .replace(/(--.*$)|\/\*[\s\S]*?\*\//gm, "")
    .trim()
    .replace(/^\(+/, "");

  if (!/^select\b/i.test(stripped)) {
    throw new Error("Only SELECT statements are allowed.");
  }
  if (DENY_RE.test(query)) {
    throw new Error("DML/DDL detected. Only read-only queries are permitted.");
  }

  if (!HAS_LIMIT_TAIL_RE.test(query)) {
    query = query.replace(/\s+$/g, "") + " LIMIT 5";
  }
  return query;
}

// --- DB tools ---

// ✅ No transforms; allow {} or null
const NoArgs = z.union([z.object({}).strict(), z.null()]).optional();

export const readSchema = tool(
  async () => {
    const raw = await getSchema();
    return typeof raw === "string" ? raw : JSON.stringify(raw, null, 2);
  },
  {
    name: "read_schema",
    description: "Read the database schema (tables and columns).",
    schema: NoArgs, // 👈 no transform here
  }
);

export const executeSql = tool(
  async ({ query }) => {
    const q = sanitizeSqlQuery(query);
    const db = await getDb();
    const result = await db.run(q); // SqlDatabase.run returns rows/JSON string depending on impl
    return typeof result === "string" ? result : JSON.stringify(result, null, 2);
  },
  {
    name: "execute_sql",
    description:
      "Execute a READ-ONLY SQLite SELECT query and return results. Must only be SELECT.",
    schema: z.object({
      query: z.string().describe("SQLite SELECT query to execute (read-only)."),
    }),
  }
);
