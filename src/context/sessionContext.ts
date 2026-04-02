// ============================================================
// SessionContextService — Injectable replacement for the old
// module-level singleton. Stores results from the last
// successful tool execution for session continuity.
// ============================================================

import { Injectable } from '@nestjs/common';

interface SessionContext {
  lastRecipient: string | null;
  lastAmount: string | null;
  lastTxHash: string | null;
  lastContractAddress: string | null;
}

@Injectable()
export class SessionContextService {
  private context: SessionContext = {
    lastRecipient: null,
    lastAmount: null,
    lastTxHash: null,
    lastContractAddress: null,
  };

  getContext(): Readonly<SessionContext> {
    return { ...this.context };
  }

  updateContext(partial: Partial<SessionContext>): void {
    Object.assign(this.context, partial);
  }

  resetContext(): void {
    this.context.lastRecipient = null;
    this.context.lastAmount = null;
    this.context.lastTxHash = null;
    this.context.lastContractAddress = null;
  }
}
