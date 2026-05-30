"use client";

import Image from "next/image";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Paperclip, X, FileText, Loader2, RotateCcw, Send, Smile, UserCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAppSelector } from "@/lib/hooks";
import { useChatSocket } from "@/components/chat-socket-provider";
import { markConversationRead } from "@/lib/useUnreadMessages";
import ChatMessageTimestamp from "@/components/chat-message-timestamp";
import EmojiPicker from "@/components/emoji-picker";
import type { ChatMessage, ConversationSummary, MessageAttachment } from "@/lib/types/chat";
import type { AttachmentDto } from "@/lib/api";
import { fileTypeMeta, formatFileSize } from "@/lib/utils/formatting";
import { CHAT_VIDEO_UPLOAD_MAX_SIZE_BYTES } from "@/lib/constants/upload";
import {
  useConversationsControllerGetConversationQuery,
  useConversationsControllerGetMessagesQuery,
  useConversationsControllerSendMessageMutation,
  useGcsControllerGenerateSignedUrlMutation,
} from "@/lib/api";

type PendingAttachment = {
  localId: string;
  file: File;
  preview: string | null;
  uploading: boolean;
  error: string | null;
  result: AttachmentDto | null;
};

function resolveAttachmentType(file: File): "IMAGE" | "VIDEO" | "DOCUMENT" {
  if (file.type.startsWith("image/")) return "IMAGE";
  if (file.type.startsWith("video/")) return "VIDEO";
  return "DOCUMENT";
}

const SINGLE_EMOJI_REGEX = /^(?:\p{Extended_Pictographic}|\p{Regional_Indicator}{2}|\p{Emoji_Presentation}|\p{Emoji}\uFE0F)(?:\u200D(?:\p{Extended_Pictographic}|\p{Emoji_Presentation}|\p{Emoji}\uFE0F))*$/u;

function isSingleEmojiMessage(text: string) {
  const trimmed = text.trim();
  return trimmed.length > 0 && SINGLE_EMOJI_REGEX.test(trimmed);
}

const mergeUniqueMessages = (current: ChatMessage[], incoming: ChatMessage[]) => {
  const byId = new Map<string, ChatMessage>();
  for (const m of current) byId.set(m.id, m);
  for (const m of incoming) byId.set(m.id, m);
  return Array.from(byId.values()).sort((a, b) => {
    const aT = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bT = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return aT - bT;
  });
};

// ── Avatar helpers ────────────────────────────────────────────────────────────
const AVATAR_COLORS = [
  "#4f8ef7", "#7c6ef7", "#36b37e", "#f97316",
  "#e11d48", "#0891b2", "#8b5cf6", "#059669",
];
function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}
function initials(name: string) {
  const p = name.trim().split(/\s+/);
  return p.length === 1 ? p[0].slice(0, 2).toUpperCase() : (p[0][0] + p[p.length - 1][0]).toUpperCase();
}
function Avatar({ name, url, size = 36 }: { name: string; url?: string | null; size?: number }) {
  if (url) {
    return (
      <div className="shrink-0 overflow-hidden rounded-full" style={{ width: size, height: size }}>
        <Image src={url} alt={name} width={size} height={size} className="h-full w-full object-cover" unoptimized />
      </div>
    );
  }
  return (
    <div
      className="shrink-0 flex items-center justify-center rounded-full text-white font-bold select-none"
      style={{ width: size, height: size, fontSize: size * 0.35, backgroundColor: avatarColor(name) }}
    >
      {initials(name)}
    </div>
  );
}

// ── Attachment renderers ──────────────────────────────────────────────────────
function MediaPreview({ attachment }: { attachment: MessageAttachment }) {
  if (!attachment.url.startsWith("http")) return null;
  if (attachment.type === "IMAGE") {
    return (
      <a href={attachment.url} target="_blank" rel="noopener noreferrer" className="block">
        <Image
          src={attachment.url}
          alt={attachment.name}
          width={0}
          height={0}
          sizes="380px"
          className="max-h-80 w-auto rounded-xl object-contain"
          style={{ maxWidth: 380 }}
        />
      </a>
    );
  }
  return (
    <video src={attachment.url} controls className="max-h-80 rounded-xl" style={{ maxWidth: 380 }} preload="metadata" />
  );
}

