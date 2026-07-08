"use client";

import Image from "next/image";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Paperclip, X, FileText, Loader2, RotateCcw, Send, Smile, UserCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Virtuoso, type VirtuosoHandle } from "react-virtuoso";
import { useAppSelector } from "@/lib/hooks";
import { useChatSocket } from "@/components/chat-socket-provider";
import EmojiPicker from "@/components/emoji-picker";
import type { ChatMessage, ChatMessagePage, ConversationSummary, MessageAttachment } from "@/lib/types/chat";
import type { AttachmentDto } from "@/lib/api";
import { createThumbnailFile } from "@/lib/utils/createThumbnailFile";
import MediaModal from "@/components/media-modal";
import Avatar from "@/components/conversation-thread/avatar";
import { renderMessageItemRow, type DisplayChatMessage } from "@/components/conversation-thread/render-message-item-row";
import { CHAT_MESSAGE_PAGE_SIZE, CHAT_VIDEO_UPLOAD_MAX_SIZE_BYTES } from "@/lib/constants/upload";
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

const attachmentSignature = (attachments?: MessageAttachment[]) =>
  (attachments ?? [])
    .map((attachment) => `${attachment.name}|${attachment.mimeType}|${attachment.type}|${attachment.size ?? ""}`)
    .join("::");

