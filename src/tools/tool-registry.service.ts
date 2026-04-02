// ============================================================
// ToolRegistryService — Injectable replacement for allTools.ts.
// Collects all tool services via DI and exposes
// getToolDeclarations() and executeTool().
// ============================================================

import { Injectable, Inject } from '@nestjs/common';
import type { ToolService, ToolDefinition } from './tool.interface';
import { TOOL_SERVICES } from './tool.interface';
import type { ToolDeclaration } from '../providers/types';

@Injectable()
export class ToolRegistryService {
  private readonly toolMap: Map<string, ToolService>;

  constructor(
    @Inject(TOOL_SERVICES)
    private readonly toolServices: ToolService[],
  ) {
    this.toolMap = new Map(
      toolServices.map((service) => [service.definition.name, service]),
    );
  }

  /** Get all tool declarations for passing to LLM providers */
  getToolDeclarations(): ToolDeclaration[] {
    return this.toolServices.map((service) => ({
      name: service.definition.name,
      description: service.definition.description,
      parameters: service.definition.parameters,
    }));
  }

  /** Get a specific tool service by name */
  getTool(name: string): ToolService | undefined {
    return this.toolMap.get(name);
  }

  /** Execute a tool by name with given args */
  async executeTool(name: string, args: any): Promise<string> {
    const tool = this.toolMap.get(name);
    if (!tool) {
      return `Tool ${name} not found`;
    }

    try {
      return await tool.execute(args);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return `Error: ${msg}`;
    }
  }
}
