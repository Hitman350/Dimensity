import "dotenv/config";
import readline from "readline";
import { createProvider } from "./providers/factory.js";
import { createSigner } from "./signers/factory.js";
import { initSigner } from "./signers/index.js";
import { agentLoop } from "./agent/agentLoop.js";
import { getToolDeclarations } from "./tools/allTools.js";
import type { ConversationMessage } from "./providers/types.js";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (query: string): Promise<string> => {
  return new Promise((resolve) => rl.question(query, resolve));
};

async function main(): Promise<void> {
  try {
    // Initialize signer
    const signer = createSigner();
    initSigner(signer);

    // Initialize LLM provider
    const provider = createProvider();

    // Tool declarations — plain JSON Schema, passed per call
    const tools = getToolDeclarations();

    // Conversation history persists across turns for session continuity
    const history: ConversationMessage[] = [];

    const providerName = process.env.LLM_PROVIDER || "gemini";
    const signerType = process.env.SIGNER_TYPE || "local";
    console.log(
      `Dimensity started [${providerName} | ${signerType}]. Type "exit" to quit.`
    );

    while (true) {
      const userInput = await question("\nYou: ");

      if (userInput.toLowerCase() === "exit") {
        rl.close();
        break;
      }

      try {
        const response = await agentLoop(provider, tools, history, userInput);
        console.log("\nDimensity:", response);
      } catch (error) {
        console.error(
          "Error during chat:",
          error instanceof Error ? error.message : "Unknown error"
        );
        rl.close();
        break;
      }
    }
  } catch (error) {
    console.error(
      "Error in main:",
      error instanceof Error ? error.message : "Unknown error"
    );
    rl.close();
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(
    "Unhandled error:",
    error instanceof Error ? error.message : "Unknown error"
  );
  process.exit(1);
});
