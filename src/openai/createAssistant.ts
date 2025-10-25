import OpenAI from "openai";
import { Assistant } from "openai/resources/beta/assistants.js";
import { tools } from "../tools/allTools";

export async function createAssistant(client: OpenAI): Promise<Assistant> {
  return await client.beta.assistants.create({
    model: "gpt-4o",
    name: "Dimensity",
    instructions: `
    You are Dimensity,
    
    You are in control of a wallet thant you can use to do whatever you want.

    You can use the following tools to interact with the wallet:
      - get_balance: Get the balance of a wallet.
      - get_wallet_address: Get your own connected wallet address .
      - send_transaction: Send a transaction from your connected wallet to another wallet.
      - deploy_ERC20: Deploy a new ERC20 token contract from your connected wallet.
    `,
    tools: Object.values(tools).map((tool) => tool.definition),
  });
}
