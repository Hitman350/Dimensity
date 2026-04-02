import { Injectable, Inject } from '@nestjs/common';
import { parseEther } from 'viem';
import { SIGNER } from '../signers/signer.module';
import type { Signer } from '../signers/types';
import type { ToolDefinition, ToolService } from './tool.interface';

@Injectable()
export class EstimateGasService implements ToolService {
  constructor(@Inject(SIGNER) private readonly signer: Signer) {}

  readonly definition: ToolDefinition = {
    name: 'estimate_gas',
    description:
      'Estimates gas cost in ETH for a transfer before it is broadcast. Always call this before send_transaction so the user knows the full cost.',
    parameters: {
      type: 'object',
      properties: {
        from: {
          type: 'string',
          description: 'Sender wallet address',
        },
        to: {
          type: 'string',
          description: 'Recipient wallet address',
        },
        value_eth: {
          type: 'string',
          description: "Amount to send in ETH as a string e.g. '0.05'",
        },
      },
      required: ['from', 'to', 'value_eth'],
    },
  };

  async execute(args: {
    from: string;
    to: string;
    value_eth: string;
  }): Promise<string> {
    try {
      const { gasUnits, gasPrice } = await this.signer.estimateGas({
        from: args.from as `0x${string}`,
        to: args.to as `0x${string}`,
        value: parseEther(args.value_eth),
      });

      const gasCostWei = gasUnits * gasPrice;
      const gasCostEth = (Number(gasCostWei) / 1e18).toFixed(8);
      const gasPriceGwei = (Number(gasPrice) / 1e9).toFixed(4);
      const totalEthNeeded = (
        parseFloat(args.value_eth) + parseFloat(gasCostEth)
      ).toFixed(8);

      return JSON.stringify({
        estimated_gas_units: gasUnits.toString(),
        gas_price_gwei: `${gasPriceGwei} Gwei`,
        estimated_gas_cost_eth: `${gasCostEth} ETH`,
        value_to_send_eth: `${args.value_eth} ETH`,
        total_eth_needed: `${totalEthNeeded} ETH`,
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return `Error estimating gas: ${msg}`;
    }
  }
}
