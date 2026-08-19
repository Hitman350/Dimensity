"use client";

import { useEffect, useState } from "react";
import { createPublicClient, createWalletClient, custom, http } from "viem";
import { baseSepolia } from "viem/chains";
import { signerToEcdsaValidator } from "@zerodev/ecdsa-validator";
import { toPermissionValidator, serializePermissionAccount } from "@zerodev/permissions";
import { toEmptyECDSASigner } from "@zerodev/permissions/signers";
import { toSudoPolicy, toTimestampPolicy } from "@zerodev/permissions/policies";
import { constants, createKernelAccount } from "@zerodev/sdk";

export function AgentMode() {
    const [isAgentActive, setIsAgentActive] = useState(false);
    const [smartAccountAddress, setSmartAccountAddress] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetch("/api/agent/session/status")
            .then((res) => res.json())
            .then((data) => {
                if (data.isActive) {
                    setIsAgentActive(true);
                    setSmartAccountAddress(data.smartAccountAddress);
                }
            })
            .catch((err) => console.error(err));
    }, []);

    const enableAgentMode = async () => {
        setLoading(true);
        setError(null);

        try {
            if (typeof window === "undefined" || !window.ethereum) {
                throw new Error("MetaMask not found.");
            }

            const prepareRes = await fetch("/api/agent/session/prepare", { method: "POST" });
            if (!prepareRes.ok) throw new Error("Failed to prepare session");
            const { sessionKeyAddress } = await prepareRes.json();

            const publicClient = createPublicClient({
                chain: baseSepolia,
                transport: http(),
            });

            const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
            const ownerAddress = accounts[0];

            try {
                await window.ethereum.request({
                    method: "wallet_switchEthereumChain",
                    params: [{ chainId: "0x14a34" }],
                });
            } catch (switchError: any) {
                if (switchError.code === 4902) {
                    throw new Error("Base Sepolia network not found in your MetaMask. Please add it and try again.");
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
                    },
                } as any,
                entryPoint: constants.getEntryPoint("0.7"),
                kernelVersion: constants.KERNEL_V3_1,
            });

            const account = await createKernelAccount(publicClient, {
                plugins: { sudo: ecdsaValidator },
                entryPoint: constants.getEntryPoint("0.7"),
                kernelVersion: constants.KERNEL_V3_1,
            });

            const computedSmartAccountAddress = account.address;
            const emptySessionSigner = await toEmptyECDSASigner(sessionKeyAddress as `0x${string}`);
            const validUntil = Math.floor(Date.now() / 1000) + 24 * 3600;
            const timestampPolicy = toTimestampPolicy({ validUntil });
            const sudoPolicy = toSudoPolicy({});

            const permissionPlugin = await toPermissionValidator(publicClient, {
                entryPoint: constants.getEntryPoint("0.7"),
                kernelVersion: constants.KERNEL_V3_1,
                signer: emptySessionSigner,
                policies: [timestampPolicy, sudoPolicy],
            });

            const sessionKeyAccount = await createKernelAccount(publicClient, {
                entryPoint: constants.getEntryPoint("0.7"),
                kernelVersion: constants.KERNEL_V3_1,
                plugins: {
                    sudo: ecdsaValidator,
                    regular: permissionPlugin,
                },
            });

            const serializedPermission = await serializePermissionAccount(sessionKeyAccount);

            const authRes = await fetch("/api/agent/session/authorize", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    serializedPermission,
                    smartAccountAddress: computedSmartAccountAddress,
                    sessionKeyAddress,
                }),
            });

            if (!authRes.ok) throw new Error("Failed to authorize session on backend");

            alert("Agent Mode Enabled Successfully!");
            window.location.reload();
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Failed to enable Agent Mode");
        } finally {
            setLoading(false);
        }
    };

    const disableAgentMode = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch("/api/agent/session/revoke", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ revokeAll: true }),
            });
            if (!res.ok) throw new Error("Failed to disable Agent Mode");

            setIsAgentActive(false);
            setSmartAccountAddress(null);
            alert("Agent Mode Disabled");
            window.location.reload();
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Failed to disable");
        } finally {
            setLoading(false);
        }
    };

    return (
        <section
            className="rounded-[14px] border p-[14px]"
            style={{
                borderColor: isAgentActive ? "#382e6b" : "var(--color-border)",
                background: isAgentActive ? "#0f0d1a" : "var(--color-surface-overlay)",
            }}
            aria-label="Agent Mode"
        >
            <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold tracking-[0.02em] text-[var(--color-accent-light)]">⚡ Agent Mode</span>
                <span className="text-[9px] font-medium text-[var(--color-text-muted)]">24H SESSION</span>
            </div>

            {isAgentActive ? (
                <>
                    <div className="mt-2 flex items-center gap-2">
                        <span className="agent-pulse h-1.5 w-1.5 rounded-full bg-[var(--color-success)]" />
                        <span className="text-[13px] font-semibold text-[var(--color-success)]">Active</span>
                    </div>
                    <div className="mt-2 space-y-0.5 text-[10px] leading-[17px] text-[var(--color-text-secondary)]">
                        <p>Session key authorized</p>
                        <p>23h 41m remaining</p>
                        <p>Transaction limit <span className="text-[var(--color-text-primary)]">0.01 ETH</span></p>
                    </div>
                    {smartAccountAddress && (
                        <p className="mt-1 truncate font-mono text-[9px] text-[var(--color-text-muted)]" title={smartAccountAddress}>
                            {smartAccountAddress.slice(0, 8)}…{smartAccountAddress.slice(-6)}
                        </p>
                    )}
                    <button
                        onClick={disableAgentMode}
                        disabled={loading}
                        className="mt-3 flex h-8 w-full cursor-pointer items-center justify-center rounded-[8px] border text-[11px] font-medium transition-colors hover:bg-red-500/[0.06] disabled:cursor-not-allowed disabled:opacity-50"
                        style={{ borderColor: "#382e6b", color: "var(--color-text-primary)" }}
                    >
                        {loading ? "Revoking…" : "Revoke agent session"}
                    </button>
                </>
            ) : (
                <>
                    <p className="mt-2 text-[10px] leading-[16px] text-[var(--color-text-secondary)]">
                        Let Dimensity execute approved on-chain actions without repeated wallet popups.
                    </p>
                    <button
                        onClick={enableAgentMode}
                        disabled={loading}
                        className="mt-3 flex h-9 w-full cursor-pointer items-center justify-center rounded-[9px] bg-[linear-gradient(135deg,#7b69ff,#5c4be4)] text-[11px] font-semibold text-white shadow-[0_8px_24px_rgba(110,92,242,0.18)] transition-transform hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {loading ? "Authorizing agent…" : "Enable Agent Mode"}
                    </button>
                </>
            )}

            {error && (
                <div className="mt-2 rounded-[8px] border border-red-500/20 bg-red-500/[0.06] px-2.5 py-2 text-[10px] leading-[15px] text-[var(--color-danger)]">
                    {error}
                </div>
            )}
        </section>
    );
}
