"use client";

import { useState } from "react";
import { createPublicClient, createWalletClient, custom, http } from "viem";
import { baseSepolia } from "viem/chains";
import { signerToEcdsaValidator } from "@zerodev/ecdsa-validator";
import { toPermissionValidator, serializePermissionAccount } from "@zerodev/permissions";
import { toEmptyECDSASigner } from "@zerodev/permissions/signers";
import { toSudoPolicy, toTimestampPolicy } from "@zerodev/permissions/policies";
import { constants, createKernelAccount } from "@zerodev/sdk";

import { useEffect } from "react";

export function AgentMode() {
    const [isAgentActive, setIsAgentActive] = useState(false);
    const [smartAccountAddress, setSmartAccountAddress] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Fetch session status from an API if available
        // For now, we can check if it's active. Let's assume an endpoint /api/agent/session/status
        fetch("/api/agent/session/status")
            .then(res => res.json())
            .then(data => {
                if (data.isActive) {
                    setIsAgentActive(true);
                    setSmartAccountAddress(data.smartAccountAddress);
                }
            })
            .catch(err => console.error(err));
    }, []);

    const enableAgentMode = async () => {
        setLoading(true);
        setError(null);

        try {
            if (typeof window === "undefined" || !window.ethereum) {
                throw new Error("MetaMask not found.");
            }

            // 1. Prepare session on backend
            const prepareRes = await fetch("/api/agent/session/prepare", { method: "POST" });
            if (!prepareRes.ok) throw new Error("Failed to prepare session");
            const { sessionKeyAddress } = await prepareRes.json();

            // 2. Setup Viem public client & connect MetaMask
            const publicClient = createPublicClient({
                chain: baseSepolia,
                transport: http(),
            });

            const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
            const ownerAddress = accounts[0];

            // 2.5 Ensure MetaMask is on Base Sepolia (84532 -> 0x14a34)
            try {
                await window.ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: '0x14a34' }],
                });
            } catch (switchError: any) {
                // This error code indicates that the chain has not been added to MetaMask.
                if (switchError.code === 4902) {
                    throw new Error("Base Sepolia network not found in your MetaMask. Please add it and try again.");
                }
                throw switchError;
            }

            // 3. Create ECDSA Validator for the Owner (MetaMask)
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

            // 4. Calculate Smart Account Address (we don't create it fully if it's just for the UI, but we need the address)
            const account = await createKernelAccount(publicClient, {
                plugins: { sudo: ecdsaValidator },
                entryPoint: constants.getEntryPoint('0.7'),
                kernelVersion: constants.KERNEL_V3_1,
            });

            const computedSmartAccountAddress = account.address;

            // 5. Create the permission validator for the Session Key
            const emptySessionSigner = await toEmptyECDSASigner(sessionKeyAddress as `0x${string}`);

            // Enforce on-chain 24h expiration
            const validUntil = Math.floor(Date.now() / 1000) + 24 * 3600;
            const timestampPolicy = toTimestampPolicy({ validUntil });

            // Note: toSudoPolicy allows all calls, but backend enforces value limits + idempotency
            const sudoPolicy = toSudoPolicy({});

            const permissionPlugin = await toPermissionValidator(publicClient, {
                entryPoint: constants.getEntryPoint('0.7'),
                kernelVersion: constants.KERNEL_V3_1,
                signer: emptySessionSigner,
                policies: [timestampPolicy, sudoPolicy],
            });

            // 6. Sign the permission payload with the Owner's MetaMask (this triggers the popup)
            const sessionKeyAccount = await createKernelAccount(publicClient, {
                entryPoint: constants.getEntryPoint('0.7'),
                kernelVersion: constants.KERNEL_V3_1,
                plugins: {
                    sudo: ecdsaValidator,
                    regular: permissionPlugin,
                },
            });

            // Serialize the permission (which automatically requests the owner's signature)
            // Wait, we need to sign the permission. 
            // In ZeroDev v5, serializePermissionAccount gets the signature and serializes the account.
            const serializedPermission = await serializePermissionAccount(sessionKeyAccount);

            // 7. Authorize on the backend
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
            // Fetch session id (this requires knowing the session ID. 
            // Wait, we can just let the backend revoke the active session for the user).
            // Let's modify the revoke endpoint to revoke ALL active sessions for the user if sessionId is omitted.
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
        <div className="p-3 border rounded-xl" style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}>
            <div className="flex flex-col gap-2">
                <div>
                    <h3 className="text-xs font-semibold" style={{ color: "var(--color-text-primary)" }}>Agent Mode</h3>
                    <p className="text-[10px] mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
                        {isAgentActive && smartAccountAddress ? (
                            <span className="text-green-500">Active: {smartAccountAddress.slice(0,6)}...{smartAccountAddress.slice(-4)}</span>
                        ) : "No MetaMask popups."}
                    </p>
                </div>
                {isAgentActive ? (
                    <button onClick={disableAgentMode} className="w-full py-1.5 text-xs rounded bg-red-500/10 text-red-500 font-medium">Disable</button>
                ) : (
                    <button onClick={enableAgentMode} disabled={loading} className="w-full py-1.5 text-xs rounded bg-green-500 text-white font-medium">
                        {loading ? "Enabling..." : "Enable"}
                    </button>
                )}
            </div>
            {error && <p className="text-red-500 text-[10px] mt-2">{error}</p>}
        </div>
    );
}
