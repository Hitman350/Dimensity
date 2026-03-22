import {
  GoogleGenerativeAI,
  SchemaType,
  type Content,
  type Part,
  type FunctionDeclaration,
} from "@google/generative-ai";
import type {
  LLMProvider,
  LLMProviderConfig,
  ConversationMessage,
  LLMResponse,
  ToolDeclaration,
} from "./types.js";

export class GeminiProvider implements LLMProvider {
  private model;

  constructor(config: LLMProviderConfig) {
    const genAI = new GoogleGenerativeAI(config.apiKey);
    this.model = genAI.getGenerativeModel({
      model: config.model,
      systemInstruction: config.systemInstruction,
    });
  }

  async chat(
    history: ConversationMessage[],
    tools: ToolDeclaration[]
  ): Promise<LLMResponse> {
    const contents = this.convertHistory(history);
    const functionDeclarations = this.convertTools(tools);

    const result = await this.model.generateContent({
      contents,
      tools: [{ functionDeclarations }],
    });

    const response = result.response;
    const functionCalls = response.functionCalls();

    if (functionCalls && functionCalls.length > 0) {
      return {
        text: null,
        functionCalls: functionCalls.map((fc) => ({
          name: fc.name,
          args: (fc.args as Record<string, unknown>) || {},
        })),
      };
    }

    let text: string | null = null;
    try {
      text = response.text() || null;
    } catch {
      // response.text() can throw if no text candidates exist
    }

    return { text, functionCalls: [] };
  }

  private convertHistory(messages: ConversationMessage[]): Content[] {
    const contents: Content[] = [];

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];

      if (msg.role === "user") {
        contents.push({ role: "user", parts: [{ text: msg.content }] });
      } else if (msg.role === "model") {
        const parts: Part[] = [];
        if (msg.content) {
          parts.push({ text: msg.content });
        }
        if (msg.functionCalls) {
          for (const fc of msg.functionCalls) {
            parts.push({ functionCall: { name: fc.name, args: fc.args } });
          }
        }
        if (parts.length > 0) {
          contents.push({ role: "model", parts });
        }
      } else if (msg.role === "tool") {
        // Merge consecutive tool messages into one Content
        const functionResponseParts: Part[] = [
          {
            functionResponse: {
              name: msg.name,
              response: { result: msg.content },
            },
          },
        ];

        // Look ahead for more consecutive tool messages
        while (i + 1 < messages.length && messages[i + 1].role === "tool") {
          i++;
          const nextTool = messages[i] as {
            role: "tool";
            name: string;
            content: string;
          };
          functionResponseParts.push({
            functionResponse: {
              name: nextTool.name,
              response: { result: nextTool.content },
            },
          });
        }

        contents.push({ role: "function", parts: functionResponseParts });
      }
    }

    return contents;
  }

  private convertTools(tools: ToolDeclaration[]): FunctionDeclaration[] {
    return tools.map((tool): FunctionDeclaration => {
      const hasProperties = Object.keys(tool.parameters.properties).length > 0;

      if (hasProperties) {
        return {
          name: tool.name,
          description: tool.description,
          parameters: {
            type: SchemaType.OBJECT,
            properties: this.convertProperties(tool.parameters.properties),
            required: tool.parameters.required,
          },
        };
      }

      return { name: tool.name, description: tool.description };
    });
  }

  private convertProperties(
    props: Record<string, unknown>
  ): Record<string, any> {  // eslint-disable-line @typescript-eslint/no-explicit-any
    const converted: Record<string, any> = {};  // eslint-disable-line @typescript-eslint/no-explicit-any
    for (const [key, value] of Object.entries(props)) {
      const prop = value as { type: string; description?: string };
      converted[key] = {
        type: this.mapSchemaType(prop.type),
        description: prop.description || "",
      };
    }
    return converted;
  }

  private mapSchemaType(type: string): SchemaType {
    const typeMap: Record<string, SchemaType> = {
      string: SchemaType.STRING,
      number: SchemaType.NUMBER,
      integer: SchemaType.INTEGER,
      boolean: SchemaType.BOOLEAN,
      array: SchemaType.ARRAY,
      object: SchemaType.OBJECT,
    };
    return typeMap[type] || SchemaType.STRING;
  }
}