function messagesEquivalent(left: ChatMessage, right: ChatMessage) {
  if (left.senderId !== right.senderId) return false;
  if (left.messageType !== right.messageType) return false;
  if ((left.body ?? "") !== (right.body ?? "")) return false;
  return attachmentSignature(left.attachments) === attachmentSignature(right.attachments);
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

// ── Main component ────────────────────────────────────────────────────────────
export default function ConversationThread({ conversationId }: { conversationId: string }) {
  const router = useRouter();
  const { token, userId, avatarUrl: myAvatarUrl } = useAppSelector((s) => s.auth);
  const { socket, joinConversation, leaveConversation, emitConversationRead, emitMessageDelivered } = useChatSocket();
  const myDisplayName = useMemo(() => {
    const fallback = "You";
    if (!token) return fallback;
    return fallback;
  }, [token]);

  const { data: convData, isLoading: convLoading, error: convError } =
    useConversationsControllerGetConversationQuery({ id: conversationId }, {
      skip: !token || !conversationId,
      refetchOnFocus: true,
      refetchOnReconnect: true,
    });
  const [historyCursor, setHistoryCursor] = useState<string | null>(null);
  const { data: msgData, isLoading: msgLoading, isFetching: msgFetching } =
    useConversationsControllerGetMessagesQuery({ id: conversationId, before: historyCursor ?? "", limit: String(CHAT_MESSAGE_PAGE_SIZE) }, {
      skip: !token || !conversationId,
      refetchOnFocus: true,
      refetchOnReconnect: true,
    });
  const [sendMessage, { isLoading: sending }] = useConversationsControllerSendMessageMutation();
  const [generateSignedUrl] = useGcsControllerGenerateSignedUrlMutation();

  const baseConversation = (convData as ConversationSummary | undefined) ?? null;
  const [patches, setPatches] = useState<Partial<ConversationSummary>>({});
  const conversation = baseConversation ? { ...baseConversation, ...patches } : null;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [optimisticMessages, setOptimisticMessages] = useState<DisplayChatMessage[]>([]);
  const [nextHistoryCursor, setNextHistoryCursor] = useState<string | null>(null);
  const [hasMoreHistory, setHasMoreHistory] = useState(true);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [firstItemIndex, setFirstItemIndex] = useState(0);

  const [body, setBody] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const [mediaPreview, setMediaPreview] = useState<{ open: boolean; src: string; type: "IMAGE" | "VIDEO"; title?: string }>({
    open: false,
    src: "",
    type: "IMAGE",
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const emojiMenuRef = useRef<HTMLDivElement>(null);
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const didInitialScrollRef = useRef(false);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);

  const visibleMessages = useMemo<DisplayChatMessage[]>(() => {
    const stillPending = optimisticMessages.filter((pendingMessage) => {
      return !messages.some((message) => messagesEquivalent(message, pendingMessage));
    });

    return mergeUniqueMessages(messages, stillPending) as DisplayChatMessage[];
  }, [messages, optimisticMessages]);

  const openMediaPreview = (item: { url: string; type: "IMAGE" | "VIDEO"; name?: string }) => {
    setMediaPreview({ open: true, src: item.url, type: item.type, title: item.name });
  };

  const closeMediaPreview = () => {
    setMediaPreview((current) => ({ ...current, open: false }));
  };

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
    joinConversation(conversationId);
    return () => leaveConversation(conversationId);
  }, [conversationId, joinConversation, leaveConversation, token]);

  useEffect(() => {
    if (!conversationId || visibleMessages.length === 0) return;
    const lastMessage = visibleMessages[visibleMessages.length - 1];
    emitConversationRead(conversationId, lastMessage.id);
    setPatches((prev) => ({ ...prev, unreadCount: 0 }));
  }, [conversationId, emitConversationRead, visibleMessages]);

  useEffect(() => {
    setMessages([]);
    setOptimisticMessages([]);
    setPatches({});
    setHistoryCursor(null);
    setNextHistoryCursor(null);
    setHasMoreHistory(true);
    setIsLoadingOlder(false);
    setFirstItemIndex(0);
    setBody("");
    setSendError(null);
    setPendingAttachments((current) => {
      for (const attachment of current) {
        if (attachment.preview) URL.revokeObjectURL(attachment.preview);
      }
      return [];
    });
    setMediaPreview({ open: false, src: "", type: "IMAGE" });
    setEmojiPickerOpen(false);
    didInitialScrollRef.current = false;
  }, [conversationId]);

  useEffect(() => {
    if (!msgData) return;
    const page = msgData as ChatMessagePage;
    const pageItems = page.items ?? [];

    if (historyCursor === null) {
      setMessages(pageItems);
      setFirstItemIndex(0);
    } else {
      setMessages((current) => {
        const merged = mergeUniqueMessages(pageItems, current);
        const addedCount = merged.length - current.length;
        if (addedCount > 0) {
          setFirstItemIndex((value) => value - addedCount);
        }
        return merged;
      });
    }

    setNextHistoryCursor(page.nextCursor ?? null);
    setHasMoreHistory(Boolean(page.hasMore));
    setIsLoadingOlder(false);
  }, [conversationId, historyCursor, msgData]);

  useEffect(() => {
    if (didInitialScrollRef.current) return;
    if (visibleMessages.length === 0) return;

    virtuosoRef.current?.scrollToIndex({ index: visibleMessages.length - 1, align: "end" });
    didInitialScrollRef.current = true;
  }, [visibleMessages.length]);

  const loadOlderMessages = useCallback(() => {
    if (isLoadingOlder || msgFetching || !hasMoreHistory || !nextHistoryCursor) return;
    setIsLoadingOlder(true);
    setHistoryCursor(nextHistoryCursor);
  }, [hasMoreHistory, isLoadingOlder, msgFetching, nextHistoryCursor]);

  useEffect(() => {
    if (!socket) return;
    const onMessage = (p: ChatMessage) => {
      if (p.conversationId !== conversationId) return;
      setMessages((cur) => cur.some((m) => m.id === p.id) ? cur : mergeUniqueMessages(cur, [p]));
      setOptimisticMessages((current) => current.filter((pendingMessage) => !messagesEquivalent(p, pendingMessage)));
      setPatches((prev) => ({ ...prev, lastMessageText: p.body, lastMessageAt: p.createdAt }));
      if (p.senderId !== userId) {
        emitMessageDelivered(conversationId, p.id);
      }
    };
    const onUpdated = (p: Partial<ConversationSummary> & { conversationId: string }) => {
      if (p.conversationId !== conversationId) return;
      setPatches((prev) => ({ ...prev, ...p }));
    };
    const onStatusUpdated = (p: { conversationId: string; messageId: string; status: "delivered" | "read" }) => {
      if (p.conversationId !== conversationId) return;
      setMessages((cur) => {
        const idx = cur.findIndex((m) => m.id === p.messageId);
        if (idx === -1) return cur;
        return cur.map((m, i) => {
          if (m.senderId !== userId || m.status === "read") return m;
          if (p.status === "read" && i <= idx) return { ...m, status: "read" };
          if (p.status === "delivered" && i === idx) return { ...m, status: "delivered" };
          return m;
        });
      });
    };
    socket.on("message.created", onMessage);
    socket.on("conversation.updated", onUpdated);
    socket.on("message.status.updated", onStatusUpdated);
    return () => {
      socket.off("message.created", onMessage);
      socket.off("conversation.updated", onUpdated);
      socket.off("message.status.updated", onStatusUpdated);
    };
  }, [conversationId, emitMessageDelivered, socket, userId]);

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
      // If image, create thumbnail first
      let thumbFile: File | null = null;
      if (pending.file.type.startsWith("image/")) {
        try {
          thumbFile = await createThumbnailFile(pending.file);
        } catch (e) {
          console.error(`[thumbnail] error localId=${pending.localId} name=${pending.file.name} message=Thumbnail creation failed`, e);
        }
      }

      // Request signed URLs for original and thumbnail (if any) in parallel
      const origSignedPromise = generateSignedUrl({ generateUploadUrlDto: { fileName: pending.file.name, mimeType: pending.file.type, folder: "chat-attachments" } }).unwrap();
      const thumbSignedPromise = thumbFile
        ? (
            generateSignedUrl({ generateUploadUrlDto: { fileName: thumbFile.name, mimeType: thumbFile.type, folder: "chat-attachments/thumbnails" } }).unwrap()
          )
        : Promise.resolve(null);

      type Signed = { signedUrl: string; publicUrl: string; objectName: string } | null;
      const [origSigned, thumbSigned] = await Promise.all([origSignedPromise, thumbSignedPromise]) as [Signed, Signed];
      if (!origSigned) throw new Error('Failed to obtain signed URL for original');
      const signedUrl = origSigned.signedUrl;
      const publicUrl = origSigned.publicUrl;
      const objectName = origSigned.objectName;

      // Upload both files (original and thumbnail) concurrently
      const origPut = fetch(signedUrl, { method: "PUT", headers: { "Content-Type": pending.file.type }, body: pending.file });
      const thumbPut = thumbFile && thumbSigned
        ? (
            fetch(thumbSigned.signedUrl, { method: "PUT", headers: { "Content-Type": thumbFile.type }, body: thumbFile })
          )
        : Promise.resolve(null);

      const [origRes, thumbRes] = await Promise.all([origPut, thumbPut]);
      if (!(origRes as Response)?.ok) throw new Error(`Upload failed (HTTP ${(origRes as Response)?.status})`);

      let thumbnailUrl: string | undefined = undefined;
      if (thumbRes && (thumbRes as Response).ok && thumbSigned) {
        thumbnailUrl = thumbSigned.publicUrl;
      }

      const result: AttachmentDto = {
        url: publicUrl,
        publicId: objectName,
        name: pending.file.name,
        mimeType: pending.file.type,
        type: resolveAttachmentType(pending.file),
        size: pending.file.size,
        thumbnailUrl,
      };

      setPendingAttachments((prev) => prev.map((p) => p.localId === pending.localId ? { ...p, uploading: false, result } : p));
    } catch (err) {
      const msg = err instanceof Error ? err.message
        : typeof err === "object" && err !== null && "data" in err
          ? String((err as { data?: unknown }).data ?? "Upload failed")
          : "Upload failed";
      setErr(msg);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    for (const file of files) {
      if (file.type.startsWith("video/") && file.size > CHAT_VIDEO_UPLOAD_MAX_SIZE_BYTES) {
        setSendError("Video must be under 100 MB.");
        continue;
      }
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
    const readyAttachments = pendingAttachments.filter((p): p is PendingAttachment & { result: AttachmentDto } => p.result !== null);
    const ready = readyAttachments.map((p) => p.result);
    if ((!trimmed && ready.length === 0) || !token || pendingAttachments.some((p) => p.uploading)) return;

    const optimisticId = `optimistic-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const optimisticAttachments: MessageAttachment[] = readyAttachments.map((attachment) => ({
      url: (attachment.result.thumbnailUrl ?? (attachment.file.type.startsWith("image/") && attachment.preview ? attachment.preview : attachment.result.url)) as string,
      publicId: attachment.result.publicId,
      name: attachment.result.name,
      mimeType: attachment.result.mimeType,
      type: attachment.result.type,
      size: attachment.result.size,
    }));

    const optimisticMessage: DisplayChatMessage = {
      id: optimisticId,
      conversationId,
      senderId: userId ?? "",
      senderName: myDisplayName,
      body: trimmed,
      messageType: "TEXT",
      attachments: optimisticAttachments,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      optimistic: true,
    };

    setOptimisticMessages((current) => [...current, optimisticMessage]);

    try {
      setSendError(null);
      await sendMessage({
        id: conversationId,
        sendMessageDto: { ...(trimmed ? { body: trimmed } : {}), ...(ready.length > 0 ? { attachments: ready } : {}) },
      }).unwrap();
      setBody("");
      setPendingAttachments([]);
    } catch {
      setOptimisticMessages((current) => current.filter((message) => message.id !== optimisticId));
      setSendError("Failed to send. Please try again.");
    }
  };

  const canSend = !sending && !pendingAttachments.some((p) => p.uploading)
    && (body.trim().length > 0 || pendingAttachments.some((p) => p.result !== null));

  const hasLoadedMessages = messages.length > 0;
  const showInitialLoading = (!conversation && convLoading) || (!hasLoadedMessages && msgLoading && !isLoadingOlder);

  if (showInitialLoading) {
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
      <header className="flex items-center gap-3 px-5 py-3.5">
        <div className="relative">
          <Avatar name={otherName} url={otherAvatarUrl} size={44} />
          <span
            className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-(--color-surface) ${conversation?.otherUserOnline ? "bg-emerald-500" : "bg-slate-400"}`}
            aria-label={conversation?.otherUserOnline ? "Online" : "Offline"}
          />
        </div>
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

      <Virtuoso
        key={conversationId}
        ref={virtuosoRef}
        data={visibleMessages}
        className="min-h-0 px-5 py-4 hide-scrollbar"
        style={{ height: "100%" }}
        alignToBottom
        firstItemIndex={firstItemIndex}
        followOutput="auto"
        increaseViewportBy={{ top: 800, bottom: 1000 }}
        startReached={loadOlderMessages}
        computeItemKey={(_, message) => message.id}
        itemContent={(index, message) =>
          renderMessageItemRow(index, message as DisplayChatMessage, {
            visibleMessages,
            userId,
            myAvatarUrl,
            otherAvatarUrl,
            openMediaPreview,
          })
        }
        components={{
          Header: () =>
            isLoadingOlder ? (
              <div className="flex justify-center py-3 text-xs text-(--color-text-muted)">
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                Loading older messages...
              </div>
            ) : null,
        }}
      />

      <form onSubmit={handleSend} className="px-4 pb-4 pt-3">
        {pendingAttachments.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {pendingAttachments.map((p) => (
              <div
                key={p.localId}
                className={`relative flex items-center gap-3 rounded-xl border p-3 ${
                  p.error ? "border-red-300 bg-red-50" : "border-(--color-border) bg-[color-mix(in_srgb,var(--color-surface-strong)_60%,transparent)]"
                }`}
              >
                {p.file.type.startsWith("image/") && p.preview ? (
                  <Image src={p.preview} alt={p.file.name} width={60} height={60} className="h-14 w-14 rounded-lg object-cover" unoptimized />
                ) : p.file.type.startsWith("video/") && p.preview ? (
                  <video src={p.preview} className="h-14 w-14 rounded-lg object-cover" muted />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--color-surface)_80%,transparent)]">
                    <FileText className="h-6 w-6 text-(--color-text-muted)" />
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
                    <span className="max-w-32 truncate text-[11px] text-(--color-text-muted)">{p.file.name}</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removePending(p.localId)}
                  className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-(--color-surface-strong) text-(--color-text-muted) shadow-sm"
                  aria-label="Remove"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {sendError && <p className="mt-1.5 text-xs text-red-500">{sendError}</p>}

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

      <MediaModal
        open={mediaPreview.open}
        src={mediaPreview.src}
        type={mediaPreview.type}
        title={mediaPreview.title}
        onClose={closeMediaPreview}
      />
    </section>
  );
}
