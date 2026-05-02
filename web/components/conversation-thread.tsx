"use client";

import Image from "next/image";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUp, Paperclip, X, FileText, Loader2, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAppSelector } from "@/lib/hooks";
import { useChatSocket } from "@/components/chat-socket-provider";
import { markConversationRead } from "@/lib/useUnreadMessages";
import ChatMessageTimestamp from "@/components/chat-message-timestamp";
import type { ChatMessage, ConversationSummary, MessageAttachment } from "@/lib/types/chat";
import type { AttachmentDto } from "@/lib/api";
import {
  useConversationsControllerGetConversationQuery,
  useConversationsControllerGetMessagesQuery,
  useConversationsControllerSendMessageMutation,
  useCloudinaryControllerGenerateUploadSignatureMutation,
} from "@/lib/api";

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? "";
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100 MB

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

const mergeUniqueMessages = (current: ChatMessage[], incoming: ChatMessage[]) => {
  const byId = new Map<string, ChatMessage>();
  for (const message of current) byId.set(message.id, message);
  for (const message of incoming) byId.set(message.id, message);
  return Array.from(byId.values()).sort((a, b) => {
    const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return aTime - bTime;
  });
};

function AttachmentPreview({ attachment }: { attachment: MessageAttachment }) {
  if (attachment.type === "IMAGE") {
    return (
      <a href={attachment.url} target="_blank" rel="noopener noreferrer" className="block">
        <Image
          src={attachment.url}
          alt={attachment.name}
          width={0}
          height={0}
          sizes="100vw"
          className="max-h-48 max-w-full rounded-xl object-cover"
          style={{ width: "100%", height: "auto" }}
        />
      </a>
    );
  }
  if (attachment.type === "VIDEO") {
    return (
      <video
        src={attachment.url}
        controls
        className="max-h-48 max-w-full rounded-xl"
        preload="metadata"
      />
    );
  }
  return (
    <a
      href={attachment.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 rounded-xl border border-(--color-border) bg-[color-mix(in_srgb,var(--color-surface)_90%,transparent)] px-3 py-2 no-underline hover:bg-[color-mix(in_srgb,var(--color-surface)_80%,transparent)]"
    >
      <FileText className="h-5 w-5 shrink-0 text-(--color-text-muted)" />
      <span className="max-w-50 truncate text-xs font-medium text-(--color-text-main)">
        {attachment.name}
      </span>
    </a>
  );
}

export default function ConversationThread({
  conversationId,
}: {
  conversationId: string;
}) {
  const router = useRouter();
  const { token, userId } = useAppSelector((state) => state.auth);
  const { socket, joinConversation, leaveConversation } = useChatSocket();
  const {
    data: conversationData,
    isLoading: isConversationLoading,
    error: conversationError,
  } = useConversationsControllerGetConversationQuery(
    { id: conversationId },
    { skip: !token || !conversationId },
  );
  const {
    data: messagesData,
    isLoading: isMessagesLoading,
  } = useConversationsControllerGetMessagesQuery(
    { id: conversationId, before: "", limit: "100" },
    { skip: !token || !conversationId },
  );
  const [sendMessage, { isLoading: sending }] = useConversationsControllerSendMessageMutation();
  const [generateSignature] = useCloudinaryControllerGenerateUploadSignatureMutation();

  const baseConversation = (conversationData as ConversationSummary | undefined) ?? null;
  const [conversationPatches, setConversationPatches] = useState<Partial<ConversationSummary>>({});
  const conversation = baseConversation ? { ...baseConversation, ...conversationPatches } : null;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [prevMessagesData, setPrevMessagesData] = useState(messagesData);
  if (prevMessagesData !== messagesData) {
    setPrevMessagesData(messagesData);
    const nextMessages = (messagesData as ChatMessage[] | undefined) ?? [];
    setMessages((current) => mergeUniqueMessages(current, nextMessages));
  }

  const [body, setBody] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const queryError = useMemo(() => {
    if (!conversationError) return null;
    if (typeof conversationError === "object" && "data" in conversationError) {
      const data = (conversationError as { data?: unknown }).data;
      return typeof data === "string" ? data : "Failed to load conversation";
    }
    return "Failed to load conversation";
  }, [conversationError]);

  const error = sendError ?? queryError;

  useEffect(() => {
    if (!token || !conversationId) return;
    markConversationRead(conversationId);
    joinConversation(conversationId);
    return () => {
      leaveConversation(conversationId);
    };
  }, [conversationId, joinConversation, leaveConversation, token]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!socket) return;

    const handleMessageCreated = (payload: ChatMessage) => {
      if (payload.conversationId !== conversationId) return;
      setMessages((current) => {
        if (current.some((m) => m.id === payload.id)) return current;
        return mergeUniqueMessages(current, [payload]);
      });
      setConversationPatches((prev) => ({
        ...prev,
        lastMessageText: payload.body,
        lastMessageAt: payload.createdAt,
      }));
      markConversationRead(conversationId);
    };

    const handleConversationUpdated = (
      payload: Partial<ConversationSummary> & { conversationId: string },
    ) => {
      if (payload.conversationId !== conversationId) return;
      setConversationPatches((prev) => ({ ...prev, ...payload }));
    };

    socket.on("message.created", handleMessageCreated);
    socket.on("conversation.updated", handleConversationUpdated);

    return () => {
      socket.off("message.created", handleMessageCreated);
      socket.off("conversation.updated", handleConversationUpdated);
    };
  }, [conversationId, socket]);

  const uploadFile = async (pending: PendingAttachment) => {
    const setError = (msg: string) =>
      setPendingAttachments((prev) =>
        prev.map((p) => (p.localId === pending.localId ? { ...p, uploading: false, error: msg } : p)),
      );

    try {
      if (!CLOUD_NAME) {
        setError("Cloudinary not configured — contact support");
        return;
      }

      const timestamp = Math.floor(Date.now() / 1000);
      const folder = "chat-attachments";

      const sigData = await generateSignature({
        generateUploadSignatureDto: { timestamp, folder },
      }).unwrap() as { signature: string; api_key: string; timestamp: number };

      if (!sigData.api_key || !sigData.signature) {
        setError("Upload service not configured — contact support");
        return;
      }

      const resourceType = pending.file.type.startsWith("video/") ? "video" : "auto";
      const formData = new FormData();
      formData.append("file", pending.file);
      formData.append("folder", folder);
      formData.append("timestamp", String(timestamp));
      formData.append("signature", sigData.signature);
      formData.append("api_key", sigData.api_key);

      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`,
        { method: "POST", body: formData },
      );

      if (!res.ok) {
        const errData = await res.json().catch(() => ({})) as { error?: { message?: string } };
        throw new Error(errData?.error?.message ?? `Upload failed (HTTP ${res.status})`);
      }

      const data = (await res.json()) as { secure_url: string; public_id: string; bytes: number };

      const attachmentType = resolveAttachmentType(pending.file);
      const result: AttachmentDto = {
        url: data.secure_url,
        publicId: data.public_id,
        name: pending.file.name,
        mimeType: pending.file.type,
        type: attachmentType,
        size: data.bytes,
      };

      setPendingAttachments((prev) =>
        prev.map((p) => (p.localId === pending.localId ? { ...p, uploading: false, result } : p)),
      );
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : typeof err === "object" && err !== null && "data" in err
            ? String((err as { data?: unknown }).data ?? "Upload failed")
            : "Upload failed";
      console.error("[chat upload]", err);
      setError(msg);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";

    for (const file of files) {
      if (file.type.startsWith("video/") && file.size > MAX_VIDEO_SIZE) {
        setSendError("Video files must be under 100 MB.");
        continue;
      }

      const localId = `${Date.now()}-${Math.random()}`;
      const preview =
        file.type.startsWith("image/") || file.type.startsWith("video/")
          ? URL.createObjectURL(file)
          : null;

      const pending: PendingAttachment = {
        localId,
        file,
        preview,
        uploading: true,
        error: null,
        result: null,
      };

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

  const handleSend = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = body.trim();
    const readyAttachments = pendingAttachments
      .filter((p) => p.result !== null)
      .map((p) => p.result!);

    if ((!trimmed && readyAttachments.length === 0) || !token) return;
    if (pendingAttachments.some((p) => p.uploading)) return;

    try {
      setSendError(null);
      await sendMessage({
        id: conversationId,
        sendMessageDto: {
          ...(trimmed ? { body: trimmed } : {}),
          ...(readyAttachments.length > 0 ? { attachments: readyAttachments } : {}),
        },
      }).unwrap();
      setBody("");
      setPendingAttachments([]);
      markConversationRead(conversationId);
    } catch {
      setSendError("Failed to send message. Please try again.");
    }
  };

  const canSend =
    !sending &&
    !pendingAttachments.some((p) => p.uploading) &&
    (body.trim().length > 0 || pendingAttachments.some((p) => p.result !== null));

  const loading = isConversationLoading || isMessagesLoading;

  if (loading) {
    return (
      <div className="rounded-2xl border border-[color-mix(in_srgb,var(--color-border)_90%,transparent)] bg-[color-mix(in_srgb,var(--color-surface)_94%,transparent)] p-4 shadow-[0_8px_24px_-12px_rgba(15,23,42,0.18)]">
        <p className="text-sm text-(--color-text-muted)">Loading conversation...</p>
      </div>
    );
  }

  if (error && !conversation) {
    return (
      <div className="rounded-2xl border border-dashed border-[color-mix(in_srgb,var(--color-border)_90%,transparent)] bg-[color-mix(in_srgb,var(--color-surface)_85%,transparent)] p-6 text-center shadow-[0_8px_24px_-12px_rgba(15,23,42,0.18)]">
        <h2 className="text-xl font-bold tracking-tight text-(--color-text-main)">
          Conversation not available
        </h2>
        <p className="mt-2 text-sm text-(--color-text-muted)">{error}</p>
        <button
          type="button"
          className="mt-6 inline-flex items-center justify-center rounded-full border border-transparent bg-[linear-gradient(135deg,var(--color-brand),var(--color-brand-strong))] px-5 py-2.5 text-sm font-semibold text-white"
          onClick={() => router.push("/dashboard/messages")}
        >
          Back to Messages
        </button>
      </div>
    );
  }

  return (
    <section
      className="grid grid-rows-[auto_1fr_auto] rounded-2xl border border-[color-mix(in_srgb,var(--color-border)_90%,transparent)] bg-[color-mix(in_srgb,var(--color-surface)_94%,transparent)] shadow-[0_8px_24px_-12px_rgba(15,23,42,0.18)]"
      style={{ height: "calc(100vh - 88px)" }}
    >
      <header className="border-b border-[color-mix(in_srgb,var(--color-border)_85%,transparent)] px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-(--color-text-muted)">
              {conversation?.type === "CONTRACT" ? "Contract Chat" : "Pre-hire Chat"}
            </p>
            <h1 className="mt-0.5 truncate text-base font-bold tracking-tight text-(--color-text-main)">
              {conversation?.otherUserName ?? "Conversation"}
            </h1>
            <p className="truncate text-xs text-(--color-text-muted)">{conversation?.taskTitle}</p>
          </div>
          {conversation?.status === "ARCHIVED" ? (
            <span className="shrink-0 rounded-full border border-(--color-border) px-2.5 py-1 text-xs font-semibold text-(--color-text-muted)">
              Archived
            </span>
          ) : null}
        </div>
      </header>

      <div className="overflow-y-auto p-4">
        <div className="grid gap-3">
          {messages.map((message) => {
            const isMine = message.senderId === userId;
            const isSystem = message.messageType === "SYSTEM";
            return (
              <article
                key={message.id}
                className={`max-w-[85%] rounded-2xl border px-4 py-3 ${
                  isSystem
                    ? "mx-auto border-[color-mix(in_srgb,var(--color-accent)_30%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-accent-soft)_70%,var(--color-surface))] text-center"
                    : isMine
                      ? "ml-auto border-[color-mix(in_srgb,var(--color-brand)_30%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-brand-soft)_68%,var(--color-surface))]"
                      : "border-(--color-border) bg-[color-mix(in_srgb,var(--color-surface)_95%,transparent)]"
                }`}
              >
                {!isSystem ? (
                  <div className="mb-1 flex items-center justify-between gap-3 text-xs text-(--color-text-muted)">
                    <span className="font-semibold text-(--color-text-main)">{message.senderName}</span>
                    <ChatMessageTimestamp value={message.createdAt} />
                  </div>
                ) : null}
                {message.body ? (
                  <p className="whitespace-pre-wrap text-sm leading-6 text-(--color-text-main)">
                    {message.body}
                  </p>
                ) : null}
                {message.attachments && message.attachments.length > 0 ? (
                  <div className={`grid gap-2 ${message.body ? "mt-2" : ""}`}>
                    {message.attachments.map((att, i) => (
                      <AttachmentPreview key={i} attachment={att} />
                    ))}
                  </div>
                ) : null}
                {isSystem ? (
                  <div className="mt-2 text-center text-[11px] text-(--color-text-muted)">
                    <ChatMessageTimestamp value={message.createdAt} />
                  </div>
                ) : null}
              </article>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <form
        onSubmit={handleSend}
        className="border-t border-[color-mix(in_srgb,var(--color-border)_85%,transparent)] px-4 py-3"
      >
        {pendingAttachments.length > 0 ? (
          <div className="mb-2 flex flex-wrap gap-2">
            {pendingAttachments.map((p) => (
              <div
                key={p.localId}
                className={`relative flex items-center gap-1.5 rounded-xl border p-1.5 ${
                  p.error
                    ? "border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/30"
                    : "border-(--color-border) bg-[color-mix(in_srgb,var(--color-surface)_90%,transparent)]"
                }`}
              >
                {p.file.type.startsWith("image/") && p.preview ? (
                  <Image
                    src={p.preview}
                    alt={p.file.name}
                    width={48}
                    height={48}
                    className="h-12 w-12 rounded-lg object-cover"
                    unoptimized
                  />
                ) : p.file.type.startsWith("video/") && p.preview ? (
                  <video src={p.preview} className="h-12 w-12 rounded-lg object-cover" muted />
                ) : (
                  <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${p.error ? "bg-red-100 dark:bg-red-900/40" : "bg-[color-mix(in_srgb,var(--color-surface)_80%,transparent)]"}`}>
                    <FileText className={`h-5 w-5 ${p.error ? "text-red-400" : "text-(--color-text-muted)"}`} />
                  </div>
                )}
                <div className="flex flex-col gap-0.5">
                  {p.uploading ? (
                    <div className="flex items-center gap-1">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-(--color-brand)" />
                      <span className="text-[10px] text-(--color-text-muted)">Uploading…</span>
                    </div>
                  ) : p.error ? (
                    <>
                      <span className="text-[10px] font-medium text-red-500">Failed to upload</span>
                      <button
                        type="button"
                        onClick={() => {
                          setPendingAttachments((prev) =>
                            prev.map((a) =>
                              a.localId === p.localId
                                ? { ...a, uploading: true, error: null }
                                : a,
                            ),
                          );
                          uploadFile({ ...p, uploading: true, error: null });
                        }}
                        className="flex items-center gap-1 text-[10px] font-semibold text-(--color-brand) hover:underline"
                      >
                        <RotateCcw className="h-3 w-3" />
                        Retry
                      </button>
                    </>
                  ) : (
                    <span className="max-w-20 truncate text-[10px] text-(--color-text-muted)">
                      {p.file.name}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removePending(p.localId)}
                  className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--color-surface)_90%,var(--color-border))] text-(--color-text-muted)"
                  aria-label="Remove attachment"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        ) : null}

        {sendError ? (
          <p className="mb-2 text-xs text-red-500">{sendError}</p>
        ) : null}

        <div className="flex items-end gap-2">
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
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-(--color-border) bg-[color-mix(in_srgb,var(--color-surface)_88%,transparent)] text-(--color-text-muted) transition hover:border-(--color-brand) hover:text-(--color-brand)"
          >
            <Paperclip className="h-4 w-4" />
          </button>
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (canSend) handleSend(e as unknown as React.FormEvent<HTMLFormElement>);
              }
            }}
            rows={1}
            placeholder="Write a message..."
            className="min-h-10 flex-1 resize-none rounded-2xl border border-(--color-border) bg-[color-mix(in_srgb,var(--color-surface)_95%,transparent)] px-4 py-2.5 text-sm text-(--color-text-main) outline-none placeholder:text-(--color-text-muted) focus:border-[color-mix(in_srgb,var(--color-brand)_35%,var(--color-border))]"
          />
          <button
            type="submit"
            disabled={!canSend}
            aria-label="Send message"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--color-brand),var(--color-brand-strong))] text-white shadow-sm transition hover:opacity-90 disabled:opacity-40"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowUp className="h-4 w-4" />
            )}
          </button>
        </div>
      </form>
    </section>
  );
}
