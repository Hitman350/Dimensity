"use client";

import { useState, useEffect, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import { SiweMessage } from "siwe";
import { getAddress } from "viem";

type Wallet = {
    address: string;
    nickname: string | null;
    chain: string;
    is_active: boolean;
};

export function Header() {
    const { data: session } = useSession();
    const [wallets, setWallets] = useState<Wallet[]>([]);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [addingWallet, setAddingWallet] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const activeWallet = wallets.find((w) => w.is_active);
    const userAddress = (session?.user as Record<string, unknown>)?.address as
        | string
        | undefined;

    // Fetch wallets on mount
    useEffect(() => {
        fetchWallets();
    }, []);

    // Close dropdown on outside click
    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(e.target as Node)
            ) {
                setDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, []);

    async function fetchWallets() {
        try {
            const res = await fetch("/api/wallets");
            if (res.ok) {
                const data = await res.json();
                setWallets(data.wallets);
            }
        } catch (err) {
            console.error("Failed to fetch wallets", err);
        }
    }

    async function switchWallet(address: string) {
        try {
            await fetch(`/api/wallets/${address}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ is_active: true }),
            });
            await fetchWallets();
            setDropdownOpen(false);
        } catch (err) {
            console.error("Failed to switch wallet", err);
        }
    }

    async function handleAddWallet() {
        if (addingWallet) return;
        setAddingWallet(true);

        try {
            if (!window.ethereum) {
                alert("MetaMask not found");
                return;
            }

            const accounts = (await window.ethereum.request({
                method: "eth_requestAccounts",
            })) as string[];

            if (!accounts?.length) return;

            const address = getAddress(accounts[0]);

            // Get nonce
            const nonceRes = await fetch("/api/auth/nonce");
            const { nonce } = await nonceRes.json();

            // Build SIWE message
            const message = new SiweMessage({
                domain: window.location.host,
                address,
                statement: "Add this wallet to your Dimensity account.",
                uri: window.location.origin,
                version: "1",
                chainId: 11124,
                nonce,
            });

            const messageStr = message.prepareMessage();

            // Sign with MetaMask
            const signature = (await window.ethereum.request({
                method: "personal_sign",
                params: [messageStr, address],
            })) as string;

            // Add wallet
            const res = await fetch("/api/wallets", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: messageStr, signature }),
            });

            if (!res.ok) {
                const err = await res.json();
                alert(err.error || "Failed to add wallet");
                return;
            }

            await fetchWallets();
            setDropdownOpen(false);
        } catch (err) {
            console.error("Failed to add wallet", err);
        } finally {
            setAddingWallet(false);
        }
    }

    function truncateAddress(addr: string) {
        return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
    }

    const displayAddress = activeWallet?.address || userAddress || "";
    const displayName = activeWallet?.nickname || null;

    return (
        <header
            className="flex items-center justify-between px-6 py-3 border-b"
            style={{
                borderColor: "var(--color-border)",
                background: "var(--color-surface-raised)",
            }}
        >
            {/* Left — Logo */}
            <div className="flex items-center gap-3">
                <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-lg font-bold"
                    style={{
                        background:
                            "linear-gradient(135deg, var(--color-accent), var(--color-accent-light))",
                        color: "white",
                    }}
                >
                    D
                </div>
                <div>
                    <h1
                        className="text-sm font-semibold"
                        style={{ color: "var(--color-text-primary)" }}
                    >
                        Dimensity
                    </h1>
                    <p
                        className="text-xs"
                        style={{ color: "var(--color-text-secondary)" }}
                    >
                        Abstract Testnet • AI Agent
                    </p>
                </div>
            </div>

            {/* Right — Wallet switcher + Sign out */}
            <div className="flex items-center gap-3">
                {/* Wallet dropdown */}
                <div className="relative" ref={dropdownRef}>
                    <button
                        onClick={() => setDropdownOpen(!dropdownOpen)}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-colors cursor-pointer"
                        style={{
                            background: "var(--color-surface-overlay)",
                            border: "1px solid var(--color-border)",
                            color: "var(--color-text-primary)",
                        }}
                    >
                        <div
                            className="w-2 h-2 rounded-full"
                            style={{ background: "#22c55e" }}
                        />
                        <span>
                            {displayName
                                ? `${displayName} (${truncateAddress(displayAddress)})`
                                : truncateAddress(displayAddress)}
                        </span>
                        <svg
                            width="10"
                            height="6"
                            viewBox="0 0 10 6"
                            fill="none"
                            style={{
                                transform: dropdownOpen
                                    ? "rotate(180deg)"
                                    : "rotate(0deg)",
                                transition: "transform 0.15s",
                            }}
                        >
                            <path
                                d="M1 1L5 5L9 1"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                    </button>

                    {dropdownOpen && (
                        <div
                            className="absolute right-0 top-full mt-1 w-64 rounded-xl border shadow-lg z-50 overflow-hidden"
                            style={{
                                background: "var(--color-surface-raised)",
                                borderColor: "var(--color-border)",
                            }}
                        >
                            <div
                                className="px-3 py-2 text-xs font-medium border-b"
                                style={{
                                    color: "var(--color-text-secondary)",
                                    borderColor: "var(--color-border)",
                                }}
                            >
                                Your Wallets
                            </div>

                            {wallets.map((w) => (
                                <button
                                    key={w.address}
                                    onClick={() =>
                                        !w.is_active && switchWallet(w.address)
                                    }
                                    className="w-full px-3 py-2.5 flex items-center gap-2 text-left text-xs transition-colors cursor-pointer"
                                    style={{
                                        color: "var(--color-text-primary)",
                                        background: w.is_active
                                            ? "var(--color-surface-overlay)"
                                            : "transparent",
                                    }}
                                >
                                    <div
                                        className="w-2 h-2 rounded-full flex-shrink-0"
                                        style={{
                                            background: w.is_active
                                                ? "#22c55e"
                                                : "var(--color-border)",
                                        }}
                                    />
                                    <div className="flex-1 min-w-0">
                                        {w.nickname && (
                                            <div className="font-medium truncate">
                                                {w.nickname}
                                            </div>
                                        )}
                                        <div
                                            className="truncate"
                                            style={{
                                                color: "var(--color-text-secondary)",
                                            }}
                                        >
                                            {truncateAddress(w.address)}
                                        </div>
                                    </div>
                                    {w.is_active && (
                                        <span
                                            className="text-[10px] px-1.5 py-0.5 rounded"
                                            style={{
                                                background: "#22c55e20",
                                                color: "#22c55e",
                                            }}
                                        >
                                            active
                                        </span>
                                    )}
                                </button>
                            ))}

                            <button
                                onClick={handleAddWallet}
                                disabled={addingWallet}
                                className="w-full px-3 py-2.5 text-xs text-left transition-colors cursor-pointer border-t"
                                style={{
                                    color: "var(--color-accent)",
                                    borderColor: "var(--color-border)",
                                }}
                            >
                                {addingWallet ? "Adding..." : "+ Add Wallet"}
                            </button>
                        </div>
                    )}
                </div>

                {/* Sign out */}
                <button
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="px-3 py-1.5 rounded-lg text-xs transition-colors cursor-pointer"
                    style={{
                        border: "1px solid var(--color-border)",
                        color: "var(--color-text-secondary)",
                    }}
                >
                    Sign Out
                </button>
            </div>
        </header>
    );
}
