// npm install @langchain/anthropic to call the model
import { createAgent, humanInTheLoopMiddleware } from "langchain";
import { interrupt, MemorySaver } from "@langchain/langgraph"
import { executeSQL, getWeather } from "./tools";
import { ChatGroq} from "@langchain/groq";
import { SqlDatabase } from "@langchain/classic/sql_db";
import { DataSource } from "typeorm";

const systemPromptText = (dialect: string, topK: number = 5) => `
You are an agent designed to interact with a SQL database.
Given an input question, create a syntactically correct ${dialect} query to run,
then look at the results of the query and return the answer. Unless the user
specifies a specific number of examples they wish to obtain, always limit your
query to at most ${topK} results.

You can order the results by a relevant column to return the most interesting
examples in the database. Never query for all the columns from a specific table,
only ask for the relevant columns given the question.

You MUST double check your query before executing it. If you get an error while
executing a query, rewrite the query and try again.

DO NOT make any DML statements (INSERT, UPDATE, DELETE, DROP etc.) to the
database.

To start you should ALWAYS look at the tables in the database to see what you
can query. Do NOT skip this step.

Then you should query the schema of the most relevant tables.
`;

const agent = createAgent({
  model: new ChatGroq({ apiKey: process.env.GROQ_API_KEY, model: "llama-3.3-70b-versatile"}),
  tools: [getWeather, executeSQL],
  systemPrompt: systemPromptText("postgresql", 5),
   middleware: [
        humanInTheLoopMiddleware({
            interruptOn: {
                write_file: true, // All decisions (approve, edit, reject) allowed
                execute_sql: {
                    allowedDecisions: ["approve", "reject"],
                    // No editing allowed
                    description: "🚨 SQL execution requires DBA approval",
                },
                // Safe operation, no approval needed
                read_data: false,
            },
            // Prefix for interrupt messages - combined with tool name and args to form the full message
            // e.g., "Tool execution pending approval: execute_sql with query='DELETE FROM...'"
            // Individual tools can override this by specifying a "description" in their interrupt config
            descriptionPrefix: "Tool execution pending approval",
        }),
    ],
    checkpointer: new MemorySaver(),
});

console.log(
  await agent.invoke({
    messages: [{ role: "user", content: "What's the weather in Jakarta right now?" }],
  })
);

// for await (const chunk of await agent.stream(
//     { messages: [{ role: "user", content: "Which table has the largest number of entries" }] },
//     { streamMode: "values", context: ""},
// )) {
//     const [step, content] = Object.entries(chunk)[0];
//     console.log(`step: ${step}`);
//     console.log(`content: ${JSON.stringify(content, null, 2)}`);
// }