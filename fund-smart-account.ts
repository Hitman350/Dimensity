import { config } from 'dotenv';
config();

import { createPublicClient, createWalletClient, http, parseEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';

async function main() {
  const pk = process.env.PRIVATE_KEY as `0x${string}`;
  const owner = privateKeyToAccount(pk);

  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(process.env.BASE_SEPOLIA_RPC_URL),
  });

  const walletClient = createWalletClient({
    account: owner,
    chain: baseSepolia,
    transport: http(process.env.BASE_SEPOLIA_RPC_URL),
  });

  const target = '0x62E3E7Ab9aEe23C1D8D72a8AF1983c7A2B4ecEC5';
  const amount = parseEther('0.005');

  console.log(`Sending ${amount} wei to ${target}...`);

  const hash = await walletClient.sendTransaction({
    to: target,
    value: amount,
  });

  console.log('Tx Hash:', hash);
  console.log('Waiting for receipt...');
  
  await publicClient.waitForTransactionReceipt({ hash });
  
  const balance = await publicClient.getBalance({ address: target });
  console.log('Smart Account new balance:', balance.toString());
}

main().catch(console.error);
