import { ToolConfig } from "./allTools.js";
import { getSigner } from "../signers/index.js";

interface GetWalletHistoryArgs {
  address?: string;
}

interface BlockscoutTx {
  hash: string;
  from: string;
  to: string;
  value: string;
  timeStamp: string;
  isError: string;
  functionName: string;
}

interface BlockscoutResponse {
  status: string;
  message: string;
  result: BlockscoutTx[];
}

const EXPLORER_API = "https://explorer.testnet.abs.xyz/api";

export const getWalletHistoryTool: ToolConfig<GetWalletHistoryArgs> = {
  definition: {
    type: "function",
    function: {
      name: "get_wallet_history",
      description:
        "Fetches the most recent transactions for a wallet on Abstract Testnet. If no address is provided, uses the connected wallet address automatically.",
      parameters: {
        type: "object",
        properties: {
          address: {
            type: "string",
            description:
              "Wallet address to look up (0x...). Optional — defaults to connected wallet.",
          },
        },
        required: [],
      },
    },
  },

  handler: async (args: GetWalletHistoryArgs): Promise<string> => {
    // Auto-resolve address from signer if not provided
    const address = args.address || (await getSigner().getAddress());

    try {
      const url = `${EXPLORER_API}?module=account&action=txlist&address=${address}&sort=desc&page=1&offset=20`;
      const response = await fetch(url);

      if (!response.ok) {
        return JSON.stringify({
          error: "Explorer API unavailable",
          message: "Unable to fetch history right now. Check manually:",
          explorer_url: `https://explorer.testnet.abs.xyz/address/${address}`,
        });
      }

      const data: BlockscoutResponse = await response.json();

      // status === "0" means no transactions — valid empty state, not an error
      if (data.status === "0") {
        return JSON.stringify({
          address,
          message:
            "No transactions found for this wallet on Abstract Testnet.",
          transactions: [],
          explorer_url: `https://explorer.testnet.abs.xyz/address/${address}`,
        });
      }

      // Only process when status === "1"
      const txs = data.result.slice(0, 20);

      let totalSent = 0;
      let totalReceived = 0;
      const addrLower = address.toLowerCase();

      const formatted = txs.map((tx) => {
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
    } catch (error) {
      return JSON.stringify({
        error: "Explorer API unavailable",
        message: "Unable to fetch history right now. Check manually:",
        explorer_url: `https://explorer.testnet.abs.xyz/address/${address}`,
      });
    }
  },
};
