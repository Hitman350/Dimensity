"use client";

import { useSession } from "next-auth/react";
import { ChatInterface } from "@/components/ChatInterface";
import { ConnectWallet } from "@/components/ConnectWallet";

export default function Home() {
    const { data: session, status } = useSession();

    // Loading state
    if (status === "loading") {
        return (
            <main
                className="flex items-center justify-center h-screen"
                style={{ background: "var(--color-surface)" }}
            >
                <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    <span
                        className="text-sm"
                        style={{ color: "var(--color-text-secondary)" }}
                    >
                        Loading...
                    </span>
                </div>
            </main>
        );
    }

    // Unauthenticated — show connect screen
    if (!session) {
        return (
            <main
                className="flex flex-col h-screen"
                style={{ background: "var(--color-surface)" }}
            >
                <ConnectWallet />
            </main>
        );
    }

    // Authenticated — show chat
    return (
        <main className="flex flex-col h-screen">
            <ChatInterface />
        </main>
    );
}
