"use client";

import { useState } from "react";
import { SiweMessage } from "siwe";
import { signIn } from "next-auth/react";
import { getAddress } from "viem";

// ConnectWallet — triggers MetaMask, constructs SIWE message, signs, verifies, creates session.

export function ConnectWallet() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleConnect = async () => {
        setLoading(true);
        setError(null);

        try {
            // 1. Check for MetaMask
            if (typeof window === "undefined" || !window.ethereum) {
                throw new Error("MetaMask not found. Please install MetaMask to continue.");
            }

            // 2. Request account access
            const accounts = (await window.ethereum.request({
                method: "eth_requestAccounts",
            })) as string[];

            if (!accounts || accounts.length === 0) {
                throw new Error("No accounts found. Please unlock MetaMask.");
            }

            const address = getAddress(accounts[0]); // EIP-55 checksum required by SIWE

            // 3. Get nonce from server
            const nonceRes = await fetch("/api/auth/nonce");
            const { nonce } = await nonceRes.json();

            if (!nonce) {
                throw new Error("Failed to get nonce from server");
            }

            // 4. Construct SIWE message
            const messageFields = {
                domain: window.location.host,
                address,
                statement: "Sign in to Dimensity — your AI crypto companion.",
                uri: window.location.origin,
                version: "1",
                chainId: 11124, // Abstract Testnet
                nonce,
                issuedAt: new Date().toISOString(), // must be included so server uses same timestamp
            };

            const message = new SiweMessage(messageFields);
            const messageStr = message.prepareMessage();

            // 5. Sign with MetaMask (signs the human-readable prepared text)
            const signature = (await window.ethereum.request({
                method: "personal_sign",
                params: [messageStr, address],
            })) as string;

            // 6. Authenticate via NextAuth credentials provider
            // Send JSON fields (including issuedAt) so server reconstructs exact same message
            const result = await signIn("credentials", {
                message: JSON.stringify(messageFields),
                signature,
                redirect: false,
            });

            if (result?.error) {
                throw new Error("Authentication failed. Please try again.");
            }

            // Success — NextAuth sets the JWT cookie, page will re-render
            window.location.reload();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Connection failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen px-4">
            <div className="max-w-md w-full text-center space-y-8">
                {/* Logo */}
                <div>
                    <div className="text-6xl mb-4">⚡</div>
                    <h1
                        className="text-3xl font-bold tracking-tight"
                        style={{ color: "var(--color-text-primary)" }}
                    >
                        Dimensity
                    </h1>
                    <p
                        className="mt-2 text-sm"
                        style={{ color: "var(--color-text-secondary)" }}
                    >
                        Autonomous AI agent for on-chain execution
                    </p>
                </div>

                {/* Connect Card */}
                <div
                    className="p-6 rounded-2xl border"
                    style={{
                        background: "var(--color-surface-raised)",
                        borderColor: "var(--color-border)",
                    }}
                >
                    <h2
                        className="text-lg font-semibold mb-2"
                        style={{ color: "var(--color-text-primary)" }}
                    >
                        Connect Your Wallet
                    </h2>
                    <p
                        className="text-sm mb-6"
                        style={{ color: "var(--color-text-secondary)" }}
                    >
                        Sign in with your Ethereum wallet. No passwords, no email — just
                        sign a message to prove ownership.
                    </p>

                    <button
                        onClick={handleConnect}
                        disabled={loading}
                        className="w-full px-6 py-3 rounded-xl font-semibold text-white transition-all disabled:opacity-50 cursor-pointer"
                        style={{
                            background:
                                "linear-gradient(135deg, var(--color-accent), var(--color-accent-light))",
                        }}
                    >
                        {loading ? (
                            <span className="flex items-center justify-center gap-2">
                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Connecting...
                            </span>
                        ) : (
                            <span className="flex items-center justify-center gap-2">
                                🦊 Connect with MetaMask
                            </span>
                        )}
                    </button>

                    {error && (
                        <div className="mt-4 px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                            {error}
                        </div>
                    )}
                </div>

                {/* Footer note */}
                <p
                    className="text-xs"
                    style={{ color: "var(--color-text-secondary)" }}
                >
                    Abstract Testnet · No gas fees for signing
                </p>
            </div>
        </div>
    );
}
