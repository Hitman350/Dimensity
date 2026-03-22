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
import { abstractTestnet } from "viem/chains";
import { eip712WalletActions } from "viem/zksync";

// Public client — read-only, safe to create at module level
export const publicClient = createPublicClient({
  chain: abstractTestnet,
  transport: http(),
});

// Wallet client — lazy-initialized on first use to avoid
// build-time errors when PRIVATE_KEY is not set.
// TODO: signer is a process-level singleton — single wallet only.
// Multi-wallet support requires per-request signer instantiation
// when KernelSigner + passkey is implemented in the frontend phase.

type ExtendedWalletClient = WalletClient<Transport, Chain, Account> &
  ReturnType<typeof eip712WalletActions>;

let _walletClient: ExtendedWalletClient | null = null;
let _walletAddress: `0x${string}` | null = null;

function initWallet() {
  if (_walletClient) return;
  const pk = process.env.PRIVATE_KEY;
  if (!pk) throw new Error("PRIVATE_KEY environment variable is required");
  const account = privateKeyToAccount(pk as `0x${string}`);
  _walletClient = createWalletClient({
    account,
    chain: abstractTestnet,
    transport: http(),
  }).extend(eip712WalletActions()) as unknown as ExtendedWalletClient;
  _walletAddress = account.address;
}

export function getWalletClient(): ExtendedWalletClient {
  initWallet();
  return _walletClient!;
}

export function getWalletAddress(): `0x${string}` {
  initWallet();
  return _walletAddress!;
}
