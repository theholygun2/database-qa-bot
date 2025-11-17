// src/agent.ts
import { createAgent, humanInTheLoopMiddleware } from "langchain";
import { interrupt, MemorySaver } from "@langchain/langgraph";
import { ChatGroq } from "@langchain/groq";
import 'dotenv/config'; // and set DOTENV_CONFIG_QUIET=true in env
import {searchDatabase} from "./tools"
import { getSchema } from "../database/connection";


const config = {
  dialect: "sqlite",
  top_k: 5,
};

const schema = getSchema();
const memory = new MemorySaver();

const system_prompt = `
You are an agent designed to interact with a SQL database.
Given an input question, create a syntactically correct ${config.dialect} query to run,
then look at the results of the query and return the answer. Unless the user
specifies a specific number of examples they wish to obtain, always limit your
query to at most ${config.top_k} results.

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

The database schema is:

${schema}
`;

export const agent = createAgent({
  model: new ChatGroq({ model: "llama-3.3-70b-versatile" }),
  tools: [searchDatabase],
  systemPrompt: system_prompt,
  checkpointer: memory,
  middleware: []
});

function getFinalResponse(result: any): string {
  const lastMessage = result.messages[result.messages.length - 1];
  return lastMessage.content || "No response content";
}

// const input = `Do you know whos eminem is?`;
// const result = await agent.invoke({ messages: [{ role: "user", content: input }] });

// const response = getFinalResponse(result);
// console.log(response);