// ============================================================
// CliService — Injectable service containing the readline REPL.
// Implements OnApplicationBootstrap to start automatically
// when the NestJS app boots.
// ============================================================

import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as readline from 'readline';
import { AgentService } from './agentLoop';
import type { ConversationMessage } from '../providers/types';

@Injectable()
export class CliService implements OnApplicationBootstrap {
  private readonly rl: readline.Interface;

  constructor(
    private readonly agent: AgentService,
    private readonly config: ConfigService,
  ) {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  }

  async onApplicationBootstrap(): Promise<void> {
    await this.startRepl();
  }

  private async startRepl(): Promise<void> {
    const providerName = this.config.get<string>('LLM_PROVIDER', 'gemini');
    const signerType = this.config.get<string>('SIGNER_TYPE', 'local');

    console.log(
      `Dimensity started [${providerName} | ${signerType}]. Type "exit" to quit.`,
    );

    // Conversation history persists across turns for session continuity
    const history: ConversationMessage[] = [];

    const question = (query: string): Promise<string> => {
      return new Promise((resolve) => this.rl.question(query, resolve));
    };

    while (true) {
      const userInput = await question('\nYou: ');

      if (userInput.toLowerCase() === 'exit') {
        this.rl.close();
        process.exit(0);
      }

      try {
        const response = await this.agent.processMessage(history, userInput);
        console.log('\nDimensity:', response);
      } catch (error) {
        console.error(
          'Error during chat:',
          error instanceof Error ? error.message : 'Unknown error',
        );
        this.rl.close();
        process.exit(1);
      }
    }
  }
}
