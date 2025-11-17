import * as z from "zod"
import { tool } from "langchain"
import {db} from "../database/connection"

export const searchDatabase= tool(
  ({ sql }) => {
    const result = db.prepare(sql).all();
    return JSON.stringify({ rows: result });
  },
  {
    name: "run_sql_query",
    description: "Execute SQL on the Chinook database and return results.",
    schema: z.object({
      sql: z.string(),
    }),
  }
);

