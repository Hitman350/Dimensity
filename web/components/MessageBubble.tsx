"use client";

import type { Message } from "ai";

// Human-readable tool labels
const TOOL_LABELS: Record<string, string> = {
    get_balance: "📊 Checked balance",
    get_wallet_address: "🔑 Looked up wallet address",
    send_transaction: "💸 Send transaction",
    deploy_erc20: "🚀 Deploy ERC-20 token",
    explain_transaction: "🔍 Explained transaction",
    scan_contract: "🛡️ Scanned contract",
    get_token_info: "📋 Fetched token info",
    estimate_gas: "⛽ Estimated gas",
    get_wallet_history: "📜 Fetched transaction history",
    get_eth_price: "💰 Checked ETH price",
};

// Simple link detection for explorer URLs
function formatContent(text: string) {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);

    return parts.map((part, i) => {
        if (urlRegex.test(part)) {
            urlRegex.lastIndex = 0;
            const label = part.includes("/tx/")
                ? "View Transaction ↗"
                : part.includes("/address/")
                    ? "View on Explorer ↗"
                    : "Open Link ↗";
            return (
                <a
                    key={i}
                    href={part}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block mt-1 text-xs font-medium transition-colors"
                    style={{ color: "var(--color-accent-light)" }}
                >
                    {label}
                </a>
            );
        }
        return (
            <span key={i} style={{ whiteSpace: "pre-wrap" }}>
                {part}
            </span>
        );
    });
}

export function MessageBubble({ message }: { message: Message }) {
    const isUser = message.role === "user";

    if (isUser) {
        return (
            <div className="flex justify-end animate-message-in">
                <div
                    className="max-w-[75%] px-4 py-3 rounded-2xl rounded-br-sm text-sm"
                    style={{
                        background: "var(--color-user-bubble)",
                        border: "1px solid var(--color-user-bubble-border)",
                        color: "var(--color-text-primary)",
                    }}
                >
                    {message.content}
                </div>
            </div>
        );
    }

    // Collect tool invocations for this message
    const toolCalls = message.toolInvocations ?? [];

    return (
        <div className="flex items-start gap-3 animate-message-in">
            <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0"
                style={{ background: "var(--color-accent)", color: "white" }}
            >
                D
            </div>
            <div className="max-w-[80%] space-y-2">
                {/* Inline tool call steps */}
                {toolCalls.length > 0 && (
                    <div className="space-y-1">
                        {toolCalls.map((tc) => (
                            <div
                                key={tc.toolCallId}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs"
                                style={{
                                    background: "var(--color-surface-overlay)",
                                    border: "1px solid var(--color-border)",
                                    color: "var(--color-text-secondary)",
                                }}
                            >
                                <span>
                                    {TOOL_LABELS[tc.toolName] || `🔧 ${tc.toolName}`}
                                </span>
                                {tc.state === "result" && (
                                    <span className="text-green-400">✓</span>
                                )}
                                {tc.state === "call" && (
                                    <span className="text-amber-400">⏳</span>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* Text content */}
                {message.content && (
                    <div
                        className="px-4 py-3 rounded-2xl rounded-tl-sm text-sm leading-relaxed"
                        style={{
                            background: "var(--color-surface-raised)",
                            border: "1px solid var(--color-border)",
                            color: "var(--color-text-primary)",
                        }}
                    >
                        {formatContent(message.content)}
                    </div>
                )}
            </div>
        </div>
    );
}
