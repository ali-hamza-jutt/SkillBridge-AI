"use client";

import Link from "next/link";
import type { ConversationSummary } from "@/lib/types/chat";
import ChatMessageTimestamp from "@/components/chat-message-timestamp";
import { money } from "@/lib/utils/formatting";

type ConversationListItemProps = {
  conversation: ConversationSummary;
  href: string;
  active?: boolean;
};

export default function ConversationListItem({ conversation, href, active }: ConversationListItemProps) {
  return (
    <Link
      href={href}
      className={`block rounded-2xl border p-4 no-underline transition ${
        active
          ? "border-[color-mix(in_srgb,var(--color-brand)_34%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-brand-soft)_60%,var(--color-surface))]"
          : "border-[color-mix(in_srgb,var(--color-border)_90%,transparent)] bg-[color-mix(in_srgb,var(--color-surface)_94%,transparent)] hover:border-[color-mix(in_srgb,var(--color-brand)_24%,var(--color-border))]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[var(--color-text-main)]">{conversation.otherUserName}</p>
          <p className="mt-0.5 truncate text-xs text-[var(--color-text-muted)]">{conversation.taskTitle}</p>
        </div>
        <span className="rounded-full border border-[var(--color-border)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--color-brand-strong)]">
          {conversation.type === "CONTRACT" ? "Hired" : "Chat"}
        </span>
      </div>

      <p className="mt-2 line-clamp-2 text-sm leading-6 text-[var(--color-text-muted)]">
        {conversation.lastMessageText ?? "No messages yet"}
      </p>

      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="text-xs text-[var(--color-text-muted)]">{money(conversation.bidAmount)}</span>
        <ChatMessageTimestamp value={conversation.lastMessageAt ?? conversation.updatedAt} />
      </div>
    </Link>
  );
}
