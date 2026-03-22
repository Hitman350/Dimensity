"use client";

import type { Message } from "ai";

// Simple link detection for explorer URLs
function formatContent(text: string) {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);

    return parts.map((part, i) => {
        if (urlRegex.test(part)) {
            // Reset regex lastIndex
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
        // Render text with preserved whitespace and newlines
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

    return (
        <div className="flex items-start gap-3 animate-message-in">
            <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0"
                style={{ background: "var(--color-accent)", color: "white" }}
            >
                D
            </div>
            <div
                className="max-w-[80%] px-4 py-3 rounded-2xl rounded-tl-sm text-sm leading-relaxed"
                style={{
                    background: "var(--color-surface-raised)",
                    border: "1px solid var(--color-border)",
                    color: "var(--color-text-primary)",
                }}
            >
                {formatContent(message.content)}
            </div>
        </div>
    );
}
