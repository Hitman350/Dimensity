// ============================================================
// AgentService — Injectable replacement for agentLoop.ts.
// Recursive LLM tool-calling loop using DI-injected
// LLM provider and tool registry.
// ============================================================

import { Injectable, Inject } from '@nestjs/common';
import { LLM_PROVIDER } from '../providers/provider.module';
import type {
  LLMProvider,
  ConversationMessage,
  ToolDeclaration,
} from '../providers/types';
import { ToolRegistryService } from '../tools/tool-registry.service';

@Injectable()
export class AgentService {
  constructor(
    @Inject(LLM_PROVIDER) private readonly provider: LLMProvider,
    private readonly toolRegistry: ToolRegistryService,
  ) {}

  /**
   * Provider-agnostic agent loop. Sends user message, processes function
   * calls recursively until the model produces a final text response.
   *
   * History is mutated in place — it persists across turns for session
   * continuity. Tools are resolved from the registry.
   */
  async processMessage(
    history: ConversationMessage[],
    userMessage: string,
  ): Promise<string> {
    const tools: ToolDeclaration[] = this.toolRegistry.getToolDeclarations();

    // Append user message to history
    history.push({ role: 'user', content: userMessage });

    let response = await this.provider.chat(history, tools);
    let lastToolResults: string[] = [];

    // Recursive loop — process function calls until text response
    while (response.functionCalls.length > 0) {
      // Add model's response to history (with function calls)
      history.push({
        role: 'model',
        content: response.text || '',
        functionCalls: response.functionCalls,
      });

      lastToolResults = [];

      // Execute all tool calls concurrently
      const toolResults = await Promise.all(
        response.functionCalls.map(async (fc) => {
          const result = await this.toolRegistry.executeTool(fc.name, fc.args);
          lastToolResults.push(result);
          return { name: fc.name, content: result, callId: fc.id };
        }),
      );

      // Append tool results to history
      for (const result of toolResults) {
        history.push({
          role: 'tool',
          name: result.name,
          content: result.content,
          callId: result.callId,
        });
      }

      // Call the provider again
      response = await this.provider.chat(history, tools);
    }

    // Extract text response, fallback to tool results if empty
    const text = response.text?.trim();

    if (text) {
      history.push({ role: 'model', content: text });
      return text;
    }

    // Fallback: if model returned empty text, use the last tool results
    if (lastToolResults.length > 0) {
      const fallback = lastToolResults.join('\n');
      history.push({ role: 'model', content: fallback });
      return fallback;
    }

    const noResponse = 'No response from model.';
    history.push({ role: 'model', content: noResponse });
    return noResponse;
  }
}
