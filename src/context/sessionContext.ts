// ============================================================
// In-memory session context. Stores results from the last
// successful tool execution so follow-up prompts work without
// requiring the user to re-enter addresses or amounts.
// ============================================================

interface SessionContext {
  lastRecipient: string | null;
  lastAmount: string | null;
  lastTxHash: string | null;
  lastContractAddress: string | null;
}

const context: SessionContext = {
  lastRecipient: null,
  lastAmount: null,
  lastTxHash: null,
  lastContractAddress: null,
};

export function getContext(): Readonly<SessionContext> {
  return { ...context };
}

export function updateContext(partial: Partial<SessionContext>): void {
  Object.assign(context, partial);
}

export function resetContext(): void {
  context.lastRecipient = null;
  context.lastAmount = null;
  context.lastTxHash = null;
  context.lastContractAddress = null;
}
