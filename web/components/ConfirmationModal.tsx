"use client";

import { useState, useEffect } from "react";
import { createPublicClient, createWalletClient, custom, http, parseEther } from "viem";
import { baseSepolia } from "viem/chains";
import { signerToEcdsaValidator } from "@zerodev/ecdsa-validator";
import { constants, createKernelAccount, createKernelAccountClient, createZeroDevPaymasterClient } from "@zerodev/sdk";

interface ToolInvocation {
    toolCallId: string;
    toolName: string;
    args: Record<string, string>;
    state: "partial-call" | "call" | "result";
    result?: string;
}

interface ConfirmationModalProps {
    toolCall: ToolInvocation;
    onConfirm: (toolCallId: string, result: string) => void;
    onCancel: (toolCallId: string) => void;
    isAgentActive?: boolean;
}

export default function ConfirmationModal({
    toolCall,
    onConfirm,
    onCancel,
    isAgentActive,
}: ConfirmationModalProps) {
    const [gasEstimate, setGasEstimate] = useState<{
        gas_units: string;
        gas_price_gwei: string;
        total_cost_eth: string;
    } | null>(null);
    const [gasLoading, setGasLoading] = useState(false);
    const [executing, setExecuting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const isSend = toolCall.toolName === "send_transaction";
    const isDeploy = toolCall.toolName === "deploy_erc20";

    // Prefetch gas estimate when modal opens (send_transaction only)
    useEffect(() => {
        if (!isSend) return;

        setGasLoading(true);
        fetch("/api/execute-tool", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                toolName: "estimate_gas",
                args: {
                    to: toolCall.args.to,
                    value: toolCall.args.value || "0.01",
                },
            }),
        })
            .then((res) => res.json())
            .then((data) => {
                if (data.result) {
                    setGasEstimate(JSON.parse(data.result));
                }
            })
            .catch(() => {
                // Gas estimation is best-effort — don't block the modal
            })
            .finally(() => setGasLoading(false));
    }, [isSend, toolCall.args.to, toolCall.args.value]);

    const handleConfirm = async () => {
        setExecuting(true);
        setError(null);

        try {
            if (isAgentActive) {
                const res = await fetch("/api/execute-tool", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        toolName: toolCall.toolName,
                        args: toolCall.args,
                    }),
                });

                const data = await res.json();

                if (!res.ok) {
                    setError(data.error || "Execution failed");
                    setExecuting(false);
                    return;
                }

                onConfirm(toolCall.toolCallId, data.result);
            } else {
                if (typeof window === "undefined" || !window.ethereum) {
                    throw new Error("MetaMask not found.");
                }

                if (isDeploy) {
                    throw new Error("Deployments via manual mode are not yet supported.");
                }

                const publicClient = createPublicClient({ chain: baseSepolia, transport: http() });
                const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
                const ownerAddress = accounts[0];

                try {
                    await window.ethereum.request({
                        method: 'wallet_switchEthereumChain',
                        params: [{ chainId: '0x14a34' }],
                    });
                } catch (switchError: any) {
                    if (switchError.code === 4902) {
                        throw new Error("Base Sepolia network not found in your MetaMask.");
                    }
                    throw switchError;
                }

                const walletClient = createWalletClient({
                    account: ownerAddress as `0x${string}`,
                    chain: baseSepolia,
                    transport: custom(window.ethereum),
                });

                const ecdsaValidator = await signerToEcdsaValidator(publicClient, {
                    signer: {
                        address: ownerAddress as `0x${string}`,
                        type: "local",
                        async signMessage({ message }: any) {
                            return walletClient.signMessage({ account: ownerAddress as `0x${string}`, message });
                        },
                        async signTypedData(typedData: any) {
                            return walletClient.signTypedData({ account: ownerAddress as `0x${string}`, ...typedData });
                        }
                    } as any,
                    entryPoint: constants.getEntryPoint('0.7'),
                    kernelVersion: constants.KERNEL_V3_1,
                });

                const account = await createKernelAccount(publicClient, {
                    plugins: { sudo: ecdsaValidator },
                    entryPoint: constants.getEntryPoint('0.7'),
                    kernelVersion: constants.KERNEL_V3_1,
                });

                const rpcUrl = process.env.NEXT_PUBLIC_ZERODEV_RPC_URL;
                if (!rpcUrl) throw new Error("Missing ZeroDev RPC URL");

                const paymasterClient = createZeroDevPaymasterClient({
                    chain: baseSepolia,
                    transport: http(rpcUrl),
                });

                const kernelClient = createKernelAccountClient({
                    account,
                    chain: baseSepolia,
                    bundlerTransport: http(rpcUrl),
                    paymaster: paymasterClient,
                });

                const userOpHash = await kernelClient.sendUserOperation({
                    calls: [{
                        to: toolCall.args.to as `0x${string}`,
                        value: parseEther(toolCall.args.value || '0.01'),
                        data: '0x',
                    }]
                });

                const receipt = await kernelClient.waitForUserOperationReceipt({ hash: userOpHash });
                const result = `Transaction sent successfully.\nUserOp Hash: ${userOpHash}\nTx Hash: ${receipt.receipt.transactionHash}\nhttps://sepolia.basescan.org/tx/${receipt.receipt.transactionHash}`;

                onConfirm(toolCall.toolCallId, result);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Network error");
            setExecuting(false);
        }
    };

    const handleCancel = () => {
        onCancel(toolCall.toolCallId);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-md mx-4 rounded-2xl border border-[var(--accent)]/30 bg-[var(--surface)] shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-white/10 bg-gradient-to-r from-amber-500/10 to-orange-500/10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                            <span className="text-lg">{isSend ? "💸" : "🚀"}</span>
                        </div>
                        <div>
                            <h3 className="text-white font-semibold text-lg">
                                {isSend ? "Confirm Transaction" : "Confirm Deployment"}
                            </h3>
                            <p className="text-white/50 text-sm">
                                Review before signing on-chain
                            </p>
                        </div>
                    </div>
                </div>

                {/* Details */}
                <div className="px-6 py-5 space-y-3">
                    {isSend && (
                        <>
                            <DetailRow label="Recipient" value={toolCall.args.to} mono />
                            <DetailRow
                                label="Amount"
                                value={`${toolCall.args.value || "0.01"} ETH`}
                            />
                            {gasLoading && (
                                <DetailRow label="Est. Gas Cost" value="Loading..." />
                            )}
                            {gasEstimate && (
                                <>
                                    <DetailRow
                                        label="Gas Units"
                                        value={gasEstimate.gas_units}
                                    />
                                    <DetailRow
                                        label="Gas Price"
                                        value={`${gasEstimate.gas_price_gwei} Gwei`}
                                    />
                                    <DetailRow
                                        label="Est. Gas Cost"
                                        value={`${gasEstimate.total_cost_eth} ETH`}
                                        highlight
                                    />
                                </>
                            )}
                        </>
                    )}

                    {isDeploy && (
                        <>
                            <DetailRow label="Token Name" value={toolCall.args.name} />
                            <DetailRow label="Symbol" value={toolCall.args.symbol} />
                            <DetailRow
                                label="Initial Supply"
                                value={
                                    toolCall.args.initialSupply
                                        ? Number(toolCall.args.initialSupply).toLocaleString()
                                        : "1,000,000,000"
                                }
                            />
                        </>
                    )}

                    {error && (
                        <div className="mt-3 px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                            {error}
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="px-6 py-4 border-t border-white/10 flex gap-3">
                    <button
                        onClick={handleCancel}
                        disabled={executing}
                        className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 text-white/70 hover:bg-white/5 transition-colors disabled:opacity-50 cursor-pointer"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={executing}
                        className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold hover:from-amber-400 hover:to-orange-400 transition-all disabled:opacity-50 cursor-pointer"
                    >
                        {executing ? (
                            <span className="flex items-center justify-center gap-2">
                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Signing...
                            </span>
                        ) : (
                            "Confirm & Sign"
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

function DetailRow({
    label,
    value,
    mono = false,
    highlight = false,
}: {
    label: string;
    value: string;
    mono?: boolean;
    highlight?: boolean;
}) {
    return (
        <div className="flex justify-between items-center">
            <span className="text-white/50 text-sm">{label}</span>
            <span
                className={`text-sm max-w-[60%] text-right truncate ${highlight
                        ? "text-amber-400 font-semibold"
                        : mono
                            ? "text-white/80 font-mono text-xs"
                            : "text-white/90"
                    }`}
            >
                {value}
            </span>
        </div>
    );
}
