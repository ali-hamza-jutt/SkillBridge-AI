"use client";

import Link from "next/link";
import { FileText, ImageIcon, Video } from "lucide-react";
import ChatMessageTimestamp from "@/components/chat-message-timestamp";
import Avatar from "@/components/conversation-thread/avatar";
import type { ConversationSummary } from "@/lib/types/chat";

type ConversationListItemProps = {
  conversation: ConversationSummary;
  href: string;
  active?: boolean;
};

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
  const unreadCount = conversation.unreadCount ?? 0;

  return (
    <Link
      href={href}
      title={conversation.taskTitle}
      aria-current={active ? "page" : undefined}
      className={`group flex w-full min-w-0 items-center gap-3 overflow-hidden rounded-[var(--radius-md)] border px-3 py-2.5 no-underline transition-colors ${
        active
          ? "border-[color-mix(in_srgb,var(--color-brand)_16%,var(--color-border))] bg-(--background-color-chat-list-item)"
          : "border-transparent bg-transparent hover:bg-(--color-hover)"
      }`}
    >
      <div className="relative shrink-0">
        <Avatar name={conversation.otherUserName} url={conversation.otherUserAvatarUrl} size={44} />
        <span
          className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-(--color-surface) ${
            conversation.otherUserOnline ? "bg-(--color-success)" : "bg-(--color-text-muted)"
          }`}
          aria-label={conversation.otherUserOnline ? "Online" : "Offline"}
        />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p
            className={`truncate text-sm text-(--color-text-main) ${
              unreadCount > 0 ? "font-bold" : "font-semibold"
            }`}
          >
            {conversation.otherUserName}
          </p>
          <ChatMessageTimestamp
            value={conversation.lastMessageAt ?? conversation.updatedAt}
            format="list"
            className={unreadCount > 0 ? "font-semibold text-(--color-brand)" : undefined}
          />
        </div>

        <div className="mt-1 flex min-w-0 items-center gap-2">
          <p
            className={`min-w-0 flex-1 truncate text-xs ${
              unreadCount > 0
                ? "font-semibold text-(--color-text-secondary)"
                : "text-(--color-text-muted)"
            }`}
          >
            <LastMessagePreview conversation={conversation} />
          </p>
          {unreadCount > 0 ? (
            <span className="ui-badge shrink-0">{unreadCount > 99 ? "99+" : unreadCount}</span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
