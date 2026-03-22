import { parseEther } from "viem";
import { ToolConfig } from "./allTools.js";
import { getSigner } from "../signers/index.js";
import { updateContext } from "../context/sessionContext.js";

interface SendTransactionArgs {
  to: string;
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

  handler: async ({ to, value }: SendTransactionArgs): Promise<string> => {
    try {
      const signer = getSigner();
      const txHash = await signer.sendTransaction({
        to: to as `0x${string}`,
        value: parseEther(value ?? "0.01"),
      });

      updateContext({
        lastRecipient: to,
        lastAmount: value ?? "0.01",
        lastTxHash: txHash,
      });

      return `Transaction sent successfully. Tx Hash: ${txHash}`;
    } catch (error) {
      return `Failed to send transaction: ${error}`;
    }
  },
};
