import { ToolConfig } from "./allTools.js";
import { getSigner } from "../signers/index.js";

export const getWalletAddressTool: ToolConfig = {
  definition: {
    type: "function",
    function: {
      name: "get_wallet_address",
      description: "Get your own connected wallet address",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },

  handler: async () => {
    const signer = getSigner();
    return signer.getAddress();
  },
};
