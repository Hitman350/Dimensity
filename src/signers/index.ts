import type { Signer } from "./types.js";

/**
 * Module-level signer singleton. Initialized once at startup via
 * initSigner(), then accessed by tool handlers via getSigner().
 * This avoids changing ToolConfig handler signatures.
 */
let currentSigner: Signer | null = null;

export function initSigner(signer: Signer): void {
  currentSigner = signer;
}

export function getSigner(): Signer {
  if (!currentSigner) {
    throw new Error("Signer not initialized. Call initSigner() first.");
  }
  return currentSigner;
}

export type { Signer } from "./types.js";
