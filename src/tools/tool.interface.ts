// ============================================================
// Tool interface and constants for NestJS tool services.
// Each tool service implements this interface.
// ============================================================

/** Tool definition — plain JSON Schema for LLM providers */
export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, unknown>;
    required: string[];
  };
}

/** Base interface for all tool services */
export interface ToolService {
  readonly definition: ToolDefinition;
  execute(args: any): Promise<string>;
}

/** Injection token for array of all tool services */
export const TOOL_SERVICES = 'TOOL_SERVICES';
