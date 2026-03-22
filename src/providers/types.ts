// ============================================================
// Universal types for the provider-agnostic LLM interface.
// No provider SDK imports — all adapter-specific logic lives
// inside individual provider implementations.
// ============================================================

/** A single function call requested by the model */
export interface FunctionCall {
  id?: string; // OpenAI/Claude need call IDs for linking responses
  name: string;
  args: Record<string, unknown>;
}

/** Universal message format — each provider converts to/from its native format */
export type ConversationMessage =
  | { role: "user"; content: string }
  | { role: "model"; content: string; functionCalls?: FunctionCall[] }
  | { role: "tool"; name: string; content: string; callId?: string };

/** Response from any LLM provider */
export interface LLMResponse {
  text: string | null;
  functionCalls: FunctionCall[];
}

/** Universal tool declaration — plain JSON Schema, no provider SDK types */
export interface ToolDeclaration {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, unknown>;
    required: string[];
  };
}

/** Provider identity config — no tools (tools are per-call) */
export interface LLMProviderConfig {
  apiKey: string;
  model: string;
  systemInstruction: string;
}

/** Common interface for all LLM providers */
export interface LLMProvider {
  chat(
    history: ConversationMessage[],
    tools: ToolDeclaration[]
  ): Promise<LLMResponse>;
}
