import { Module, Global } from '@nestjs/common';
import { BlockchainService } from './blockchain.service';
import { PermissionedAccountService } from './permissioned-account.service';
import { PrismaModule } from '../prisma/prisma.module';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [BlockchainService, PermissionedAccountService],
  exports: [BlockchainService, PermissionedAccountService],
})
export class BlockchainModule {}
