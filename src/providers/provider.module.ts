// ============================================================
// Provider module — provides the LLM_PROVIDER injection token.
// Factory reads LLM_PROVIDER, MODEL_NAME, and API keys from
// ConfigService and creates the appropriate LLM provider.
// ============================================================

import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GeminiProvider } from './GeminiProvider';
import { OpenAIProvider } from './OpenAIProvider';
import { ClaudeProvider } from './ClaudeProvider';
import { SYSTEM_INSTRUCTION } from '../const/system-instruction';
import type { LLMProvider } from './types';

export const LLM_PROVIDER = 'LLM_PROVIDER';

@Global()
@Module({
  providers: [
    {
      provide: LLM_PROVIDER,
      useFactory: (config: ConfigService): LLMProvider => {
        const providerType = config.get<string>('LLM_PROVIDER', 'gemini');
        const model = config.get<string>('MODEL_NAME');

        switch (providerType) {
          case 'gemini': {
            const apiKey = config.get<string>('GEMINI_API_KEY');
            if (!apiKey) {
              throw new Error(
                'GEMINI_API_KEY required when LLM_PROVIDER=gemini',
              );
            }
            return new GeminiProvider({
              apiKey,
              model: model || 'gemini-2.5-flash-lite',
              systemInstruction: SYSTEM_INSTRUCTION,
            });
          }
          case 'openai': {
            const apiKey = config.get<string>('OPENAI_API_KEY');
            if (!apiKey) {
              throw new Error(
                'OPENAI_API_KEY required when LLM_PROVIDER=openai',
              );
            }
            return new OpenAIProvider({
              apiKey,
              model: model || 'gpt-4o',
              systemInstruction: SYSTEM_INSTRUCTION,
            });
          }
          case 'claude': {
            const apiKey = config.get<string>('ANTHROPIC_API_KEY');
            if (!apiKey) {
              throw new Error(
                'ANTHROPIC_API_KEY required when LLM_PROVIDER=claude',
              );
            }
            return new ClaudeProvider({
              apiKey,
              model: model || 'claude-sonnet-4-20250514',
              systemInstruction: SYSTEM_INSTRUCTION,
            });
          }
          default:
            throw new Error(
              `Unknown LLM_PROVIDER: ${providerType}. Use 'gemini', 'openai', or 'claude'.`,
            );
        }
      },
      inject: [ConfigService],
    },
  ],
  exports: [LLM_PROVIDER],
})
export class ProviderModule {}
