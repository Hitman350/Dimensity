import {
  createWalletClient,
  createPublicClient,
  http,
  type WalletClient,
  type Chain,
  type Transport,
  type Account,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";

// Public client — read-only, safe to create at module level
export const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(),
});

// Standard wallet client type for EVM-compatible chains (Base, Optimism, Arbitrum)
export type ExtendedWalletClient = WalletClient<Transport, Chain, Account>;

// Per-request wallet client factory.
// Creates a fresh wallet client scoped to a single API request.
// Replaces the old module-level singleton to prevent multi-user signer contamination.

export function createPerRequestWalletClient(
  privateKey: string
): ExtendedWalletClient {
  const account = privateKeyToAccount(privateKey as `0x${string}`);
  return createWalletClient({
    account,
    chain: baseSepolia,
    transport: http(),
  }) as unknown as ExtendedWalletClient;
}
