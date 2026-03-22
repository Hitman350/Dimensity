// ============================================================
// Universal signer interface. Agent logic never imports from
// signer implementations directly — all signing differences
// live inside LocalSigner / KernelSigner.
// ============================================================

export interface TransactionParams {
  to: `0x${string}`;
  value: bigint;
}

export interface DeployParams {
  abi: readonly unknown[];
  bytecode: `0x${string}`;
  args: unknown[];
}

export interface DeployResult {
  hash: string;
  contractAddress: string;
}

export interface EstimateGasParams {
  to: `0x${string}`;
  value: bigint;
  from: `0x${string}`;
}

export interface GasEstimate {
  gasUnits: bigint;
  gasPrice: bigint;
}

export interface Signer {
  getAddress(): Promise<string>;
  sendTransaction(params: TransactionParams): Promise<string>;
  deployContract(params: DeployParams): Promise<DeployResult>;
  estimateGas(params: EstimateGasParams): Promise<GasEstimate>;
}
