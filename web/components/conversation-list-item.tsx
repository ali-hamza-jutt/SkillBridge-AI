"use client";

import Link from "next/link";
import { ImageIcon, Video, FileText } from "lucide-react";
import type { ConversationSummary } from "@/lib/types/chat";
import ChatMessageTimestamp from "@/components/chat-message-timestamp";

type ConversationListItemProps = {
  conversation: ConversationSummary;
  href: string;
  active?: boolean;
};

const AVATAR_COLORS = [
  "#4f8ef7", "#7c6ef7", "#36b37e", "#f97316",
  "#e11d48", "#0891b2", "#8b5cf6", "#059669",
];

function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function Avatar({ name }: { name: string }) {
  return (
    <div
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
      style={{ backgroundColor: getAvatarColor(name) }}
    >
      {getInitials(name)}
    </div>
  );
}

function LastMessagePreview({ conversation }: { conversation: ConversationSummary }) {
  if (!conversation.lastMessageText) {
    return <span className="italic">No messages yet</span>;
  }
  if (conversation.lastAttachmentType === "IMAGE") {
    return (
      <span className="flex items-center gap-1">
        <ImageIcon className="h-3 w-3 shrink-0" />
        Image
      </span>
    );
  }
  if (conversation.lastAttachmentType === "VIDEO") {
    return (
      <span className="flex items-center gap-1">
        <Video className="h-3 w-3 shrink-0" />
        Video
      </span>
    );
  }
  if (conversation.lastAttachmentType === "DOCUMENT") {
    return (
      <span className="flex items-center gap-1">
        <FileText className="h-3 w-3 shrink-0" />
        <span className="truncate">{conversation.lastMessageText}</span>
      </span>
    );
  }
  return <span className="truncate">{conversation.lastMessageText}</span>;
}

export default function ConversationListItem({ conversation, href, active }: ConversationListItemProps) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-xl px-3 py-3 no-underline transition-colors ${
        active
          ? "bg-[color-mix(in_srgb,var(--color-brand-soft)_70%,var(--color-surface))]"
          : "hover:bg-[color-mix(in_srgb,var(--color-border)_30%,var(--color-surface))]"
      }`}
    >
      <Avatar name={conversation.otherUserName} />

      <div className="min-w-0 flex-1">
        {/* Name + timestamp */}
        <div className="flex items-baseline justify-between gap-2">
          <p className="truncate text-sm font-semibold text-(--color-text-main)">
            {conversation.otherUserName}
          </p>
          <span className="shrink-0 text-[11px] text-(--color-text-muted)">
            <ChatMessageTimestamp value={conversation.lastMessageAt ?? conversation.updatedAt} />
          </span>
        </div>

        {/* Task title */}
        <p className="truncate text-xs text-(--color-text-muted)">
          {conversation.taskTitle}
        </p>

        {/* Last message */}
        <p className="mt-0.5 truncate text-xs text-(--color-brand-strong) opacity-80">
          <LastMessagePreview conversation={conversation} />
        </p>
      </div>
    </Link>
  );
}
