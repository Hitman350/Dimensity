import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';
import { createPublicClient } from 'viem';
import type {
  Signer,
  TransactionParams,
  DeployParams,
  DeployResult,
  EstimateGasParams,
  GasEstimate,
} from './types';

/**
 * Local development signer — wraps viem wallet client.
 * Uses a raw private key from environment variables.
 * For development / testnet use only.
 */
export class LocalSigner implements Signer {
  private account;
  private walletClient;

  constructor(privateKey: string) {
    this.account = privateKeyToAccount(privateKey as `0x${string}`);
    this.walletClient = createWalletClient({
      account: this.account,
      chain: baseSepolia,
      transport: http(),
    });
  }

  async getAddress(): Promise<string> {
    return this.account.address;
  }

  async sendTransaction(params: TransactionParams): Promise<string> {
    const txHash = await this.walletClient.sendTransaction({
      to: params.to,
      value: params.value,
    });
    return txHash;
  }

  async deployContract(params: DeployParams): Promise<DeployResult> {
    const hash = await this.walletClient.deployContract({
      account: this.account,
      abi: params.abi as readonly unknown[],
      bytecode: params.bytecode,
      args: params.args,
    });

    const publicClient = createPublicClient({
      chain: baseSepolia,
      transport: http(),
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    return {
      hash,
      contractAddress: receipt.contractAddress || '',
    };
  }

  async estimateGas(params: EstimateGasParams): Promise<GasEstimate> {
    const publicClient = createPublicClient({
      chain: baseSepolia,
      transport: http(),
    });

    const [gasUnits, gasPrice] = await Promise.all([
      publicClient.estimateGas({
        account: params.from,
        to: params.to,
        value: params.value,
      }),
      publicClient.getGasPrice(),
    ]);

    return { gasUnits, gasPrice };
  }
}
