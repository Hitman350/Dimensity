import { config } from 'dotenv';
config();

import { createPublicClient, http, parseEther, Address } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';
import { createKernelAccount, createKernelAccountClient, createZeroDevPaymasterClient, constants } from '@zerodev/sdk';
import { signerToEcdsaValidator } from '@zerodev/ecdsa-validator';

async function main() {
  const pk = process.env.PRIVATE_KEY as `0x${string}`;
  const rpcUrl = process.env.ZERODEV_RPC_URL;
  
  if (!pk || !rpcUrl) throw new Error('Missing env vars');

  const owner = privateKeyToAccount(pk);
  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(process.env.BASE_SEPOLIA_RPC_URL),
  });

  const ecdsaValidator = await signerToEcdsaValidator(publicClient, {
    signer: owner,
    entryPoint: constants.getEntryPoint('0.7'),
    kernelVersion: constants.KERNEL_V3_1,
  });

  const account = await createKernelAccount(publicClient, {
    plugins: { sudo: ecdsaValidator },
    entryPoint: constants.getEntryPoint('0.7'),
    kernelVersion: constants.KERNEL_V3_1,
  });

  console.log('Kernel Smart Account address:', account.address);

  // Check balance before test
  const balance = await publicClient.getBalance({ address: account.address });
  console.log('Smart Account ETH Balance:', balance.toString());

  const paymasterClient = createZeroDevPaymasterClient({
    chain: baseSepolia,
    transport: http(rpcUrl),
  });

  const kernelClient = createKernelAccountClient({
    account,
    chain: baseSepolia,
    bundlerTransport: http(rpcUrl),
    paymaster: {
      getPaymasterData(userOperation) {
        return paymasterClient.sponsorUserOperation({ userOperation });
      },
      getPaymasterStubData(userOperation) {
        return paymasterClient.sponsorUserOperation({ userOperation });
      },
    },
  });

  console.log('Executing 0 ETH self-call...');
  
  try {
    const userOpHash = await kernelClient.sendUserOperation({
      calls: [{
        to: account.address,
        value: 0n,
        data: '0x',
      }],
    });
    
    console.log('UserOp hash:', userOpHash);
    console.log('Waiting for receipt...');
    
    const receipt = await kernelClient.waitForUserOperationReceipt({
      hash: userOpHash,
    });
    
    console.log('Transaction hash:', receipt.receipt.transactionHash);
    console.log('Gas sponsored by paymaster successfully!');
  } catch (error) {
    console.error('UserOp failed:', error);
  }
}

main().catch(console.error);
