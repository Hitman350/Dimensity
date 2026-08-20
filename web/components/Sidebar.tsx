"use client";

import { useState, useEffect, useMemo } from "react";
import { AgentMode } from "./AgentMode";

type ConversationItem = {
    id: string;
    title: string;
    updated_at: string;
    snippet?: string | null;
};

interface SidebarProps {
    activeId: string | null;
    onSelect: (id: string) => void;
    onNewChat: () => void;
}

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function HighlightMatch({
    text,
    query,
    dimmed = false,
}: {
    text: string;
    query: string;
    dimmed?: boolean;
}) {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
        return <span>{text}</span>;
    }

    const parts = text.split(new RegExp(`(${escapeRegExp(trimmedQuery)})`, "gi"));

    return (
        <>
            {parts.map((part, index) =>
                index % 2 === 1 ? (
                    <span
                        key={`${part}-${index}`}
                        className="font-semibold"
                        style={{ color: "var(--color-text-primary)" }}
                    >
                        {part}
                    </span>
                ) : (
                    <span
                        key={`${part}-${index}`}
                        style={{
                            color: dimmed
                                ? "var(--color-text-secondary)"
                                : "inherit",
                        }}
                    >
                        {part}
                    </span>
                )
            )}
        </>
    );
}

function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString();
}

