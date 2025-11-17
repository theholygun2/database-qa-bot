import { ReadLine } from "readline";
import { randomUUID } from "node:crypto";
import readline from "node:readline"
import { agent } from "./Agent";

const threadId = randomUUID();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function ask(question: string): Promise<string> {
  return new Promise((resolve) => rl.question(question, resolve));
}

// async function chatLoop() {
//   console.log("💬 CLI Chat Started — type 'exit' to quit\n");

//   while (true) {
//     const input = await ask("> ");

//     if (!input.trim()) continue;
//     if (input.toLowerCase() === "exit") break;

//     // STREAMING VERSION (typing effect)
//     const stream = await agent.stream({
//       messages: [{ role: "user", content: input }],
//     }, {configurable: {thread_id: threadId}});

//     process.stdout.write("AI: ");
//     for await (const chunk of stream) {
//       if (typeof chunk?.content === "string") {
//         process.stdout.write(chunk.content);
//       }
//     }
//     console.log("\n");
//   }

//   rl.close();
//   process.exit(0);
// }


async function chatLoop() {
  console.log("💬 CLI Chat Started — type 'exit' to quit\n");

  while (true) {
    const input = await ask("> ");

    if (!input.trim()) continue;
    if (input.toLowerCase() === "exit") break;

    try {
      const result = await agent.invoke(
        {
          messages: [{ role: "user", content: input }],
        },
        { configurable: { thread_id: threadId } }
      );

      console.log("\n=== DEBUG: Full result ===");
      console.log(JSON.stringify(result, null, 2));
      console.log("=== END DEBUG ===\n");

      const messages = result.messages;
      const lastMessage = messages[messages.length - 1];
      
      console.log("AI:", lastMessage.content || "(no content)");
    } catch (error) {
      console.error("Error:", error);
    }
    
    console.log("\n");
  }

  rl.close();
  process.exit(0);
}

chatLoop();