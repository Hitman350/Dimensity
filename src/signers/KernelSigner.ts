import type {
  Signer,
  TransactionParams,
  DeployParams,
  DeployResult,
  EstimateGasParams,
  GasEstimate,
} from "./types.js";

/**
 * Placeholder for ZeroDev Kernel signer (ERC-4337 account abstraction).
 * Full implementation deferred to frontend phase when passkey auth UI
 * is available. All methods throw until then.
 */
export class KernelSigner implements Signer {
  private fail(): never {
    throw new Error("KernelSigner (ZeroDev AA) not yet implemented");
  }

  async getAddress(): Promise<string> {
    this.fail();
  }

  async sendTransaction(_params: TransactionParams): Promise<string> {
    this.fail();
  }

  async deployContract(_params: DeployParams): Promise<DeployResult> {
    this.fail();
  }

  async estimateGas(_params: EstimateGasParams): Promise<GasEstimate> {
    this.fail();
  }
}
