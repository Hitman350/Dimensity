import { Address, parseEther } from "viem";
import { createViemWalletClient } from "../viem/createViemWalletClient";
import { ToolConfig } from "./allTools";

interface SendTransactionArgs {
  to: Address;
  value?: string;
}

export const sendTransactionTool: ToolConfig<SendTransactionArgs> = {
  definition: {
    type: "function",
    function: {
      name: "send_transaction",
      description: "Send ether to a specified wallet address",
      parameters: {
        type: "object",
        properties: {
          to: {
            type: "string",
            pattern: "^0x[a-fA-F0-9]{40}$",
            description: "The recipient wallet address",
          },
          value: {
            type: "string",
            description: "The amount of ether to send (in ETH).",
          },
        },
        required: ["to"],
      },
    },
  },

  handler: async ({ to, value }: SendTransactionArgs) => {
    try {
      const walletClient = createViemWalletClient();
      const txHash = await walletClient.sendTransaction({
        to,
        value: parseEther(value ?? "0.01"),
      });
      return `Transaction sent successfully. Tx Hash: ${txHash}`;
    } catch (error) {
      return `Failed to send transaction: ${error}`;
    }
  },
};
