"use client";

import ChatMessageTimestamp from "@/components/chat-message-timestamp";
import Avatar from "@/components/conversation-thread/avatar";
import DocPreview from "@/components/conversation-thread/doc-preview";
import MediaPreview from "@/components/conversation-thread/media-preview";
import type { ChatMessage } from "@/lib/types/chat";
import { inferAttachmentType } from "@/lib/utils/chatAttachmentType";

export type DisplayChatMessage = ChatMessage & {
  optimistic?: boolean;
};

type RenderMessageItemContext = {
  previousMessage?: DisplayChatMessage;
  userId: string | null;
  myAvatarUrl?: string | null;
  otherAvatarUrl: string | null;
  openMediaPreview: (item: { url: string; type: "IMAGE" | "VIDEO"; name?: string }) => void;
  isLatestOutgoingMessage: boolean;
};

const SINGLE_EMOJI_REGEX = /^(?:\p{Extended_Pictographic}|\p{Regional_Indicator}{2}|\p{Emoji_Presentation}|\p{Emoji}\uFE0F)(?:\u200D(?:\p{Extended_Pictographic}|\p{Emoji_Presentation}|\p{Emoji}\uFE0F))*$/u;

function isSingleEmojiMessage(text: string) {
  const trimmed = text.trim();
  return trimmed.length > 0 && SINGLE_EMOJI_REGEX.test(trimmed);
}

function formatMessageStatus(status?: string) {
  if (status === "read") return "Read";
  if (status === "delivered") return "Delivered";
  return "Sent";
}

function dateKey(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function formatDateDivider(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMessageDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const daysAgo = Math.round(
    (startOfToday.getTime() - startOfMessageDay.getTime()) / 86_400_000,
  );

  if (daysAgo === 0) return "Today";
  if (daysAgo === 1) return "Yesterday";
  return date.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
}

export function renderMessageItemRow(
  message: DisplayChatMessage,
  context: RenderMessageItemContext,
) {
  const isMine = message.senderId === context.userId;
  const isSystem = message.messageType === "SYSTEM";
  const previousMessage = context.previousMessage;
  const startsNewDay = dateKey(previousMessage?.createdAt ?? null) !== dateKey(message.createdAt);
  const sameAuthorAsPrevious =
    !startsNewDay &&
    previousMessage?.messageType !== "SYSTEM" &&
    previousMessage?.senderId === message.senderId &&
    previousMessage?.messageType === message.messageType;

  const mediaAttachments = (message.attachments ?? []).filter((attachment) => {
    const type = inferAttachmentType(attachment);
    return type === "IMAGE" || type === "VIDEO";
  });
  const documentAttachments = (message.attachments ?? []).filter(
    (attachment) => inferAttachmentType(attachment) === "DOCUMENT",
  );

  const dateDivider = startsNewDay ? (
    <div className="flex items-center gap-3 py-4" role="separator" aria-label={formatDateDivider(message.createdAt)}>
      <span className="h-px flex-1 bg-(--color-border)" />
      <span className="rounded-[var(--radius-sm)] border border-(--color-border) bg-(--color-surface) px-3 py-1 text-[11px] font-medium text-(--color-text-muted)">
        {formatDateDivider(message.createdAt)}
      </span>
      <span className="h-px flex-1 bg-(--color-border)" />
    </div>
  ) : null;

  if (isSystem) {
    return (
      <>
        {dateDivider}
        <div className="my-2 flex items-center gap-3">
          <span className="h-px flex-1 bg-(--color-border)" />
          <span className="shrink-0 text-[11px] font-medium text-(--color-text-muted)">
            {message.body}
          </span>
          <span className="h-px flex-1 bg-(--color-border)" />
        </div>
      </>
    );
  }

  const emojiOnly = Boolean(message.body && isSingleEmojiMessage(message.body));

  return (
    <>
      {dateDivider}
      <div className={`flex ${isMine ? "justify-end" : "justify-start"} ${sameAuthorAsPrevious ? "pt-1" : "pt-3"}`}>
        <div className={`flex max-w-[88%] items-end gap-2 sm:max-w-[78%] xl:max-w-[46rem] ${isMine ? "flex-row-reverse" : ""}`}>
          {!isMine ? (
            <div className="w-8 shrink-0">
              {!sameAuthorAsPrevious ? (
                <Avatar name={message.senderName} url={context.otherAvatarUrl} size={32} />
              ) : null}
            </div>
          ) : null}

          <div className={`min-w-0 ${isMine ? "items-end" : "items-start"} flex flex-col`}>
            {!sameAuthorAsPrevious && !isMine ? (
              <span className="mb-1 px-1 text-xs font-semibold text-(--color-text-secondary)">
                {message.senderName}
              </span>
            ) : null}

            <div
              className={`min-w-16 overflow-hidden rounded-[var(--radius-md)] px-3.5 py-2.5 text-sm leading-6 shadow-(--shadow-sm) ${
                isMine
                  ? "bg-(--color-message-own) text-white"
                  : "border border-(--color-border) bg-(--color-message-other) text-(--color-text-main)"
              } ${message.optimistic ? "opacity-70" : ""}`}
            >
              {mediaAttachments.length > 0 ? (
                <div className={`grid gap-2 ${mediaAttachments.length > 1 ? "sm:grid-cols-2" : ""} ${message.body ? "mb-2" : ""}`}>
                  {mediaAttachments.map((attachment) => (
                    <MediaPreview
                      key={attachment.url}
                      attachment={attachment}
                      optimistic={Boolean(message.optimistic)}
                      onOpen={context.openMediaPreview}
                    />
                  ))}
                </div>
              ) : null}

              {message.body ? (
                <p
                  className={`whitespace-pre-wrap break-words ${emojiOnly ? "py-1 text-center text-5xl leading-none" : ""}`}
                >
                  {message.body}
                </p>
              ) : null}

              {documentAttachments.length > 0 ? (
                <div className={`flex flex-col gap-2 ${message.body || mediaAttachments.length > 0 ? "mt-2" : ""}`}>
                  {documentAttachments.map((attachment) => (
                    <DocPreview key={attachment.url} attachment={attachment} tone={isMine ? "inverse" : "default"} />
                  ))}
                </div>
              ) : null}
            </div>

            <div
              className={`mt-1 flex items-center gap-1.5 px-1 text-[11px] text-(--color-text-muted) ${
                isMine ? "justify-end" : "justify-start"
              }`}
            >
              <ChatMessageTimestamp value={message.createdAt} format="time" />
              {isMine && context.isLatestOutgoingMessage ? (
                <span>· {formatMessageStatus(message.status)}</span>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
