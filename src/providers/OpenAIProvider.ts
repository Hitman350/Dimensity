import OpenAI from 'openai';
import type {
  LLMProvider,
  LLMProviderConfig,
  ConversationMessage,
  LLMResponse,
  ToolDeclaration,
} from './types';

export class OpenAIProvider implements LLMProvider {
  private client: OpenAI;
  private model: string;
  private systemInstruction: string;

  constructor(config: LLMProviderConfig) {
    this.client = new OpenAI({ apiKey: config.apiKey });
    this.model = config.model;
    this.systemInstruction = config.systemInstruction;
  }

  async chat(
    history: ConversationMessage[],
    tools: ToolDeclaration[],
  ): Promise<LLMResponse> {
    const messages = this.convertHistory(history);
    const openaiTools = this.convertTools(tools);

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages,
      tools: openaiTools,
    });

    const choice = response.choices[0];
    const message = choice.message;

    if (message.tool_calls && message.tool_calls.length > 0) {
      return {
        text: message.content,
        functionCalls: message.tool_calls
          .filter(
            (tc): tc is OpenAI.ChatCompletionMessageToolCall & {
              type: 'function';
            } => tc.type === 'function',
          )
          .map((tc) => ({
            id: tc.id,
            name: tc.function.name,
            args: JSON.parse(tc.function.arguments) as Record<string, unknown>,
          })),
      };
    }

    return {
      text: message.content,
      functionCalls: [],
    };
  }

  private convertHistory(
    messages: ConversationMessage[],
  ): OpenAI.ChatCompletionMessageParam[] {
    const result: OpenAI.ChatCompletionMessageParam[] = [
      { role: 'system', content: this.systemInstruction },
    ];

    for (const msg of messages) {
      if (msg.role === 'user') {
        result.push({ role: 'user', content: msg.content });
      } else if (msg.role === 'model') {
        const assistantMsg: OpenAI.ChatCompletionAssistantMessageParam = {
          role: 'assistant',
          content: msg.content || null,
        };
        if (msg.functionCalls && msg.functionCalls.length > 0) {
          assistantMsg.tool_calls = msg.functionCalls.map((fc) => ({
            id: fc.id || `call_${fc.name}_${Date.now()}`,
            type: 'function' as const,
            function: {
              name: fc.name,
              arguments: JSON.stringify(fc.args),
            },
          }));
        }
        result.push(assistantMsg);
      } else if (msg.role === 'tool') {
        result.push({
          role: 'tool',
          tool_call_id: msg.callId || `call_${msg.name}`,
          content: msg.content,
        });
      }
    }

    return result;
  }

  private convertTools(
    tools: ToolDeclaration[],
  ): OpenAI.ChatCompletionTool[] {
    return tools.map((tool) => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: {
          type: 'object' as const,
          properties: tool.parameters.properties,
          required: tool.parameters.required,
        },
      },
    }));
  }
}