export function Sidebar({ activeId, onSelect, onNewChat }: SidebarProps) {
    const [conversations, setConversations] = useState<ConversationItem[]>([]);
    const [searchResults, setSearchResults] = useState<ConversationItem[] | null>(null);
    const [collapsed, setCollapsed] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [isSearching, setIsSearching] = useState(false);

    const trimmedQuery = searchQuery.trim();
    const isSearchActive = trimmedQuery.length > 0;
    const displayedConversations = isSearchActive
        ? (searchResults ?? [])
        : conversations;

    function handleNewChatClick() {
        setSearchQuery("");
        setSearchResults(null);
        setIsSearching(false);
        onNewChat();
    }

    async function fetchConversations() {
        try {
            const res = await fetch("/api/conversations");
            if (res.ok) {
                const data = await res.json();
                setConversations(data.conversations ?? []);
            }
        } catch (err) {
            console.error("Failed to load conversations", err);
        }
    }

    useEffect(() => {
        fetchConversations();
    }, [activeId]);

    useEffect(() => {
        if (!trimmedQuery) {
            setSearchResults(null);
            setIsSearching(false);
            return;
        }

        setIsSearching(true);
        const timer = setTimeout(async () => {
            try {
                const res = await fetch(
                    `/api/conversations?q=${encodeURIComponent(trimmedQuery)}`
                );
                if (res.ok) {
                    const data = await res.json();
                    setSearchResults(data.conversations ?? []);
                } else {
                    setSearchResults([]);
                }
            } catch (err) {
                console.error("Failed to search conversations", err);
                setSearchResults([]);
            } finally {
                setIsSearching(false);
            }
        }, 250);

        return () => clearTimeout(timer);
    }, [trimmedQuery]);

    async function handleDelete(e: React.MouseEvent, id: string) {
        e.stopPropagation();
        try {
            const res = await fetch(`/api/conversations/${id}`, { method: "DELETE" });
            if (res.ok) {
                setConversations((prev) => prev.filter((c) => c.id !== id));
                setSearchResults((prev) =>
                    prev ? prev.filter((c) => c.id !== id) : prev
                );
                if (activeId === id) {
                    onNewChat();
                }
            }
        } catch (err) {
            console.error("Failed to delete conversation", err);
        }
    }

    const emptyMessage = useMemo(() => {
        if (isSearching) return "Searching...";
        if (isSearchActive) return "No chats match your search.";
        return null;
    }, [isSearching, isSearchActive]);

    if (collapsed) {
        return (
            <div
                className="flex flex-col items-center py-3 gap-3 border-r"
                style={{
                    width: "48px",
                    background: "var(--color-surface-raised)",
                    borderColor: "var(--color-border)",
                }}
            >
                <button
                    onClick={() => setCollapsed(false)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-xs cursor-pointer transition-colors"
                    style={{
                        background: "var(--color-surface-overlay)",
                        border: "1px solid var(--color-border)",
                        color: "var(--color-text-secondary)",
                    }}
                    title="Expand sidebar"
                >
                    ☰
                </button>
                <button
                    onClick={handleNewChatClick}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-xs cursor-pointer transition-colors"
                    style={{
                        background: "linear-gradient(135deg, var(--color-accent), var(--color-accent-light))",
                        color: "white",
                    }}
                    title="New chat"
                >
                    +
                </button>
            </div>
        );
    }

    return (
        <div
            className="flex flex-col border-r h-full"
            style={{
                width: "260px",
                minWidth: "260px",
                background: "var(--color-surface-raised)",
                borderColor: "var(--color-border)",
            }}
        >
            {/* Header */}
            <div
                className="flex flex-col gap-2 px-3 py-3 border-b"
                style={{ borderColor: "var(--color-border)" }}
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            style={{ color: "var(--color-text-secondary)" }}
                        >
                            <path
                                d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v8Z"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinejoin="round"
                            />
                        </svg>
                        <span
                            className="text-xs font-semibold tracking-wide uppercase"
                            style={{ color: "var(--color-text-secondary)" }}
                        >
                            Chats
                        </span>
                    </div>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={handleNewChatClick}
                            className="px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition-colors"
                            style={{
                                background:
                                    "linear-gradient(135deg, var(--color-accent), var(--color-accent-light))",
                                color: "white",
                            }}
                        >
                            + New
                        </button>
                        <button
                            onClick={() => setCollapsed(true)}
                            className="w-7 h-7 rounded-md flex items-center justify-center text-xs cursor-pointer transition-colors"
                            style={{
                                color: "var(--color-text-secondary)",
                            }}
                            title="Collapse sidebar"
                        >
                            ✕
                        </button>
                    </div>
                </div>

                <div data-sidebar-search>
                    <div className="relative flex items-center gap-2 flex-1 min-w-0">
                        <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            className="flex-shrink-0"
                            style={{ color: "var(--color-text-secondary)" }}
                        >
                            <circle
                                cx="11"
                                cy="11"
                                r="7"
                                stroke="currentColor"
                                strokeWidth="2"
                            />
                            <path
                                d="M20 20L16.5 16.5"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                            />
                        </svg>
                        <div className="relative flex-1 min-w-0">
                            <input
                                type="search"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search chats..."
                                className="w-full px-2.5 py-1.5 pr-7 rounded-md text-xs outline-none"
                                style={{
                                    background: "var(--color-surface-overlay)",
                                    border: "1px solid var(--color-border)",
                                    color: "var(--color-text-primary)",
                                }}
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => setSearchQuery("")}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center cursor-pointer"
                                    style={{ color: "var(--color-text-secondary)" }}
                                    title="Clear search"
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                    </div>
                    {isSearchActive && !isSearching && (
                        <p
                            className="mt-1.5 text-[10px]"
                            style={{ color: "var(--color-text-secondary)" }}
                        >
                            {displayedConversations.length}{" "}
                            {displayedConversations.length === 1 ? "result" : "results"}
                        </p>
                    )}
                </div>
            </div>

            {/* Conversation list */}
            <div className="flex-1 overflow-y-auto py-1">
                {displayedConversations.length === 0 && (
                    <div
                        className="px-3 py-6 text-center text-xs"
                        style={{ color: "var(--color-text-secondary)" }}
                    >
                        {emptyMessage ?? (
                            <>
                                No conversations yet.
                                <br />
                                Start a new chat!
                            </>
                        )}
                    </div>
                )}

                {displayedConversations.map((convo) => (
                    <button
                        key={convo.id}
                        onClick={() => onSelect(convo.id)}
                        className="w-full group flex items-start gap-2 px-3 py-2.5 text-left transition-colors cursor-pointer"
                        style={{
                            background:
                                convo.id === activeId
                                    ? "var(--color-surface-overlay)"
                                    : "transparent",
                            borderLeft:
                                convo.id === activeId
                                    ? "2px solid var(--color-accent)"
                                    : "2px solid transparent",
                        }}
                    >
                        {isSearchActive && (
                            <div
                                className="mt-0.5 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                                style={{
                                    border: "1px solid var(--color-border)",
                                    color: "var(--color-text-secondary)",
                                }}
                            >
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                                    <path
                                        d="M8 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm8 4a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM8 16.5c1.5 1 3.5 1.5 8 1.5"
                                        stroke="currentColor"
                                        strokeWidth="1.8"
                                        strokeLinecap="round"
                                    />
                                </svg>
                            </div>
                        )}

                        <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                                <div
                                    className={`text-xs font-medium ${isSearchActive ? "" : "truncate"}`}
                                    style={{
                                        color:
                                            convo.id === activeId
                                                ? "var(--color-text-primary)"
                                                : "var(--color-text-secondary)",
                                    }}
                                >
                                    {isSearchActive ? (
                                        <HighlightMatch
                                            text={convo.title}
                                            query={trimmedQuery}
                                        />
                                    ) : (
                                        convo.title
                                    )}
                                </div>
                                {isSearchActive && (
                                    <span
                                        className="text-[10px] flex-shrink-0"
                                        style={{
                                            color: "var(--color-text-secondary)",
                                            opacity: 0.7,
                                        }}
                                    >
                                        {timeAgo(convo.updated_at)}
                                    </span>
                                )}
                            </div>

                            {isSearchActive && convo.snippet ? (
                                <div
                                    className="text-[10px] mt-1 line-clamp-2"
                                    style={{ color: "var(--color-text-secondary)" }}
                                >
                                    <HighlightMatch
                                        text={convo.snippet}
                                        query={trimmedQuery}
                                        dimmed
                                    />
                                </div>
                            ) : (
                                !isSearchActive && (
                                    <div
                                        className="text-[10px] mt-0.5"
                                        style={{
                                            color: "var(--color-text-secondary)",
                                            opacity: 0.6,
                                        }}
                                    >
                                        {timeAgo(convo.updated_at)}
                                    </div>
                                )
                            )}
                        </div>

                        {!isSearchActive && (
                            <button
                                onClick={(e) => handleDelete(e, convo.id)}
                                className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded flex items-center justify-center text-[10px] transition-opacity cursor-pointer flex-shrink-0"
                                style={{
                                    color: "var(--color-text-secondary)",
                                }}
                                title="Delete"
                            >
                                🗑
                            </button>
                        )}
                    </button>
                ))}
            </div>

            {/* Agent Mode Toggle */}
            <div className="p-3 border-t" style={{ borderColor: "var(--color-border)" }}>
                <AgentMode />
            </div>
        </div>
    );
}
