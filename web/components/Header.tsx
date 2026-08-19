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

function truncateAddress(addr: string) {
    return addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : "No wallet";
}

export function Header() {
    const { data: session } = useSession();
    const [wallets, setWallets] = useState<Wallet[]>([]);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [addingWallet, setAddingWallet] = useState(false);
    const [isAgentActive, setIsAgentActive] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const activeWallet = wallets.find((w) => w.is_active);
    const userAddress = (session?.user as Record<string, unknown>)?.address as string | undefined;

    useEffect(() => {
        fetchWallets();
        fetch("/api/agent/session/status")
            .then((res) => res.json())
            .then((data) => setIsAgentActive(!!data.isActive))
            .catch(() => setIsAgentActive(false));
    }, []);

    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setDropdownOpen(false);
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
            const accounts = (await window.ethereum.request({ method: "eth_requestAccounts" })) as string[];
            if (!accounts?.length) return;
            const address = getAddress(accounts[0]);
            const nonceRes = await fetch("/api/auth/nonce");
            const { nonce } = await nonceRes.json();
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
            const signature = (await window.ethereum.request({ method: "personal_sign", params: [messageStr, address] })) as string;
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

    const displayAddress = activeWallet?.address || userAddress || "";
    const displayName = activeWallet?.nickname || "Main Wallet";

    return (
        <header className="flex min-h-16 shrink-0 items-center justify-between border-b px-[18px]" style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}>
            <div className="min-w-0">
                <h1 className="text-[15px] font-semibold tracking-[-0.02em] text-[var(--color-text-primary)]">Dimensity</h1>
                <p className="mt-0.5 text-[11px] text-[var(--color-text-muted)]">Base Sepolia <span className="mx-1">•</span> AI Agent</p>
            </div>

            <div className="flex items-center gap-2">
                <div className="flex h-[34px] items-center gap-2 rounded-[9px] border px-3" style={{ background: isAgentActive ? "#0e1213" : "var(--color-surface-overlay)", borderColor: isAgentActive ? "#173425" : "var(--color-border)" }}>
                    <span className={`h-1.5 w-1.5 rounded-full ${isAgentActive ? "bg-[var(--color-success)]" : "bg-[var(--color-text-muted)]"}`} />
                    <span className={`text-[11px] font-medium ${isAgentActive ? "text-[var(--color-success)]" : "text-[var(--color-text-muted)]"}`}>{isAgentActive ? "Agent active" : "Agent off"}</span>
                </div>

                <div className="relative" ref={dropdownRef}>
                    <button onClick={() => setDropdownOpen(!dropdownOpen)} className="flex h-[34px] cursor-pointer items-center gap-2 rounded-[9px] border px-3 text-[11px] transition-colors hover:bg-white/[0.04]" style={{ background: "var(--color-surface-overlay)", borderColor: "var(--color-border)", color: "var(--color-text-primary)" }} aria-expanded={dropdownOpen}>
                        <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-success)]" />
                        <span>{displayName} <span className="text-[var(--color-text-muted)]">{truncateAddress(displayAddress)}</span></span>
                        <span className="ml-1 text-[var(--color-text-muted)]">⌄</span>
                    </button>

                    {dropdownOpen && (
                        <div className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-xl border shadow-[0_20px_60px_rgba(0,0,0,0.45)]" style={{ background: "var(--color-surface-raised)", borderColor: "var(--color-border)" }}>
                            <div className="border-b px-3 py-2.5 text-[10px] font-semibold tracking-[0.1em] text-[var(--color-text-muted)]" style={{ borderColor: "var(--color-border)" }}>YOUR WALLETS</div>
                            {wallets.map((w) => (
                                <button key={w.address} onClick={() => !w.is_active && switchWallet(w.address)} className="flex w-full cursor-pointer items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-white/[0.03]" style={{ background: w.is_active ? "var(--color-surface-overlay)" : "transparent", color: "var(--color-text-primary)" }}>
                                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: w.is_active ? "var(--color-success)" : "var(--color-border-strong)" }} />
                                    <span className="min-w-0 flex-1">
                                        {w.nickname && <span className="block truncate text-xs font-medium">{w.nickname}</span>}
                                        <span className="block truncate text-[11px] text-[var(--color-text-secondary)]">{truncateAddress(w.address)}</span>
                                    </span>
                                    {w.is_active && <span className="rounded bg-[rgba(41,209,122,0.1)] px-1.5 py-0.5 text-[9px] font-medium text-[var(--color-success)]">ACTIVE</span>}
                                </button>
                            ))}
                            <button onClick={handleAddWallet} disabled={addingWallet} className="w-full cursor-pointer border-t px-3 py-2.5 text-left text-[11px] font-medium text-[var(--color-accent-light)] transition-colors hover:bg-white/[0.03] disabled:opacity-50" style={{ borderColor: "var(--color-border)" }}>
                                {addingWallet ? "Adding wallet…" : "+ Add wallet"}
                            </button>
                        </div>
                    )}
                </div>

                <button onClick={() => signOut({ callbackUrl: "/" })} className="hidden cursor-pointer rounded-[9px] border px-3 py-2 text-[11px] text-[var(--color-text-muted)] transition-colors hover:border-[var(--color-border-strong)] hover:text-[var(--color-text-secondary)] sm:block" style={{ borderColor: "var(--color-border)" }}>
                    Sign out
                </button>
            </div>
        </header>
    );
}
