import { streamText, tool } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { parseEther } from "viem";
import { publicClient, getWalletClient, getWalletAddress } from "@/lib/clients";
import { ERC20_ABI, ERC20_BYTECODE } from "@/lib/contract";
import { SYSTEM_INSTRUCTION } from "@/lib/system-prompt";

// 60-second in-memory price cache — prevents CoinGecko rate limit
let ethPriceCache: { usd: number; eur: number; change: number | null; cachedAt: number } | null = null;

// --- Provider selection (same env vars as CLI) ---

function getModel() {
  const provider = process.env.LLM_PROVIDER || "gemini";
  const modelName = process.env.MODEL_NAME;

  switch (provider) {
    case "openai": {
      const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
      return openai(modelName || "gpt-4o");
    }
    case "claude": {
      const anthropic = createAnthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });
      return anthropic(modelName || "claude-sonnet-4-20250514");
    }
    default: {
      const google = createGoogleGenerativeAI({
        apiKey: process.env.GEMINI_API_KEY,
      });
      return google(modelName || "gemini-2.5-flash");
    }
  }
}

// --- All 8 tools in Vercel AI SDK format ---

const allTools = {
  get_balance: tool({
    description: "Get the native ETH balance of any wallet address",
    parameters: z.object({
      wallet: z.string().describe("Wallet address to check"),
    }),
    execute: async ({ wallet }) => {
      const balance = await publicClient.getBalance({
        address: wallet as `0x${string}`,
      });
      return `${(Number(balance) / 1e18).toFixed(6)} ETH`;
    },
  }),

  get_wallet_address: tool({
    description: "Get your own connected wallet address",
    parameters: z.object({}),
    execute: async () => {
      return getWalletAddress();
    },
  }),

  send_transaction: tool({
    description: "Send ether to a specified wallet address",
    parameters: z.object({
      to: z.string().describe("The recipient wallet address"),
      value: z
        .string()
        .optional()
        .describe("Amount of ether to send (in ETH). Defaults to 0.01"),
    }),
    execute: async ({ to, value }) => {
      const txHash = await getWalletClient().sendTransaction({
        to: to as `0x${string}`,
        value: parseEther(value ?? "0.01"),
      });
      return `Transaction sent. Tx Hash: ${txHash}`;
    },
  }),

  deploy_erc20: tool({
    description: "Deploy a new ERC20 token contract",
    parameters: z.object({
      name: z.string().describe("Token name"),
      symbol: z.string().describe("Token symbol"),
      initialSupply: z
        .string()
        .optional()
        .describe("Initial supply amount. Defaults to 1 billion"),
    }),
    execute: async ({ name, symbol, initialSupply }) => {
      const supply = parseFloat(initialSupply || "1000000000");
      const wc = getWalletClient();
      const hash = await wc.deployContract({
        abi: ERC20_ABI,
        bytecode: ERC20_BYTECODE,
        args: [name, symbol, supply],
      });
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      return `${name} (${symbol}) deployed at: ${receipt.contractAddress}`;
    },
  }),

  explain_transaction: tool({
    description:
      "Fetches a transaction by hash and returns a full breakdown: status, sender, recipient, value, gas cost, block number.",
    parameters: z.object({
      tx_hash: z.string().describe("Transaction hash (0x...)"),
    }),
    execute: async ({ tx_hash }) => {
      const [tx, receipt] = await Promise.all([
        publicClient.getTransaction({ hash: tx_hash as `0x${string}` }),
        publicClient.getTransactionReceipt({
          hash: tx_hash as `0x${string}`,
        }),
      ]);
      const gasCost = receipt.gasUsed * receipt.effectiveGasPrice;
      return JSON.stringify({
        status: receipt.status === "success" ? "✅ Success" : "❌ Failed",
        from: tx.from,
        to: tx.to,
        value: `${(Number(tx.value) / 1e18).toFixed(6)} ETH`,
        gas_used: receipt.gasUsed.toString(),
        gas_cost: `${(Number(gasCost) / 1e18).toFixed(6)} ETH`,
        block: receipt.blockNumber.toString(),
        contract_deployed: receipt.contractAddress ?? null,
        explorer: `https://explorer.testnet.abs.xyz/tx/${tx_hash}`,
      });
    },
  }),

  scan_contract: tool({
    description:
      "Scans deployed contract bytecode for dangerous function selectors. Returns risk report.",
    parameters: z.object({
      contract_address: z.string().describe("Contract address to scan (0x...)"),
    }),
    execute: async ({ contract_address }) => {
      const bytecode = await publicClient.getBytecode({
        address: contract_address as `0x${string}`,
      });
      if (!bytecode || bytecode === "0x") {
        return "No contract found at this address. It may be a wallet (EOA).";
      }

      const SELECTORS: Record<string, { label: string; severity: string }> = {
        "40c10f19": { label: "mint(address,uint256) — owner can mint unlimited tokens", severity: "CRITICAL" },
        "8456cb59": { label: "pause() — contract can be paused", severity: "HIGH" },
        "3f4ba83a": { label: "unpause() — pause/unpause mechanism", severity: "HIGH" },
        f2fde38b: { label: "transferOwnership(address) — ownership transferable", severity: "HIGH" },
        e47d6060: { label: "setBlacklist(address) — wallet blacklisting", severity: "CRITICAL" },
        "44337ea1": { label: "addToBlacklist(address) — blacklisting confirmed", severity: "CRITICAL" },
        "8da5cb5b": { label: "owner() — privileged owner exists", severity: "MEDIUM" },
        "715018a6": { label: "renounceOwnership() — owner CAN renounce", severity: "LOW" },
        "42966c68": { label: "burn(uint256) — tokens can be burned", severity: "LOW" },
      };

      const findings = Object.entries(SELECTORS)
        .filter(([sel]) => bytecode.includes(sel))
        .map(([, info]) => info);

      let risk = "LOW";
      if (findings.some((f) => f.severity === "CRITICAL")) risk = "CRITICAL";
      else if (findings.some((f) => f.severity === "HIGH")) risk = "HIGH";
      else if (findings.some((f) => f.severity === "MEDIUM")) risk = "MEDIUM";

      const rec: Record<string, string> = {
        CRITICAL: "⛔ Do NOT interact. Critical control functions detected.",
        HIGH: "⚠️ High risk. Review all findings before interacting.",
        MEDIUM: "🟡 Moderate risk. Standard caution advised.",
        LOW: "✅ No major red flags. Always do your own research.",
      };

      return JSON.stringify({
        contract: contract_address,
        overall_risk: risk,
        bytecode_size: `${Math.floor(bytecode.length / 2)} bytes`,
        findings: {
          critical: findings.filter((f) => f.severity === "CRITICAL").map((f) => f.label),
          high: findings.filter((f) => f.severity === "HIGH").map((f) => f.label),
          medium: findings.filter((f) => f.severity === "MEDIUM").map((f) => f.label),
          low: findings.filter((f) => f.severity === "LOW").map((f) => f.label),
        },
        recommendation: rec[risk],
        explorer: `https://explorer.testnet.abs.xyz/address/${contract_address}`,
      });
    },
  }),

  get_token_info: tool({
    description:
      "Reads name, symbol, decimals, and total supply of any ERC-20 token contract.",
    parameters: z.object({
      contract_address: z.string().describe("ERC-20 token contract address"),
    }),
    execute: async ({ contract_address }) => {
      const abi = [
        { type: "function", name: "name", inputs: [], outputs: [{ type: "string" }], stateMutability: "view" },
        { type: "function", name: "symbol", inputs: [], outputs: [{ type: "string" }], stateMutability: "view" },
        { type: "function", name: "decimals", inputs: [], outputs: [{ type: "uint8" }], stateMutability: "view" },
        { type: "function", name: "totalSupply", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
      ] as const;
      const addr = contract_address as `0x${string}`;
      const [name, symbol, decimals, totalSupply] = await Promise.all([
        publicClient.readContract({ address: addr, abi, functionName: "name" }),
        publicClient.readContract({ address: addr, abi, functionName: "symbol" }),
        publicClient.readContract({ address: addr, abi, functionName: "decimals" }),
        publicClient.readContract({ address: addr, abi, functionName: "totalSupply" }),
      ]);
      const supply = Number(totalSupply) / Math.pow(10, Number(decimals));
      return JSON.stringify({
        name: String(name),
        symbol: String(symbol),
        decimals: decimals.toString(),
        total_supply: supply.toLocaleString(),
        contract: contract_address,
        explorer: `https://explorer.testnet.abs.xyz/address/${contract_address}`,
      });
    },
  }),

  estimate_gas: tool({
    description:
      "Estimates gas cost in ETH for a transfer before broadcast. Always call before send_transaction.",
    parameters: z.object({
      from: z.string().describe("Sender wallet address"),
      to: z.string().describe("Recipient wallet address"),
      value_eth: z.string().describe("Amount in ETH e.g. '0.05'"),
    }),
    execute: async ({ from, to, value_eth }) => {
      const [gasEstimate, gasPrice] = await Promise.all([
        publicClient.estimateGas({
          account: from as `0x${string}`,
          to: to as `0x${string}`,
          value: parseEther(value_eth),
        }),
        publicClient.getGasPrice(),
      ]);
      const gasCostWei = gasEstimate * gasPrice;
      const gasCostEth = (Number(gasCostWei) / 1e18).toFixed(8);
      const gasPriceGwei = (Number(gasPrice) / 1e9).toFixed(4);
      const total = (parseFloat(value_eth) + parseFloat(gasCostEth)).toFixed(8);
      return JSON.stringify({
        estimated_gas_units: gasEstimate.toString(),
        gas_price_gwei: `${gasPriceGwei} Gwei`,
        estimated_gas_cost_eth: `${gasCostEth} ETH`,
        value_to_send_eth: `${value_eth} ETH`,
        total_eth_needed: `${total} ETH`,
      });
    },
  }),

  get_wallet_history: tool({
    description:
      "Fetches the most recent transactions for a wallet on Abstract Testnet. If no address is provided, uses the connected wallet automatically.",
    parameters: z.object({
      address: z
        .string()
        .optional()
        .describe("Wallet address (0x...). Optional — defaults to connected wallet."),
    }),
    execute: async ({ address: inputAddr }) => {
      const address = inputAddr || getWalletAddress();
      try {
        const url = `https://explorer.testnet.abs.xyz/api?module=account&action=txlist&address=${address}&sort=desc&page=1&offset=20`;
        const response = await fetch(url);

        if (!response.ok) {
          return JSON.stringify({
            error: "Explorer API unavailable",
            message: "Unable to fetch history right now. Check manually:",
            explorer_url: `https://explorer.testnet.abs.xyz/address/${address}`,
          });
        }

        const data = await response.json();

        if (data.status === "0") {
          return JSON.stringify({
            address,
            message: "No transactions found for this wallet on Abstract Testnet",
            transactions: [],
            explorer_url: `https://explorer.testnet.abs.xyz/address/${address}`,
          });
        }

        const txs = data.result.slice(0, 20);
        const addrLower = address.toLowerCase();
        let totalSent = 0;
        let totalReceived = 0;

        const formatted = txs.map((tx: { hash: string; from: string; to: string; value: string; timeStamp: string; isError: string }) => {
          const valueEth = Number(tx.value) / 1e18;
          const isSend = tx.from.toLowerCase() === addrLower;
          if (isSend) totalSent += valueEth;
          else totalReceived += valueEth;
          return {
            hash: tx.hash,
            direction: isSend ? "SENT" : "RECEIVED",
            from: tx.from,
            to: tx.to,
            value: `${valueEth.toFixed(6)} ETH`,
            status: tx.isError === "0" ? "Success" : "Failed",
            date: new Date(Number(tx.timeStamp) * 1000).toISOString(),
          };
        });

        return JSON.stringify({
          address,
          total_transactions: txs.length,
          total_sent: `${totalSent.toFixed(6)} ETH`,
          total_received: `${totalReceived.toFixed(6)} ETH`,
          recent_transactions: formatted.slice(0, 5),
          explorer_url: `https://explorer.testnet.abs.xyz/address/${address}`,
        });
      } catch {
        return JSON.stringify({
          error: "Explorer API unavailable",
          message: "Unable to fetch history right now. Check manually:",
          explorer_url: `https://explorer.testnet.abs.xyz/address/${address}`,
        });
      }
    },
  }),

  get_eth_price: tool({
    description:
      "Fetches the current ETH price in USD and EUR from CoinGecko. Use to convert ETH amounts to fiat.",
    parameters: z.object({}),
    execute: async () => {
      const now = Date.now();
      if (ethPriceCache && now - ethPriceCache.cachedAt < 60_000) {
        return JSON.stringify({
          eth_usd: `$${ethPriceCache.usd.toLocaleString()}`,
          eth_eur: `€${ethPriceCache.eur.toLocaleString()}`,
          change_24h: ethPriceCache.change ? `${ethPriceCache.change.toFixed(2)}%` : "N/A",
          cached: true,
        });
      }
      try {
        const res = await fetch(
          "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd,eur&include_24hr_change=true"
        );
        if (!res.ok) {
          return JSON.stringify({ error: "CoinGecko API unavailable", message: "Try again shortly." });
        }
        const data = await res.json();
        const eth = data.ethereum;
        ethPriceCache = { usd: eth.usd, eur: eth.eur, change: eth.usd_24h_change ?? null, cachedAt: now };
        return JSON.stringify({
          eth_usd: `$${eth.usd.toLocaleString()}`,
          eth_eur: `€${eth.eur.toLocaleString()}`,
          change_24h: eth.usd_24h_change ? `${eth.usd_24h_change.toFixed(2)}%` : "N/A",
          cached: false,
        });
      } catch (err) {
        return `Error fetching ETH price: ${err instanceof Error ? err.message : String(err)}`;
      }
    },
  }),
};

// --- Route handler ---

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages } = body;

    const result = streamText({
      model: getModel(),
      system: SYSTEM_INSTRUCTION,
      messages,
      tools: allTools,
      maxSteps: 10,
    });

    return result.toDataStreamResponse({
      getErrorMessage: (error) => {
        if (error instanceof Error) {
          console.error("[Dimensity API Error]", error.message, error.stack);
          return error.message;
        }
        console.error("[Dimensity API Error]", error);
        return String(error);
      },
    });
  } catch (error) {
    console.error("[Dimensity Route Error]", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
