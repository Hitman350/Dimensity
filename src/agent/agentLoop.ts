import type {
  LLMProvider,
  ConversationMessage,
  ToolDeclaration,
} from "../providers/types.js";
import { tools as toolRegistry } from "../tools/allTools.js";

/**
 * Provider-agnostic agent loop. Sends user message, processes function
 * calls recursively until the model produces a final text response.
 *
 * History is mutated in place — it persists across turns for session
 * continuity. Tools are passed per call, not stored.
 */
export async function agentLoop(
  provider: LLMProvider,
  tools: ToolDeclaration[],
  history: ConversationMessage[],
  userMessage: string
): Promise<string> {
  // Append user message to history
  history.push({ role: "user", content: userMessage });

  let response = await provider.chat(history, tools);
  let lastToolResults: string[] = [];

  // Recursive loop — process function calls until text response
  while (response.functionCalls.length > 0) {
    // Add model's response to history (with function calls)
    history.push({
      role: "model",
      content: response.text || "",
      functionCalls: response.functionCalls,
    });

    lastToolResults = [];

    // Execute all tool calls concurrently
    const toolResults = await Promise.all(
      response.functionCalls.map(async (fc) => {
        const toolConfig = toolRegistry[fc.name];

        if (!toolConfig) {
          console.error(`Tool ${fc.name} not found in registry`);
          const errorResult = `Tool ${fc.name} not found`;
          lastToolResults.push(errorResult);
          return { name: fc.name, content: errorResult, callId: fc.id };
        }

        try {
          const output = await toolConfig.handler(fc.args as never);
          const result = String(output);
          lastToolResults.push(result);
          return { name: fc.name, content: result, callId: fc.id };
        } catch (error) {
          const msg =
            error instanceof Error ? error.message : String(error);
          console.error(`Tool ${fc.name} failed: ${msg}`);
          const errorResult = `Error: ${msg}`;
          lastToolResults.push(errorResult);
          return { name: fc.name, content: errorResult, callId: fc.id };
        }
      })
    );

    // Append tool results to history
    for (const result of toolResults) {
      history.push({
        role: "tool",
        name: result.name,
        content: result.content,
        callId: result.callId,
      });
    }

    // Call the provider again
    response = await provider.chat(history, tools);
  }

  // Extract text response, fallback to tool results if empty
  const text = response.text?.trim();

  if (text) {
    history.push({ role: "model", content: text });
    return text;
  }

  // Fallback: if model returned empty text, use the last tool results
  if (lastToolResults.length > 0) {
    const fallback = lastToolResults.join("\n");
    history.push({ role: "model", content: fallback });
    return fallback;
  }

  const noResponse = "No response from model.";
  history.push({ role: "model", content: noResponse });
  return noResponse;
}
