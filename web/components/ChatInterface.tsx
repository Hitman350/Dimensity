"use client";

import { useChat } from "@ai-sdk/react";
import { useRef, useEffect } from "react";
import { MessageBubble } from "./MessageBubble";
import { Header } from "./Header";

export function ChatInterface() {
    const {
        messages,
        input,
        handleInputChange,
        handleSubmit,
        isLoading,
        error,
    } = useChat();

    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isLoading]);

    return (
        <div className="flex flex-col h-full">
            <Header />

            {/* Chat area */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto px-4 py-6"
                style={{ background: "var(--color-surface)" }}
            >
                <div className="max-w-3xl mx-auto space-y-4">
                    {messages.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-full min-h-[50vh] text-center">
                            <div
                                className="text-5xl mb-4"
                                style={{ filter: "grayscale(0.2)" }}
                            >
                                ⚡
                            </div>
                            <h2
                                className="text-xl font-semibold mb-2"
                                style={{ color: "var(--color-text-primary)" }}
                            >
                                What can I do for you?
                            </h2>
                            <p
                                className="text-sm max-w-md"
                                style={{ color: "var(--color-text-secondary)" }}
                            >
                                Send ETH, deploy tokens, scan contracts, check balances — just
                                describe what you need in plain English.
                            </p>
                            <div className="grid grid-cols-2 gap-2 mt-6 text-xs">
                                {[
                                    "What is my wallet address?",
                                    "Check my balance",
                                    "Deploy an ERC-20 token",
                                    "Scan a contract for risks",
                                ].map((suggestion) => (
                                    <button
                                        key={suggestion}
                                        type="button"
                                        onClick={() => {
                                            const nativeInputValueSetter =
                                                Object.getOwnPropertyDescriptor(
                                                    window.HTMLInputElement.prototype,
                                                    "value"
                                                )?.set;
                                            const input = document.querySelector(
                                                "#chat-input"
                                            ) as HTMLInputElement;
                                            if (input && nativeInputValueSetter) {
                                                nativeInputValueSetter.call(input, suggestion);
                                                input.dispatchEvent(
                                                    new Event("input", { bubbles: true })
                                                );
                                            }
                                        }}
                                        className="px-3 py-2 rounded-lg text-left transition-colors cursor-pointer"
                                        style={{
                                            background: "var(--color-surface-raised)",
                                            border: "1px solid var(--color-border)",
                                            color: "var(--color-text-secondary)",
                                        }}
                                    >
                                        {suggestion}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {messages.map((message) => (
                        <MessageBubble key={message.id} message={message} />
                    ))}

                    {isLoading && (
                        <div className="flex items-start gap-3 animate-message-in">
                            <div
                                className="w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0"
                                style={{ background: "var(--color-accent)", color: "white" }}
                            >
                                D
                            </div>
                            <div
                                className="px-4 py-3 rounded-xl"
                                style={{ background: "var(--color-surface-raised)" }}
                            >
                                <div className="flex gap-1">
                                    <span className="loading-dot" />
                                    <span className="loading-dot" />
                                    <span className="loading-dot" />
                                </div>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div
                            className="text-sm px-4 py-2 rounded-lg animate-message-in"
                            style={{
                                background: "rgba(239, 68, 68, 0.1)",
                                border: "1px solid rgba(239, 68, 68, 0.3)",
                                color: "#f87171",
                            }}
                        >
                            Error: {error.message}
                        </div>
                    )}
                </div>
            </div>

            {/* Input area */}
            <div
                className="border-t px-4 py-3"
                style={{
                    borderColor: "var(--color-border)",
                    background: "var(--color-surface-raised)",
                }}
            >
                <form
                    onSubmit={handleSubmit}
                    className="max-w-3xl mx-auto flex items-center gap-2"
                >
                    <input
                        id="chat-input"
                        type="text"
                        value={input}
                        onChange={handleInputChange}
                        placeholder="Ask Dimensity anything about your wallet..."
                        disabled={isLoading}
                        className="flex-1 px-4 py-3 rounded-xl text-sm outline-none transition-colors placeholder:text-[var(--color-text-secondary)]"
                        style={{
                            background: "var(--color-surface-overlay)",
                            border: "1px solid var(--color-border)",
                            color: "var(--color-text-primary)",
                        }}
                    />
                    <button
                        type="submit"
                        disabled={isLoading || !input.trim()}
                        className="px-5 py-3 rounded-xl text-sm font-medium text-white transition-all disabled:opacity-40 cursor-pointer"
                        style={{
                            background: `linear-gradient(135deg, var(--color-accent), var(--color-accent-light))`,
                        }}
                    >
                        Send
                    </button>
                </form>
            </div>
        </div>
    );
}
