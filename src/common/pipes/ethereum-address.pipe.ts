import {
  PipeTransform,
  Injectable,
  BadRequestException,
} from '@nestjs/common';
import { isAddress, getAddress } from 'viem';

/**
 * Validates and checksums an Ethereum address parameter.
 * Rejects garbage input before it can hit the chain RPC.
 */
@Injectable()
export class EthereumAddressPipe implements PipeTransform {
  transform(value: string): `0x${string}` {
    if (!isAddress(value)) {
      throw new BadRequestException(`Invalid Ethereum address: ${value}`);
    }
    return getAddress(value) as `0x${string}`;
  }
}
