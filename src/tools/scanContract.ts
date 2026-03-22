import { ToolConfig } from "./allTools.js";
import { createViemPublicClient } from "../viem/createViemPublicClient.js";

interface ScanContractArgs {
  contract_address: string;
}

interface Finding {
  severity: string;
  label: string;
}

export const scanContractTool: ToolConfig<ScanContractArgs> = {
  definition: {
    type: "function",
    function: {
      name: "scan_contract",
      description:
        "Scans a deployed contract's bytecode for dangerous function selectors including mint, pause, blacklist, and ownership transfer functions. Returns a structured risk report with CRITICAL/HIGH/MEDIUM/LOW severity levels.",
      parameters: {
        type: "object",
        properties: {
          contract_address: {
            type: "string",
            description: "Contract address to scan (0x...)",
          },
        },
        required: ["contract_address"],
      },
    },
  },

  handler: async ({ contract_address }: ScanContractArgs): Promise<string> => {
    try {
      const client = createViemPublicClient();

      const bytecode = await client.getBytecode({
        address: contract_address as `0x${string}`,
      });

      if (!bytecode || bytecode === "0x") {
        return "No contract found at this address. It may be a wallet (EOA), not a contract.";
      }

      const SUSPICIOUS_SELECTORS: Record<
        string,
        { label: string; severity: string }
      > = {
        "40c10f19": {
          label: "mint(address,uint256) — owner can mint unlimited tokens",
          severity: "CRITICAL",
        },
        "8456cb59": {
          label: "pause() — contract can be paused, freezing all transfers",
          severity: "HIGH",
        },
        "3f4ba83a": {
          label: "unpause() — contract has pause/unpause mechanism",
          severity: "HIGH",
        },
        f2fde38b: {
          label: "transferOwnership(address) — ownership can be transferred",
          severity: "HIGH",
        },
        e47d6060: {
          label: "setBlacklist(address) — wallets can be blacklisted",
          severity: "CRITICAL",
        },
        "44337ea1": {
          label: "addToBlacklist(address) — wallet blacklisting confirmed",
          severity: "CRITICAL",
        },
        "8da5cb5b": {
          label: "owner() — contract has a privileged owner",
          severity: "MEDIUM",
        },
        "715018a6": {
          label:
            "renounceOwnership() — owner CAN renounce (check if called)",
          severity: "LOW",
        },
        "42966c68": {
          label: "burn(uint256) — tokens can be burned",
          severity: "LOW",
        },
      };

      const findings: Finding[] = [];

      for (const [selector, info] of Object.entries(SUSPICIOUS_SELECTORS)) {
        if (bytecode.includes(selector)) {
          findings.push({ severity: info.severity, label: info.label });
        }
      }

      let overall_risk = "LOW";
      if (findings.some((f) => f.severity === "CRITICAL")) {
        overall_risk = "CRITICAL";
      } else if (findings.some((f) => f.severity === "HIGH")) {
        overall_risk = "HIGH";
      } else if (findings.some((f) => f.severity === "MEDIUM")) {
        overall_risk = "MEDIUM";
      }

      const recommendationMap: Record<string, string> = {
        CRITICAL: "⛔ Do NOT interact. Critical control functions detected.",
        HIGH: "⚠️ High risk. Review all findings before interacting.",
        MEDIUM: "🟡 Moderate risk. Standard caution advised.",
        LOW: "✅ No major red flags. Always do your own research.",
      };
      const recommendation = recommendationMap[overall_risk];

      return JSON.stringify({
        contract: contract_address,
        overall_risk,
        bytecode_size: `${Math.floor(bytecode.length / 2)} bytes`,
        findings: {
          critical: findings
            .filter((f) => f.severity === "CRITICAL")
            .map((f) => f.label),
          high: findings
            .filter((f) => f.severity === "HIGH")
            .map((f) => f.label),
          medium: findings
            .filter((f) => f.severity === "MEDIUM")
            .map((f) => f.label),
          low: findings
            .filter((f) => f.severity === "LOW")
            .map((f) => f.label),
        },
        recommendation,
        explorer: `https://explorer.testnet.abs.xyz/address/${contract_address}`,
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return `Error scanning contract: ${msg}`;
    }
  },
};