function DocPreview({ attachment }: { attachment: MessageAttachment }) {
  const meta = fileTypeMeta(attachment.mimeType);
  const size = formatFileSize(attachment.size);
  return (
    <a
      href={attachment.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group inline-flex items-center gap-3 rounded-xl border border-(--color-border) bg-[color-mix(in_srgb,var(--color-surface)_80%,transparent)] px-3 py-2.5 no-underline transition hover:border-[color-mix(in_srgb,var(--color-brand)_40%,var(--color-border))]"
    >
      <div className={`flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg ${meta.bg}`}>
        <FileText className="h-4 w-4 text-white/80" />
        <span className="text-[9px] font-black tracking-wider text-white">{meta.label}</span>
      </div>
      <div className="flex min-w-0 flex-col">
        <span className="max-w-48 truncate text-sm font-semibold text-(--color-text-main) group-hover:underline">{attachment.name}</span>
        {size && <span className="text-xs text-(--color-text-muted)">{size}</span>}
      </div>
    </a>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ConversationThread({ conversationId }: { conversationId: string }) {
  const router = useRouter();
  const { token, userId, avatarUrl: myAvatarUrl } = useAppSelector((s) => s.auth);
  const { socket, joinConversation, leaveConversation } = useChatSocket();

  const { data: convData, isLoading: convLoading, error: convError } =
    useConversationsControllerGetConversationQuery({ id: conversationId }, { skip: !token || !conversationId });
  const { data: msgData, isLoading: msgLoading } =
    useConversationsControllerGetMessagesQuery({ id: conversationId, before: "", limit: "100" }, { skip: !token || !conversationId });
  const [sendMessage, { isLoading: sending }] = useConversationsControllerSendMessageMutation();
  const [generateSignedUrl] = useGcsControllerGenerateSignedUrlMutation();

  const baseConversation = (convData as ConversationSummary | undefined) ?? null;
  const [patches, setPatches] = useState<Partial<ConversationSummary>>({});
  const conversation = baseConversation ? { ...baseConversation, ...patches } : null;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [prevMsgData, setPrevMsgData] = useState(msgData);
  if (prevMsgData !== msgData) {
    setPrevMsgData(msgData);
    setMessages((cur) => mergeUniqueMessages(cur, (msgData as ChatMessage[] | undefined) ?? []));
  }

  const [body, setBody] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const emojiMenuRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);

  const queryError = useMemo(() => {
    if (!convError) return null;
    if (typeof convError === "object" && "data" in convError) {
      const d = (convError as { data?: unknown }).data;
      return typeof d === "string" ? d : "Failed to load conversation";
    }
    return "Failed to load conversation";
  }, [convError]);

  useEffect(() => {
    if (!token || !conversationId) return;
    markConversationRead(conversationId);
    joinConversation(conversationId);
    return () => leaveConversation(conversationId);
  }, [conversationId, joinConversation, leaveConversation, token]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!socket) return;
    const onMessage = (p: ChatMessage) => {
      if (p.conversationId !== conversationId) return;
      setMessages((cur) => cur.some((m) => m.id === p.id) ? cur : mergeUniqueMessages(cur, [p]));
      setPatches((prev) => ({ ...prev, lastMessageText: p.body, lastMessageAt: p.createdAt }));
      markConversationRead(conversationId);
    };
    const onUpdated = (p: Partial<ConversationSummary> & { conversationId: string }) => {
      if (p.conversationId !== conversationId) return;
      setPatches((prev) => ({ ...prev, ...p }));
    };
    socket.on("message.created", onMessage);
    socket.on("conversation.updated", onUpdated);
    return () => { socket.off("message.created", onMessage); socket.off("conversation.updated", onUpdated); };
  }, [conversationId, socket]);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (emojiMenuRef.current && !emojiMenuRef.current.contains(event.target as Node)) {
        setEmojiPickerOpen(false);
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  const insertEmoji = (emoji: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setBody((current) => `${current}${emoji}`);
      setEmojiPickerOpen(false);
      return;
    }

    const start = textarea.selectionStart ?? body.length;
    const end = textarea.selectionEnd ?? body.length;
    const nextValue = `${body.slice(0, start)}${emoji}${body.slice(end)}`;

    setBody(nextValue);
    setEmojiPickerOpen(false);

    requestAnimationFrame(() => {
      textarea.focus();
      const nextCursor = start + emoji.length;
      textarea.setSelectionRange(nextCursor, nextCursor);
    });
  };

  const uploadFile = async (pending: PendingAttachment) => {
    const setErr = (msg: string) =>
      setPendingAttachments((prev) => prev.map((p) => p.localId === pending.localId ? { ...p, uploading: false, error: msg } : p));
    try {
      const { signedUrl, publicUrl, objectName } = (await generateSignedUrl({
        generateUploadUrlDto: { fileName: pending.file.name, mimeType: pending.file.type, folder: "chat-attachments" },
      }).unwrap()) as { signedUrl: string; publicUrl: string; objectName: string };

      const res = await fetch(signedUrl, { method: "PUT", headers: { "Content-Type": pending.file.type }, body: pending.file });
      if (!res.ok) throw new Error(`Upload failed (HTTP ${res.status})`);

      const result: AttachmentDto = {
        url: publicUrl, publicId: objectName, name: pending.file.name,
        mimeType: pending.file.type, type: resolveAttachmentType(pending.file), size: pending.file.size,
      };
      setPendingAttachments((prev) => prev.map((p) => p.localId === pending.localId ? { ...p, uploading: false, result } : p));
    } catch (err) {
      const msg = err instanceof Error ? err.message
        : typeof err === "object" && err !== null && "data" in err
          ? String((err as { data?: unknown }).data ?? "Upload failed") : "Upload failed";
      setErr(msg);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    for (const file of files) {
      if (file.type.startsWith("video/") && file.size > CHAT_VIDEO_UPLOAD_MAX_SIZE_BYTES) { setSendError("Video must be under 100 MB."); continue; }
      const localId = `${Date.now()}-${Math.random()}`;
      const preview = file.type.startsWith("image/") || file.type.startsWith("video/") ? URL.createObjectURL(file) : null;
      const pending: PendingAttachment = { localId, file, preview, uploading: true, error: null, result: null };
      setPendingAttachments((prev) => [...prev, pending]);
      uploadFile(pending);
    }
  };

  const removePending = (localId: string) => {
    setPendingAttachments((prev) => {
      const item = prev.find((p) => p.localId === localId);
      if (item?.preview) URL.revokeObjectURL(item.preview);
      return prev.filter((p) => p.localId !== localId);
    });
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = body.trim();
    const ready = pendingAttachments.filter((p) => p.result !== null).map((p) => p.result!);
    if ((!trimmed && ready.length === 0) || !token || pendingAttachments.some((p) => p.uploading)) return;
    try {
      setSendError(null);
      await sendMessage({
        id: conversationId,
        sendMessageDto: { ...(trimmed ? { body: trimmed } : {}), ...(ready.length > 0 ? { attachments: ready } : {}) },
      }).unwrap();
      setBody("");
      setPendingAttachments([]);
      markConversationRead(conversationId);
    } catch { setSendError("Failed to send. Please try again."); }
  };

  const canSend = !sending && !pendingAttachments.some((p) => p.uploading)
    && (body.trim().length > 0 || pendingAttachments.some((p) => p.result !== null));

  if (convLoading || msgLoading) {
    return (
      <div className="flex h-full items-center justify-center rounded-2xl border border-[color-mix(in_srgb,var(--color-border)_90%,transparent)] bg-(--color-surface)">
        <Loader2 className="h-5 w-5 animate-spin text-(--color-text-muted)" />
      </div>
    );
  }

  if (queryError && !conversation) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-(--color-border) bg-(--color-surface) text-center">
        <p className="text-sm text-(--color-text-muted)">{queryError}</p>
        <button
          type="button"
          onClick={() => router.push("/dashboard/messages")}
          className="rounded-full bg-[linear-gradient(135deg,var(--color-brand),var(--color-brand-strong))] px-5 py-2 text-sm font-semibold text-white"
        >
          Back to Messages
        </button>
      </div>
    );
  }

  const otherName = conversation?.otherUserName ?? "Conversation";
  const otherAvatarUrl = conversation?.otherUserAvatarUrl ?? null;

  return (
    <section
      className="grid grid-rows-[auto_1fr_auto] overflow-hidden rounded-2xl bg-(--color-surface) shadow-[0_8px_24px_-12px_rgba(15,23,42,0.18)]"
      style={{ height: "calc(100vh - 88px)" }}
    >
      {/* ── Header ── */}
      <header className="flex items-center gap-3 px-5 py-3.5">
        <Avatar name={otherName} url={otherAvatarUrl} size={44} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h1 className="truncate text-base font-bold text-(--color-text-main)">{otherName}</h1>
            {conversation?.status === "ARCHIVED" && (
              <span className="shrink-0 rounded-full border border-(--color-border) px-2 py-0.5 text-[10px] font-semibold text-(--color-text-muted)">
                Archived
              </span>
            )}
          </div>
          <div className="mt-0.5 flex items-center gap-2 text-xs text-(--color-text-muted)">
            <span className="font-medium text-(--color-brand-strong)">
              {conversation?.type === "CONTRACT" ? "Contract" : "Pre-hire"}
            </span>
            <span className="opacity-40">·</span>
            <span className="truncate">{conversation?.taskTitle}</span>
          </div>
        </div>
        {conversation?.otherUserRole === "FREELANCER" && conversation?.otherUserId && (
          <Link
            href={`/dashboard/profile/${conversation.otherUserId}`}
            className="flex h-8 items-center gap-1.5 rounded-lg border border-(--color-border) px-2.5 text-xs font-semibold text-(--color-text-muted) transition hover:border-(--color-brand) hover:text-(--color-brand-strong)"
          >
            <UserCircle className="h-3.5 w-3.5" />
            Profile
          </Link>
        )}
      </header>

      {/* ── Messages ── */}
      <div className="overflow-y-auto px-5 py-4">
        <div className="flex flex-col gap-1">
          {messages.map((message, idx) => {
            const isMine = message.senderId === userId;
            const isSystem = message.messageType === "SYSTEM";
            const prev = messages[idx - 1];
            const sameAuthorAsPrev = prev && prev.senderId === message.senderId && prev.messageType === message.messageType;

            const mediaAtts = (message.attachments ?? []).filter((a) => a.type === "IMAGE" || a.type === "VIDEO");
            const docAtts = (message.attachments ?? []).filter((a) => a.type === "DOCUMENT");

            // System message
            if (isSystem) {
              return (
                <div key={message.id} className="my-3 flex items-center gap-3">
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
                key={message.id}
                className={`group flex gap-3 rounded-xl px-2 py-1 transition-colors hover:bg-[color-mix(in_srgb,var(--color-border)_18%,transparent)] ${
                  isMine ? "bg-[color-mix(in_srgb,var(--color-brand-soft)_22%,transparent)]" : ""
                } ${sameAuthorAsPrev ? "mt-0.5" : "mt-3"}`}
              >
                {/* Avatar — hidden if same author continues */}
                <div className="w-9 shrink-0 pt-0.5">
                  {!sameAuthorAsPrev ? (
                    <Avatar
                      name={message.senderName}
                      url={isMine ? myAvatarUrl : otherAvatarUrl}
                      size={36}
                    />
                  ) : null}
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  {!sameAuthorAsPrev && (
                    <div className="mb-1 flex items-baseline gap-2">
                      <span className={`text-sm font-semibold ${isMine ? "text-(--color-brand-strong)" : "text-(--color-text-main)"}`}>
                        {message.senderName}
                      </span>
                      <ChatMessageTimestamp value={message.createdAt} className="text-[11px] text-(--color-text-muted)" />
                    </div>
                  )}

                  {/* Media */}
                  {mediaAtts.length > 0 && (
                    <div className="flex flex-col gap-1.5 mb-1">
                      {mediaAtts.map((att, i) => <MediaPreview key={i} attachment={att} />)}
                    </div>
                  )}

                  {/* Text body */}
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

                  {/* Documents */}
                  {docAtts.length > 0 && (
                    <div className="mt-1.5 flex flex-col gap-1.5">
                      {docAtts.map((att, i) => <DocPreview key={i} attachment={att} />)}
                    </div>
                  )}

                  {/* Timestamp for continued messages */}
                  {sameAuthorAsPrev && (
                    <div className="invisible mt-0.5 group-hover:visible">
                      <ChatMessageTimestamp value={message.createdAt} className="text-[11px] text-(--color-text-muted)" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* ── Composer ── */}
      <form onSubmit={handleSend} className="px-4 pb-4 pt-3">
        {/* Pending attachments */}
        {pendingAttachments.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {pendingAttachments.map((p) => (
              <div
                key={p.localId}
                className={`relative flex items-center gap-2 rounded-xl border p-2 ${
                  p.error ? "border-red-300 bg-red-50" : "border-(--color-border) bg-[color-mix(in_srgb,var(--color-surface-strong)_60%,transparent)]"
                }`}
              >
                {p.file.type.startsWith("image/") && p.preview ? (
                  <Image src={p.preview} alt={p.file.name} width={44} height={44} className="h-11 w-11 rounded-lg object-cover" unoptimized />
                ) : p.file.type.startsWith("video/") && p.preview ? (
                  <video src={p.preview} className="h-11 w-11 rounded-lg object-cover" muted />
                ) : (
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--color-surface)_80%,transparent)]">
                    <FileText className="h-5 w-5 text-(--color-text-muted)" />
                  </div>
                )}
                <div className="flex flex-col gap-0.5 pr-4">
                  {p.uploading ? (
                    <div className="flex items-center gap-1.5">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-(--color-brand)" />
                      <span className="text-[11px] text-(--color-text-muted)">Uploading…</span>
                    </div>
                  ) : p.error ? (
                    <>
                      <span className="text-[11px] font-medium text-red-500">Failed</span>
                      <button
                        type="button"
                        onClick={() => {
                          setPendingAttachments((prev) => prev.map((a) => a.localId === p.localId ? { ...a, uploading: true, error: null } : a));
                          uploadFile({ ...p, uploading: true, error: null });
                        }}
                        className="flex items-center gap-1 text-[11px] font-semibold text-(--color-brand) hover:underline"
                      >
                        <RotateCcw className="h-3 w-3" /> Retry
                      </button>
                    </>
                  ) : (
                    <span className="max-w-24 truncate text-[11px] text-(--color-text-muted)">{p.file.name}</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removePending(p.localId)}
                  className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-(--color-surface-strong) text-(--color-text-muted) shadow-sm"
                  aria-label="Remove"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {sendError && <p className="mt-1.5 text-xs text-red-500">{sendError}</p>}

        {/* Composer */}
        <div className="mt-2.5 flex items-end gap-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*,.pdf,.doc,.docx,.txt,.xlsx,.pptx,.zip"
            className="hidden"
            onChange={handleFileChange}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            aria-label="Attach file"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-(--color-text-muted) transition hover:bg-[color-mix(in_srgb,var(--color-border)_40%,transparent)] hover:text-(--color-text-main)"
          >
            <Paperclip className="h-4 w-4" />
          </button>
          <div className="relative" ref={emojiMenuRef}>
            <button
              type="button"
              aria-label="Emoji"
              aria-expanded={emojiPickerOpen}
              onClick={() => setEmojiPickerOpen((open) => !open)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-(--color-text-muted) transition hover:bg-[color-mix(in_srgb,var(--color-border)_40%,transparent)] hover:text-(--color-text-main)"
            >
              <Smile className="h-4 w-4" />
            </button>

            <EmojiPicker open={emojiPickerOpen} onSelect={insertEmoji} onClose={() => setEmojiPickerOpen(false)} />
          </div>

          <textarea
            ref={textareaRef}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (canSend) handleSend(e as unknown as React.FormEvent);
              }
            }}
            rows={1}
            placeholder="Send a message..."
            className="min-h-10 flex-1 resize-none rounded-xl border border-(--color-border) bg-[color-mix(in_srgb,var(--color-surface-strong)_50%,transparent)] px-4 py-2.5 text-sm text-(--color-text-main) outline-none placeholder:text-(--color-text-muted) focus:border-[color-mix(in_srgb,var(--color-brand)_40%,var(--color-border))] focus:ring-0"
            style={{ maxHeight: 160 }}
          />

          <button
            type="submit"
            disabled={!canSend}
            aria-label="Send message"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[linear-gradient(135deg,var(--color-brand),var(--color-brand-strong))] text-white shadow-sm transition hover:opacity-90 disabled:opacity-35"
          >
            {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          </button>
        </div>
      </form>
    </section>
  );
}
