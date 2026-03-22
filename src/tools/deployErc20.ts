import { ToolConfig } from "./allTools.js";
import { getSigner } from "../signers/index.js";
import { ERC20_ABI, ERC20_BYTECODE } from "../const/contractDetails.js";
import { updateContext } from "../context/sessionContext.js";

interface DeployErc20Args {
  name: string;
  symbol: string;
  initialSupply?: string;
}

export const deployErc20Tool: ToolConfig<DeployErc20Args> = {
  definition: {
    type: "function",
    function: {
      name: "deploy_erc20",
      description: "Deploy a new ERC20 token contract",
      parameters: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "The name of the token",
          },
          symbol: {
            type: "string",
            description: "The symbol of the token",
          },
          initialSupply: {
            type: "string",
            description:
              'Initial supply amount. Defaults to 1 billion tokens if not specified.',
          },
        },
        required: ["name", "symbol"],
      },
    },
  },

  handler: async ({
    name,
    symbol,
    initialSupply,
  }: DeployErc20Args): Promise<string> => {
    try {
      const signer = getSigner();
      const baseNumber = parseFloat(initialSupply || "1000000000");

      const { contractAddress } = await signer.deployContract({
        abi: ERC20_ABI,
        bytecode: ERC20_BYTECODE,
        args: [name, symbol, baseNumber],
      });

      updateContext({ lastContractAddress: contractAddress });

      return `${name} (${symbol}) token deployed successfully at: ${contractAddress}`;
    } catch (error) {
      return `Failed to deploy contract: ${error}`;
    }
  },
};
