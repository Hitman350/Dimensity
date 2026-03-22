import { ToolConfig } from "./allTools.js";
import { createViemPublicClient } from "../viem/createViemPublicClient.js";

interface ExplainTransactionArgs {
  tx_hash: string;
}

export const explainTransactionTool: ToolConfig<ExplainTransactionArgs> = {
  definition: {
    type: "function",
    function: {
      name: "explain_transaction",
      description:
        "Fetches a transaction by hash and returns a full breakdown: status, sender, recipient, value transferred, gas used, gas cost in ETH, block number, and whether a contract was deployed.",
      parameters: {
        type: "object",
        properties: {
          tx_hash: {
            type: "string",
            description: "The transaction hash (0x...)",
          },
        },
        required: ["tx_hash"],
      },
    },
  },

  handler: async ({ tx_hash }: ExplainTransactionArgs): Promise<string> => {
    try {
      const client = createViemPublicClient();

      const [tx, receipt] = await Promise.all([
        client.getTransaction({ hash: tx_hash as `0x${string}` }),
        client.getTransactionReceipt({ hash: tx_hash as `0x${string}` }),
      ]);

      const gasCostWei = receipt.gasUsed * receipt.effectiveGasPrice;
      const gasCostEth = (Number(gasCostWei) / 1e18).toFixed(6);
      const valueEth = (Number(tx.value) / 1e18).toFixed(6);
      const status =
        receipt.status === "success" ? "✅ Success" : "❌ Failed";

      return JSON.stringify({
        status,
        from: tx.from,
        to: tx.to,
        value: `${valueEth} ETH`,
        gas_used: receipt.gasUsed.toString(),
        gas_cost: `${gasCostEth} ETH`,
        block: receipt.blockNumber.toString(),
        contract_deployed: receipt.contractAddress ?? null,
        explorer: `https://explorer.testnet.abs.xyz/tx/${tx_hash}`,
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return `Error fetching transaction: ${msg}`;
    }
  },
};
