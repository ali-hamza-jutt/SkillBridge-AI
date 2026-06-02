"use client";

import ChatMessageTimestamp from "@/components/chat-message-timestamp";
import type { ChatMessage } from "@/lib/types/chat";
import { inferAttachmentType } from "@/lib/utils/chatAttachmentType";
import Avatar from "@/components/conversation-thread/avatar";
import MediaPreview from "@/components/conversation-thread/media-preview";
import DocPreview from "@/components/conversation-thread/doc-preview";

export type DisplayChatMessage = ChatMessage & {
  optimistic?: boolean;
};

type RenderMessageItemContext = {
  visibleMessages: DisplayChatMessage[];
  userId: string | null;
  myAvatarUrl?: string | null;
  otherAvatarUrl: string | null;
  openMediaPreview: (item: { url: string; type: "IMAGE" | "VIDEO"; name?: string }) => void;
};

const SINGLE_EMOJI_REGEX = /^(?:\p{Extended_Pictographic}|\p{Regional_Indicator}{2}|\p{Emoji_Presentation}|\p{Emoji}\uFE0F)(?:\u200D(?:\p{Extended_Pictographic}|\p{Emoji_Presentation}|\p{Emoji}\uFE0F))*$/u;

function isSingleEmojiMessage(text: string) {
  const trimmed = text.trim();
  return trimmed.length > 0 && SINGLE_EMOJI_REGEX.test(trimmed);
}

function formatMessageStatus(status?: string) {
  if (status === "read") return "Seen";
  if (status === "delivered") return "Delivered";
  return "Sent";
}

export function renderMessageItemRow(
  idx: number,
  message: DisplayChatMessage,
  context: RenderMessageItemContext,
) {
  const isMine = message.senderId === context.userId;
  const isSystem = message.messageType === "SYSTEM";
  const prev = context.visibleMessages[idx - 1];
  const sameAuthorAsPrev = prev && prev.senderId === message.senderId && prev.messageType === message.messageType;

  const mediaAtts = (message.attachments ?? []).filter((a) => inferAttachmentType(a) === "IMAGE" || inferAttachmentType(a) === "VIDEO");
  const docAtts = (message.attachments ?? []).filter((a) => inferAttachmentType(a) === "DOCUMENT");

  if (isSystem) {
    return (
      <div className="my-3 flex items-center gap-3">
        <div className="h-px flex-1 bg-[color-mix(in_srgb,var(--color-border)_70%,transparent)]" />
        <span className="shrink-0 rounded-full border border-[color-mix(in_srgb,var(--color-border)_80%,transparent)] bg-[color-mix(in_srgb,var(--color-surface-strong)_60%,transparent)] px-3 py-1 text-[11px] text-(--color-text-muted)">
          {message.body}
        </span>
        <div className="h-px flex-1 bg-[color-mix(in_srgb,var(--color-border)_70%,transparent)]" />
      </div>
    );
  }

  return (
    <div
      className={`group flex gap-3 rounded-xl px-2 py-1 transition-colors hover:bg-[color-mix(in_srgb,var(--color-border)_18%,transparent)] ${
        isMine ? "bg-[color-mix(in_srgb,var(--color-brand-soft)_22%,transparent)]" : ""
      } ${sameAuthorAsPrev ? "mt-0.5" : "mt-3"}`}
    >
      <div className="w-9 shrink-0 pt-0.5">
        {!sameAuthorAsPrev ? (
          <Avatar name={message.senderName} url={isMine ? context.myAvatarUrl : context.otherAvatarUrl} size={36} />
        ) : null}
      </div>

      <div className="min-w-0 flex-1">
        {!sameAuthorAsPrev && (
          <div className="mb-1 flex items-baseline gap-2">
            <span className={`text-sm font-semibold ${isMine ? "text-(--color-brand-strong)" : "text-(--color-text-main)"}`}>
              {message.senderName}
            </span>
            <ChatMessageTimestamp value={message.createdAt} className="text-[11px] text-(--color-text-muted)" />
          </div>
        )}

        {mediaAtts.length > 0 && (
          <div className="mb-1 grid gap-1.5 sm:grid-cols-2">
            {mediaAtts.map((att) => (
              <MediaPreview
                key={att.url}
                attachment={att}
                optimistic={Boolean(message.optimistic)}
                onOpen={context.openMediaPreview}
              />
            ))}
          </div>
        )}

        {message.body ? (
          (() => {
            const emojiOnly = isSingleEmojiMessage(message.body);
            return (
              <p
                className={`whitespace-pre-wrap text-sm leading-relaxed text-(--color-text-main) ${
                  emojiOnly ? "inline-flex min-w-14 items-center justify-center rounded-2xl px-3 py-2" : ""
                }`}
                style={emojiOnly ? { fontSize: "3.25rem", lineHeight: 1 } : undefined}
              >
                {message.body}
              </p>
            );
          })()
        ) : null}

        {docAtts.length > 0 && (
          <div className="mt-1.5 flex flex-col gap-1.5">
            {docAtts.map((att) => <DocPreview key={att.url} attachment={att} />)}
          </div>
        )}

        {sameAuthorAsPrev && (
          <div className="invisible mt-0.5 group-hover:visible">
            <ChatMessageTimestamp value={message.createdAt} className="text-[11px] text-(--color-text-muted)" />
          </div>
        )}

        {isMine && !isSystem ? (
          <div className="mt-0.5 text-[11px] text-(--color-text-muted)">{formatMessageStatus(message.status)}</div>
        ) : null}
      </div>
    </div>
  );
}
