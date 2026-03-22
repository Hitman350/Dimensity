import Anthropic from "@anthropic-ai/sdk";
import type {
  LLMProvider,
  LLMProviderConfig,
  ConversationMessage,
  LLMResponse,
  ToolDeclaration,
  FunctionCall,
} from "./types.js";

export class ClaudeProvider implements LLMProvider {
  private client: Anthropic;
  private model: string;
  private systemInstruction: string;

  constructor(config: LLMProviderConfig) {
    this.client = new Anthropic({ apiKey: config.apiKey });
    this.model = config.model;
    this.systemInstruction = config.systemInstruction;
  }

  async chat(
    history: ConversationMessage[],
    tools: ToolDeclaration[]
  ): Promise<LLMResponse> {
    const messages = this.convertHistory(history);
    const claudeTools = this.convertTools(tools);

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 4096,
      system: this.systemInstruction,
      messages,
      tools: claudeTools,
    });

    const functionCalls: FunctionCall[] = [];
    let text: string | null = null;

    for (const block of response.content) {
      if (block.type === "text") {
        text = block.text;
      } else if (block.type === "tool_use") {
        functionCalls.push({
          id: block.id,
          name: block.name,
          args: block.input as Record<string, unknown>,
        });
      }
    }

    return { text, functionCalls };
  }

  private convertHistory(
    messages: ConversationMessage[]
  ): Anthropic.MessageParam[] {
    const result: Anthropic.MessageParam[] = [];

    for (const msg of messages) {
      if (msg.role === "user") {
        result.push({ role: "user", content: msg.content });
      } else if (msg.role === "model") {
        const content: Anthropic.ContentBlockParam[] = [];
        if (msg.content) {
          content.push({ type: "text", text: msg.content });
        }
        if (msg.functionCalls) {
          for (const fc of msg.functionCalls) {
            content.push({
              type: "tool_use",
              id: fc.id || `call_${fc.name}_${Date.now()}`,
              name: fc.name,
              input: fc.args,
            });
          }
        }
        if (content.length > 0) {
          result.push({ role: "assistant", content });
        }
      } else if (msg.role === "tool") {
        // Claude puts tool results as "user" role with tool_result blocks
        // Merge consecutive tool messages into one user message
        const toolResultBlock: Anthropic.ToolResultBlockParam = {
          type: "tool_result",
          tool_use_id: msg.callId || `call_${msg.name}`,
          content: msg.content,
        };

        const lastMsg = result[result.length - 1];
        if (
          lastMsg &&
          lastMsg.role === "user" &&
          Array.isArray(lastMsg.content)
        ) {
          (lastMsg.content as Anthropic.ContentBlockParam[]).push(
            toolResultBlock
          );
        } else {
          result.push({ role: "user", content: [toolResultBlock] });
        }
      }
    }

    return result;
  }

  private convertTools(tools: ToolDeclaration[]): Anthropic.Tool[] {
    return tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      input_schema: {
        type: "object" as const,
        properties: tool.parameters.properties,
        required: tool.parameters.required,
      },
    }));
  }
}
