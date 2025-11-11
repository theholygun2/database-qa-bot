// src/cli.ts
import "dotenv/config";
import { randomUUID } from "node:crypto";
import readline from "node:readline";
import { buildAgent } from "./sqlAgent";
const agent = await buildAgent();

async function streamAnswer(question: string, threadId: string) {

  const stream = await agent.stream(
    { messages: [{ role: "user", content: question }] },
    { streamMode: "values", configurable: { thread_id: threadId } }
  );

  for await (const step of stream) {
    // print only the most recent message if present
    const messages = (step as any).messages;
    if (Array.isArray(messages) && messages.length) {
      const last = messages[messages.length - 1];
      if (last.role === "assistant" || last.role === "tool") {
        const content =
          typeof last.content === "string"
            ? last.content
            : JSON.stringify(last.content, null, 2);
        console.log(content);
      }
    }
  }
}

async function main() {
  const threadId = randomUUID(); // reuse for the whole chat session
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
  });

  console.log("💬 interactive DB assistant");
  console.log("type /exit to quit.\n");

  const ask = (q: string) =>
    new Promise<string>((resolve) => rl.question(q, resolve));

  while (true) {
    const user = (await ask("> ")).trim();
    if (!user) continue;
    if (user === "/exit") break;

    try {
      await streamAnswer(user, threadId);
      console.log(""); // spacing
    } catch (err: any) {
      console.error("❌ error:", err?.message ?? String(err));
    }
  }

  rl.close();
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
