"use client";

import { useState, useEffect } from "react";
import { AgentMode } from "./AgentMode";

type ConversationItem = {
    id: string;
    title: string;
    updated_at: string;
};

interface SidebarProps {
    activeId: string | null;
    onSelect: (id: string) => void;
    onNewChat: () => void;
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

function DimensityMark({ small = false }: { small?: boolean }) {
    return (
        <div
            className={`${small ? "h-8 w-8 rounded-[10px]" : "h-10 w-10 rounded-[12px]"} flex shrink-0 items-center justify-center bg-[linear-gradient(135deg,#7b69ff,#5c4be4)] text-white shadow-[0_8px_24px_rgba(110,92,242,0.18)]`}
            aria-hidden="true"
        >
            <span className={`${small ? "text-sm" : "text-lg"} font-bold tracking-[-0.04em]`}>D</span>
        </div>
    );
}

export function Sidebar({ activeId, onSelect, onNewChat }: SidebarProps) {
    const [conversations, setConversations] = useState<ConversationItem[]>([]);
    const [collapsed, setCollapsed] = useState(false);

    async function fetchConversations() {
        try {
            const res = await fetch("/api/conversations");
            if (res.ok) {
                const data = await res.json();
                setConversations(data.conversations);
            }
        } catch (err) {
            console.error("Failed to load conversations", err);
        }
    }

    useEffect(() => {
        fetchConversations();
    }, [activeId]);

    async function handleDelete(e: React.MouseEvent, id: string) {
        e.stopPropagation();
        try {
            const res = await fetch(`/api/conversations/${id}`, { method: "DELETE" });
            if (res.ok) {
                setConversations((prev) => prev.filter((c) => c.id !== id));
                if (activeId === id) onNewChat();
            }
        } catch (err) {
            console.error("Failed to delete conversation", err);
        }
    }

    if (collapsed) {
        return (
            <aside
                className="flex h-full w-14 shrink-0 flex-col items-center gap-3 border-r py-3"
                style={{ background: "var(--color-surface-raised)", borderColor: "var(--color-border)" }}
            >
                <button
                    onClick={() => setCollapsed(false)}
                    className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-[10px] border text-sm transition-colors hover:bg-white/[0.04]"
                    style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}
                    title="Expand sidebar"
                    aria-label="Expand sidebar"
                >
                    ‹
                </button>
                <button
                    onClick={onNewChat}
                    className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-[10px] bg-[linear-gradient(135deg,#7b69ff,#5c4be4)] text-lg text-white shadow-[0_8px_24px_rgba(110,92,242,0.18)]"
                    title="New chat"
                    aria-label="New chat"
                >
                    +
                </button>
                <div className="mt-auto">
                    <DimensityMark small />
                </div>
            </aside>
        );
    }

    return (
        <aside
            className="flex h-full w-[272px] min-w-[272px] flex-col border-r"
            style={{ background: "var(--color-surface-raised)", borderColor: "var(--color-border)" }}
        >
            <div className="flex items-center gap-3 px-[18px] pt-[18px]">
                <DimensityMark />
                <div className="min-w-0">
                    <div className="text-[15px] font-semibold tracking-[-0.02em] text-[var(--color-text-primary)]">Dimensity</div>
                    <div className="mt-0.5 text-[9px] font-medium tracking-[0.12em] text-[var(--color-text-muted)]">AI ON-CHAIN AGENT</div>
                </div>
            </div>

            <div className="px-[18px] pt-5">
                <button
                    onClick={onNewChat}
                    className="flex h-[42px] w-full cursor-pointer items-center rounded-[10px] bg-[var(--color-surface-overlay)] px-3.5 text-[13px] font-medium text-[var(--color-text-primary)] transition-all hover:bg-[#14141e]"
                >
                    <span className="mr-2 text-base text-[var(--color-accent-light)]">＋</span>
                    New chat
                </button>
            </div>

            <div className="flex items-center justify-between px-[18px] pb-2 pt-4">
                <span className="text-[10px] font-semibold tracking-[0.12em] text-[var(--color-text-muted)]">RECENT</span>
                <button
                    onClick={() => setCollapsed(true)}
                    className="cursor-pointer rounded-md px-1.5 py-1 text-sm text-[var(--color-text-muted)] transition-colors hover:bg-white/[0.04] hover:text-[var(--color-text-secondary)]"
                    title="Collapse sidebar"
                    aria-label="Collapse sidebar"
                >
                    ‹
                </button>
            </div>

            <div className="flex-1 overflow-y-auto px-[18px]">
                {conversations.length === 0 && (
                    <div className="rounded-[10px] border border-dashed px-3 py-5 text-center text-xs" style={{ borderColor: "var(--color-border)", color: "var(--color-text-muted)" }}>
                        No conversations yet.
                        <br />
                        Start a new chat.
                    </div>
                )}

                <div className="space-y-1">
                    {conversations.map((convo) => (
                        <div
                            key={convo.id}
                            role="button"
                            tabIndex={0}
                            onClick={() => onSelect(convo.id)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") onSelect(convo.id);
                            }}
                            className="group relative flex min-h-[54px] w-full cursor-pointer items-center rounded-[10px] border px-3 text-left transition-all"
                            style={{
                                background: convo.id === activeId ? "var(--color-surface-overlay)" : "transparent",
                                borderColor: convo.id === activeId ? "#40338c" : "transparent",
                            }}
                        >
                            <div className="min-w-0 flex-1">
                                <div className="truncate text-[13px] font-medium" style={{ color: convo.id === activeId ? "var(--color-text-primary)" : "var(--color-text-secondary)" }}>
                                    {convo.title}
                                </div>
                                <div className="mt-1 text-[10px]" style={{ color: "var(--color-text-muted)" }}>
                                    {timeAgo(convo.updated_at)}
                                </div>
                            </div>
                            <button
                                onClick={(e) => handleDelete(e, convo.id)}
                                className="ml-2 flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-[11px] opacity-0 transition-all hover:bg-white/[0.05] group-hover:opacity-100"
                                style={{ color: "var(--color-text-muted)" }}
                                title="Delete conversation"
                                aria-label={`Delete ${convo.title}`}
                            >
                                ×
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            <div className="p-[18px] pt-3">
                <AgentMode />
            </div>
        </aside>
    );
}
