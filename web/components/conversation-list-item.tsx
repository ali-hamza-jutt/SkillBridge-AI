"use client";

import Link from "next/link";
import { ImageIcon, Video, FileText } from "lucide-react";
import type { ConversationSummary } from "@/lib/types/chat";
import ChatMessageTimestamp from "@/components/chat-message-timestamp";
import { money } from "@/lib/utils/formatting";

type ConversationListItemProps = {
  conversation: ConversationSummary;
  href: string;
  active?: boolean;
};

function LastMessagePreview({ conversation }: { conversation: ConversationSummary }) {
  if (!conversation.lastMessageText) {
    return <span>No messages yet</span>;
  }

  if (conversation.lastAttachmentType === "IMAGE") {
    return (
      <span className="flex items-center gap-1">
        <ImageIcon className="h-3.5 w-3.5 shrink-0" />
        Image
      </span>
    );
  }

  if (conversation.lastAttachmentType === "VIDEO") {
    return (
      <span className="flex items-center gap-1">
        <Video className="h-3.5 w-3.5 shrink-0" />
        Video
      </span>
    );
  }

  if (conversation.lastAttachmentType === "DOCUMENT") {
    return (
      <span className="flex items-center gap-1">
        <FileText className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">{conversation.lastMessageText}</span>
      </span>
    );
  }

  return <span>{conversation.lastMessageText}</span>;
}

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
          <p className="truncate text-sm font-semibold text-(--color-text-main)">{conversation.otherUserName}</p>
          <p className="mt-0.5 truncate text-xs text-(--color-text-muted)">{conversation.taskTitle}</p>
        </div>
        <span className="rounded-full border border-(--color-border) px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-(--color-brand-strong)">
          {conversation.type === "CONTRACT" ? "Hired" : "Chat"}
        </span>
      </div>

      <p className="mt-2 line-clamp-1 text-sm leading-6 text-(--color-text-muted)">
        <LastMessagePreview conversation={conversation} />
      </p>

      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="text-xs text-(--color-text-muted)">{money(conversation.bidAmount)}</span>
        <ChatMessageTimestamp value={conversation.lastMessageAt ?? conversation.updatedAt} />
      </div>
    </Link>
  );
}
