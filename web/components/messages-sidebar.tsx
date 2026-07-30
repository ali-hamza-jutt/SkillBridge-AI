"use client";

import { useMemo, useState } from "react";
import { MessageSquare, Search } from "lucide-react";
import { LoadingSpinner } from "@/components/app-loader";
import ConversationListItem from "@/components/conversation-list-item";
import type { ConversationSummary } from "@/lib/types/chat";

type ConversationFilter = "all" | "unread";

type MessagesSidebarProps = {
  conversations: ConversationSummary[];
  activeConversationId?: string;
  loading?: boolean;
  errorMessage?: string | null;
  className?: string;
};

export default function MessagesSidebar({
  conversations,
  activeConversationId,
  loading = false,
  errorMessage,
  className,
}: MessagesSidebarProps) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ConversationFilter>("all");

  const unreadTotal = useMemo(
    () => conversations.reduce((total, conversation) => total + (conversation.unreadCount ?? 0), 0),
    [conversations],
  );

  const visibleConversations = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();

    return conversations.filter((conversation) => {
      if (filter === "unread" && (conversation.unreadCount ?? 0) === 0) return false;
      if (!normalizedQuery) return true;

      return [conversation.otherUserName, conversation.taskTitle, conversation.lastMessageText ?? ""]
        .some((value) => value.toLocaleLowerCase().includes(normalizedQuery));
    });
  }, [conversations, filter, query]);

  const emptyLabel = query.trim()
    ? "No conversations match your search."
    : filter === "unread"
      ? "You are all caught up."
      : "No conversations yet.";

  return (
    <aside
      className={`flex min-h-0 min-w-0 flex-col border-r border-(--color-border) bg-(--background-color-chat-list-box) ${className ?? ""}`}
      aria-label="Conversations"
    >
      <div className="border-b border-(--color-border) px-4 pb-3 pt-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold tracking-tight text-(--color-text-main)">Messages</h1>
            <p className="mt-0.5 text-xs text-(--color-text-muted)">
              {conversations.length} conversation{conversations.length === 1 ? "" : "s"}
            </p>
          </div>
          {unreadTotal > 0 ? <span className="ui-badge">{unreadTotal > 99 ? "99+" : unreadTotal} unread</span> : null}
        </div>

        <label className="ui-input-shell mt-4 flex h-10 items-center gap-2 px-3">
          <Search className="h-4 w-4 shrink-0 text-(--color-text-muted)" aria-hidden="true" />
          <span className="sr-only">Search messages</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search messages"
            className="min-w-0 flex-1 bg-transparent text-sm text-(--color-text-main) outline-none placeholder:text-(--color-text-muted)"
          />
        </label>

        <div className="mt-3 flex items-center gap-1" role="tablist" aria-label="Conversation filters">
          <button type="button" role="tab" aria-selected={filter === "all"} data-active={filter === "all"} className="ui-tab" onClick={() => setFilter("all")}>
            All
          </button>
          <button type="button" role="tab" aria-selected={filter === "unread"} data-active={filter === "unread"} className="ui-tab" onClick={() => setFilter("unread")}>
            Unread
          </button>
        </div>
      </div>

      <div className="ui-scrollbar min-h-0 flex-1 overflow-y-auto p-2">
        {loading ? (
          <div className="flex items-center justify-center py-10" aria-label="Loading conversations">
            <LoadingSpinner />
          </div>
        ) : null}

        {!loading && errorMessage ? (
          <p className="rounded-[var(--radius-md)] bg-[color-mix(in_srgb,var(--color-danger)_8%,transparent)] px-3 py-3 text-sm text-(--color-danger)">
            {errorMessage}
          </p>
        ) : null}

        {!loading && !errorMessage && visibleConversations.length === 0 ? (
          <div className="flex flex-col items-center px-5 py-12 text-center">
            <span className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] bg-(--color-hover) text-(--color-text-muted)">
              <MessageSquare className="h-5 w-5" />
            </span>
            <p className="mt-3 text-sm text-(--color-text-muted)">{emptyLabel}</p>
          </div>
        ) : null}

        <div className="grid gap-1">
          {visibleConversations.map((conversation) => (
            <ConversationListItem
              key={conversation.conversationId}
              conversation={conversation}
              href={`/dashboard/messages/${conversation.conversationId}`}
              active={conversation.conversationId === activeConversationId}
            />
          ))}
        </div>
      </div>
    </aside>
  );
}
