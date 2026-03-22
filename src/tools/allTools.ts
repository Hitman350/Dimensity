// ============================================================
// Tool registry — zero provider SDK imports.
// ToolConfig defines the tool structure. getToolDeclarations()
// exports plain JSON Schema declarations consumed by providers.
// ============================================================

import { getBalanceTool } from "./getBalance.js";
import { getWalletAddressTool } from "./getWalletAddress.js";
import { sendTransactionTool } from "./sendTransaction.js";
import { deployErc20Tool } from "./deployErc20.js";
import { explainTransactionTool } from "./explainTransaction.js";
import { scanContractTool } from "./scanContract.js";
import { getTokenInfoTool } from "./getTokenInfo.js";
import { estimateGasTool } from "./estimateGas.js";
import { getWalletHistoryTool } from "./getWalletHistory.js";
import { getEthPriceTool } from "./getEthPrice.js";

export interface ToolConfig<T = any> {
  definition: {
    type: "function";
    function: {
      name: string;
      description: string;
      parameters: {
        type: "object";
        properties: Record<string, unknown>;
        required: string[];
      };
    };
  };
  handler: (args: T) => Promise<string>;
}

export const tools: Record<string, ToolConfig> = {
  get_balance: getBalanceTool,
  get_wallet_address: getWalletAddressTool,
  send_transaction: sendTransactionTool,
  deploy_erc20: deployErc20Tool,
  explain_transaction: explainTransactionTool,
  scan_contract: scanContractTool,
  get_token_info: getTokenInfoTool,
  estimate_gas: estimateGasTool,
  get_wallet_history: getWalletHistoryTool,
  get_eth_price: getEthPriceTool,
};

/** Export universal tool declarations — plain JSON Schema, no provider SDK types */
export function getToolDeclarations() {
  return Object.values(tools).map((tool) => ({
    name: tool.definition.function.name,
    description: tool.definition.function.description,
    parameters: tool.definition.function.parameters,
  }));
}
