import { Module } from '@nestjs/common';
import { TOOL_SERVICES } from './tool.interface';
import { ToolRegistryService } from './tool-registry.service';
import { GetBalanceService } from './getBalance';
import { GetWalletAddressService } from './getWalletAddress';
import { SendTransactionService } from './sendTransaction';
import { DeployErc20Service } from './deployErc20';
import { ExplainTransactionService } from './explainTransaction';
import { ScanContractService } from './scanContract';
import { GetTokenInfoService } from './getTokenInfo';
import { EstimateGasService } from './estimateGas';
import { GetWalletHistoryService } from './getWalletHistory';
import { GetEthPriceService } from './getEthPrice';

// All tool service classes — order matters for the TOOL_SERVICES array
const toolServiceClasses = [
  GetBalanceService,
  GetWalletAddressService,
  SendTransactionService,
  DeployErc20Service,
  ExplainTransactionService,
  ScanContractService,
  GetTokenInfoService,
  EstimateGasService,
  GetWalletHistoryService,
  GetEthPriceService,
];

@Module({
  providers: [
    // Register each tool as an individual injectable service
    ...toolServiceClasses,
    // Provide them as an array via the TOOL_SERVICES token
    {
      provide: TOOL_SERVICES,
      useFactory: (...tools: any[]) => tools,
      inject: toolServiceClasses,
    },
    ToolRegistryService,
  ],
  exports: [ToolRegistryService],
})
export class ToolsModule {}
