import { NextRequest, NextResponse } from "next/server";
import { publicClient, createPerRequestWalletClient, type ExtendedWalletClient } from "@/lib/clients";
import { parseEther, formatEther, formatGwei } from "viem";
import { ERC20_ABI, ERC20_BYTECODE } from "@/lib/contract";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Server-side tool handlers for confirmed tool execution.
// Called after the user approves a pending tool call from the ConfirmationModal.
// Phase 5: handlers now accept (args, walletClient, walletAddress) instead of
// calling the global getWalletClient()/getWalletAddress() singleton.

type ToolHandler = (
  args: Record<string, string>,
  wc: ExtendedWalletClient,
  addr: `0x${string}`
) => Promise<string>;

const handlers: Record<string, ToolHandler> = {
  send_transaction: async ({ to, value }, wc) => {
    const txHash = await wc.sendTransaction({
      to: to as `0x${string}`,
      value: parseEther(value ?? "0.01"),
    });
    return `Transaction sent. Tx Hash: ${txHash}\nhttps://explorer.testnet.abs.xyz/tx/${txHash}`;
  },

  deploy_erc20: async ({ name, symbol, initialSupply }, wc) => {
    const supply = parseFloat(initialSupply || "1000000000");
    const hash = await wc.deployContract({
      abi: ERC20_ABI,
      bytecode: ERC20_BYTECODE,
      args: [name, symbol, supply],
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    return `${name} (${symbol}) deployed at: ${receipt.contractAddress}\nhttps://explorer.testnet.abs.xyz/address/${receipt.contractAddress}`;
  },

  estimate_gas: async ({ to, value }, _wc, addr) => {
    const gasUnits = await publicClient.estimateGas({
      account: addr,
      to: to as `0x${string}`,
      value: parseEther(value ?? "0.01"),
    });
    const gasPrice = await publicClient.getGasPrice();
    const totalCost = gasUnits * gasPrice;
    return JSON.stringify({
      gas_units: gasUnits.toString(),
      gas_price_gwei: formatGwei(gasPrice),
      total_cost_eth: formatEther(totalCost),
    });
  },
};

export async function POST(req: NextRequest) {
  try {
    // Phase 5: Authenticate request
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as Record<string, unknown>).userId as string;

    // Get active wallet from DB
    const activeWallet = await prisma.wallet.findFirst({
      where: { user_id: userId, is_active: true },
    });

    if (!activeWallet) {
      return NextResponse.json(
        { error: "No active wallet found" },
        { status: 400 }
      );
    }

    // Create per-request signer (dev shortcut: uses PRIVATE_KEY from env)
    const pk = process.env.PRIVATE_KEY;
    if (!pk) {
      return NextResponse.json(
        { error: "Server signer not configured" },
        { status: 500 }
      );
    }

    const walletClient = createPerRequestWalletClient(pk);
    const walletAddress = activeWallet.address as `0x${string}`;

    const { toolName, args } = await req.json();

    const handler = handlers[toolName];
    if (!handler) {
      return NextResponse.json(
        { error: `Unknown tool: ${toolName}` },
        { status: 400 }
      );
    }

    // Pass per-request wallet client + address into handler
    const result = await handler(args, walletClient, walletAddress);
    return NextResponse.json({ result });
  } catch (error) {
    console.error("[Execute Tool Error]", error);
    const message =
      error instanceof Error ? error.message : "Unknown execution error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
