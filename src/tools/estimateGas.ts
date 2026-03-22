import { parseEther } from "viem";
import { ToolConfig } from "./allTools.js";
import { getSigner } from "../signers/index.js";

interface EstimateGasArgs {
  from: string;
  to: string;
  value_eth: string;
}

export const estimateGasTool: ToolConfig<EstimateGasArgs> = {
  definition: {
    type: "function",
    function: {
      name: "estimate_gas",
      description:
        "Estimates gas cost in ETH for a transfer before it is broadcast. Always call this before send_transaction so the user knows the full cost.",
      parameters: {
        type: "object",
        properties: {
          from: {
            type: "string",
            description: "Sender wallet address",
          },
          to: {
            type: "string",
            description: "Recipient wallet address",
          },
          value_eth: {
            type: "string",
            description: "Amount to send in ETH as a string e.g. '0.05'",
          },
        },
        required: ["from", "to", "value_eth"],
      },
    },
  },

  handler: async ({
    from,
    to,
    value_eth,
  }: EstimateGasArgs): Promise<string> => {
    try {
      const signer = getSigner();
      const { gasUnits, gasPrice } = await signer.estimateGas({
        from: from as `0x${string}`,
        to: to as `0x${string}`,
        value: parseEther(value_eth),
      });

      const gasCostWei = gasUnits * gasPrice;
      const gasCostEth = (Number(gasCostWei) / 1e18).toFixed(8);
      const gasPriceGwei = (Number(gasPrice) / 1e9).toFixed(4);
      const totalEthNeeded = (
        parseFloat(value_eth) + parseFloat(gasCostEth)
      ).toFixed(8);

      return JSON.stringify({
        estimated_gas_units: gasUnits.toString(),
        gas_price_gwei: `${gasPriceGwei} Gwei`,
        estimated_gas_cost_eth: `${gasCostEth} ETH`,
        value_to_send_eth: `${value_eth} ETH`,
        total_eth_needed: `${totalEthNeeded} ETH`,
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return `Error estimating gas: ${msg}`;
    }
  },
};
