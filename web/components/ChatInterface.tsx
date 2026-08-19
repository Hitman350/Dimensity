"use client";

import { useChat } from "@ai-sdk/react";
import { useRef, useEffect, useState } from "react";
import { MessageBubble } from "./MessageBubble";
import { Header } from "./Header";
import ConfirmationModal from "./ConfirmationModal";
import type { Message } from "ai";

const CONFIRMABLE_TOOLS = ["send_transaction", "deploy_erc20"];

interface ChatInterfaceProps {
    conversationId: string | null;
}

const suggestions = [
    { title: "Check my balance", description: "See ETH and token balances" },
    { title: "Send ETH", description: "Execute a transfer with Agent Mode" },
    { title: "Deploy a token", description: "Create an ERC-20 on testnet" },
];

export function ChatInterface({ conversationId }: ChatInterfaceProps) {
    const [initialMessages, setInitialMessages] = useState<Message[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [isAgentActive, setIsAgentActive] = useState(false);

    useEffect(() => {
        fetch("/api/agent/session/status")
            .then((res) => res.json())
            .then((data) => setIsAgentActive(!!data.isActive))
            .catch(console.error);
    }, []);

    useEffect(() => {
        if (!conversationId) {
            setInitialMessages([]);
            return;
        }

        let cancelled = false;
        setLoadingHistory(true);

        fetch(`/api/conversations/${conversationId}`)
            .then((res) => res.json())
            .then((data) => {
                if (cancelled) return;
                const msgs: Message[] = (data.messages ?? []).map(
                    (m: { id: string; role: string; content: string }) => ({
                        id: m.id,
                        role: m.role as "user" | "assistant",
                        content: m.content,
                    })
                );
                setInitialMessages(msgs);
            })
            .catch(() => {
                if (!cancelled) setInitialMessages([]);
            })
            .finally(() => {
                if (!cancelled) setLoadingHistory(false);
            });

        return () => {
            cancelled = true;
        };
    }, [conversationId]);

    const chatKey = `${conversationId ?? "new"}-${initialMessages.length}`;

    return (
        <ChatInner
            key={chatKey}
            conversationId={conversationId}
            initialMessages={initialMessages}
            loadingHistory={loadingHistory}
            isAgentActive={isAgentActive}
        />
    );
}

function ChatInner({
    conversationId,
    initialMessages,
    loadingHistory,
    isAgentActive,
}: {
    conversationId: string | null;
    initialMessages: Message[];
    loadingHistory: boolean;
    isAgentActive: boolean;
}) {
    const {
        messages,
        input,
        handleInputChange,
        handleSubmit,
        isLoading,
        error,
        addToolResult,
    } = useChat({
        initialMessages,
        body: { conversationId },
    });

    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [messages, isLoading]);

    useEffect(() => {
        if (!isLoading && inputRef.current) inputRef.current.focus();
    }, [isLoading]);

    const pendingToolCall = messages
        .flatMap((m) =>
            (m.toolInvocations ?? []).map((t) => ({ ...t, messageId: m.id }))
        )
        .find(
            (t) =>
                t.state === "call" &&
                CONFIRMABLE_TOOLS.includes(t.toolName) &&
                !("result" in t && t.result !== undefined)
        );

    const handleConfirm = (toolCallId: string, result: string) => {
        addToolResult({ toolCallId, result });
    };

    const handleCancel = (toolCallId: string) => {
        addToolResult({ toolCallId, result: "User cancelled this action." });
    };

    function useSuggestion(text: string) {
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
            window.HTMLInputElement.prototype,
            "value"
        )?.set;
        const el = document.querySelector("#chat-input") as HTMLInputElement | null;
        if (el && nativeInputValueSetter) {
            nativeInputValueSetter.call(el, text);
            el.dispatchEvent(new Event("input", { bubbles: true }));
            el.focus();
        }
    }

    return (
        <div className="flex h-full min-w-0 flex-col">
            <Header />

            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto px-4 sm:px-8"
                style={{ background: "var(--color-surface)" }}
            >
                <div className="mx-auto flex min-h-full w-full max-w-[920px] flex-col pb-6 pt-10">
                    {loadingHistory && (
                        <div className="flex flex-1 items-center justify-center">
                            <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
                                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/10 border-t-[var(--color-accent-light)]" />
                                Loading conversation…
                            </div>
                        </div>
                    )}

                    {!loadingHistory && messages.length === 0 && (
                        <div className="flex flex-1 flex-col items-center">
                            <div className="mt-5 flex h-16 w-16 items-center justify-center rounded-[20px] bg-[linear-gradient(135deg,#7b69ff,#5c4be4)] text-[28px] font-bold tracking-[-0.05em] text-white shadow-[0_16px_50px_rgba(110,92,242,0.2)]">
                                D
                            </div>
                            <h2 className="mt-4 text-center text-[26px] font-semibold tracking-[-0.03em] text-[var(--color-text-primary)]">
                                Your AI agent for on-chain actions
                            </h2>
                            <p className="mt-2 max-w-[430px] text-center text-[13px] leading-5 text-[var(--color-text-secondary)]">
                                Ask questions, inspect your wallet, or let Dimensity execute transactions through your authorized agent session.
                            </p>

                            <div className="mt-4 flex flex-wrap justify-center gap-2">
                                {[
                                    ["Explore", "Ask about your wallet"],
                                    ["Execute", "Send or deploy"],
                                    ["Analyze", "Inspect on-chain data"],
                                ].map(([label, description]) => (
                                    <span key={label} className="rounded-[9px] border px-3 py-2 text-[10px]" style={{ borderColor: "var(--color-border)", background: "var(--color-surface-overlay)", color: "var(--color-text-secondary)" }} title={description}>
                                        {label}
                                    </span>
                                ))}
                            </div>

                            <div className="mt-10 grid w-full grid-cols-1 gap-3 sm:grid-cols-3">
                                {suggestions.map((suggestion) => (
                                    <button
                                        key={suggestion.title}
                                        type="button"
                                        onClick={() => useSuggestion(suggestion.title)}
                                        className="group rounded-[12px] border p-3.5 text-left transition-all hover:-translate-y-px hover:border-[#37344e] hover:bg-[#0f0f18]"
                                        style={{ background: "var(--color-surface-soft)", borderColor: "var(--color-border)" }}
                                    >
                                        <div className="text-[12px] font-medium text-[var(--color-text-primary)]">{suggestion.title}</div>
                                        <div className="mt-1.5 text-[10px] leading-4 text-[var(--color-text-muted)]">{suggestion.description}</div>
                                    </button>
                                ))}
                            </div>

                            {!isAgentActive && (
                                <div className="mt-5 flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] text-[var(--color-text-muted)]" style={{ borderColor: "var(--color-border)", background: "var(--color-surface-raised)" }}>
                                    <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-text-muted)]" />
                                    Agent Mode is off — read-only wallet questions are still available
                                </div>
                            )}
                        </div>
                    )}

                    {messages.length > 0 && (
                        <div className="space-y-5">
                            {messages.map((message) => (
                                <MessageBubble key={message.id} message={message} />
                            ))}
                        </div>
                    )}

                    {isLoading && (
                        <div className="mt-5 flex items-start gap-3 animate-message-in">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-[linear-gradient(135deg,#7b69ff,#5c4be4)] text-sm font-bold text-white">D</div>
                            <div className="rounded-[12px] border px-4 py-3" style={{ background: "var(--color-surface-raised)", borderColor: "var(--color-border)" }}>
                                <div className="flex gap-1"><span className="loading-dot" /><span className="loading-dot" /><span className="loading-dot" /></div>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="mt-5 rounded-[10px] border px-3.5 py-3 text-xs leading-5 animate-message-in" style={{ background: "rgba(240,100,120,0.06)", borderColor: "rgba(240,100,120,0.2)", color: "var(--color-danger)" }}>
                            <span className="font-medium">Something went wrong.</span> {error.message}
                        </div>
                    )}
                </div>
            </div>

            <div className="shrink-0 border-t px-4 pb-3 pt-3 sm:px-8" style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}>
                <form onSubmit={handleSubmit} className="mx-auto w-full max-w-[920px]">
                    <div className="flex items-center gap-2 rounded-[16px] border p-2 transition-colors focus-within:border-[#403b62]" style={{ background: "var(--color-surface-raised)", borderColor: "var(--color-border)" }}>
                        <input
                            ref={inputRef}
                            id="chat-input"
                            type="text"
                            value={input}
                            onChange={handleInputChange}
                            placeholder="Ask Dimensity to inspect or act on your wallet…"
                            disabled={isLoading}
                            className="min-w-0 flex-1 bg-transparent px-2 py-2 text-[13px] text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-muted)]"
                        />
                        <button
                            type="submit"
                            disabled={isLoading || !input.trim()}
                            className="h-10 shrink-0 cursor-pointer rounded-[10px] bg-[linear-gradient(135deg,#7b69ff,#5c4be4)] px-5 text-[12px] font-medium text-white shadow-[0_8px_24px_rgba(110,92,242,0.16)] transition-all hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:translate-y-0"
                        >
                            {isLoading ? "Working…" : "Send"}
                        </button>
                    </div>
                    <p className="mt-2 text-[10px] text-[var(--color-text-muted)]">
                        {isAgentActive ? "Agent actions are protected by your active session permissions." : "Enable Agent Mode when you want Dimensity to execute on-chain actions."}
                    </p>
                </form>
            </div>

            {pendingToolCall && (
                <ConfirmationModal
                    toolCall={pendingToolCall}
                    onConfirm={handleConfirm}
                    onCancel={handleCancel}
                    isAgentActive={isAgentActive}
                />
            )}
        </div>
    );
}
