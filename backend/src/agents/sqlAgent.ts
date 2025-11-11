// src/agent.ts
import { createAgent, humanInTheLoopMiddleware, SystemMessage } from "langchain";
import { MemorySaver } from "@langchain/langgraph";
import { executeSql, readSchema, getWeather } from "./tools";
import { ChatGroq } from "@langchain/groq";
import { getSchema } from "../database/connection";
import 'dotenv/config'; // and set DOTENV_CONFIG_QUIET=true in env
import { randomUUID } from "node:crypto";

let cachedSchema: string | null = null;
const threadId = randomUUID()

async function loadSchema(): Promise<string> {
  if (cachedSchema) return cachedSchema;
  const raw = await getSchema();
  cachedSchema = typeof raw === "string" ? raw : JSON.stringify(raw, null, 2);
  return cachedSchema;
}

export async function systemPromptText(dialect: string, topK = 5): Promise<string> {
  const schema = await loadSchema();

  return `
You are a careful SQLite analyst.

Authoritative schema (do not invent columns/tables):
\`\`\`sql
${schema}
\`\`\`

Given an input question, create a syntactically correct ${dialect} query to run,
then look at the results of the query and return the answer. Unless the user
specifies a specific number of examples they wish to obtain, always limit your
query to at most ${topK} results.

You can order the results by a relevant column to return the most interesting
examples in the database. Never query for all the columns from a specific table,
only ask for the relevant columns given the question.

You MUST double check your query before executing it. If you get an error while
executing a query, rewrite the query and try again.

DO NOT make any DML statements (INSERT, UPDATE, DELETE, DROP etc.) to the database.

To start you should ALWAYS look at the tables in the database to see what you
can query. Do NOT skip this step.

Then you should query the schema of the most relevant tables.

Rules:
- Think step-by-step.
- When you need data, call the tool \`execute_sql\` with ONE SELECT query.
- Read-only only; no INSERT/UPDATE/DELETE/ALTER/DROP/CREATE/REPLACE/TRUNCATE.
- Limit to 5 rows unless user explicitly asks otherwise.
- If the tool returns 'Error:', revise the SQL and try again.
- Limit the number of attempts to 5.
- If you are not successful after 5 attempts, return a note to the user.
- Prefer explicit column lists; avoid SELECT *.
`.trim();
}


export async function buildAgent() {
  const systemPrompt = await systemPromptText("sqlite", 5);

  return createAgent({
    model: new ChatGroq({
      apiKey: process.env.GROQ_API_KEY!,
      model: "llama-3.3-70b-versatile",
    }),
    tools: [readSchema, executeSql, getWeather],
    systemPrompt,
    checkpointer: new MemorySaver(),
  });
}

async function printStream(agent: any, question: string, threadId: string) {
  console.log(`\n🔄 Streaming: "${question}"\n`);

  const stream = await agent.stream(
    { messages: [{ role: "user", content: question }] },
    { streamMode: "values", configurable: { thread_id: threadId } }
  );

  for await (const step of stream) {
    // Each step is an object like { model_output: {...} } or { tool_start: {...} } etc.
    const [event, payload] = Object.entries(step)[0];
    console.log(`👉 ${event}`);
    console.log(JSON.stringify(payload, null, 2));
  }

  console.log("✅ Stream finished.");
}

// tiny demo
async function main() {
  const agent = await buildAgent();
  const threadId = randomUUID(); // reuse for all turns in this run

  // 1) One-shot invoke
  {
    const res = await agent.invoke(
      { messages: [{ role: "user", content: "List 3 tables in the DB." }] },
      { configurable: { thread_id: threadId } }
    );
    console.log("\n🧾 Invoke result:\n", JSON.stringify(res, null, 2));
  }

  // 2) Stream another question
  await printStream(agent, "Which genre, on average, has the longest tracks?", threadId);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

