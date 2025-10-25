import { createViemWalletClient } from "../viem/createViemWalletClient";
import { ToolConfig } from "./allTools";

export const getWalletAddressTool: ToolConfig = {
  definition: {
    type: "function",
    function: {
      name: "get_wallet_address",
      description:
        "Get your own connected wallet address from the viem wallet client.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },

  handler: async () => {
    const walletClient = createViemWalletClient();
  },
};
