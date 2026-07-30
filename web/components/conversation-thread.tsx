"use client";

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, CalendarPlus, Loader2, Paperclip, Send, Smile, UserCircle, Video } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Virtuoso, type Components, type VirtuosoHandle } from "react-virtuoso";
import { toast } from "sonner";
import { useAppSelector } from "@/lib/hooks";
import { useChatSocket } from "@/components/chat-socket-provider";
import { useNavigationLoading } from "@/components/navigation-loading-provider";
import AppLoader from "@/components/app-loader";
import EmojiPicker from "@/components/emoji-picker";
import type { ChatMessage, ChatMessagePage, ConversationSummary, Meeting, MessageAttachment } from "@/lib/types/chat";
import type { AttachmentDto } from "@/lib/api";
import { createThumbnailFile } from "@/lib/utils/createThumbnailFile";
import MediaModal from "@/components/media-modal";
import Avatar from "@/components/conversation-thread/avatar";
import ScheduleMeetingModal from "@/components/conversation-thread/schedule-meeting-modal";
import AttachmentPickerMenu, { ATTACHMENT_ACCEPT, type AttachmentPickerKind } from "@/components/conversation-thread/attachment-picker-menu";
import PendingAttachmentPreview from "@/components/conversation-thread/pending-attachment-preview";
import { renderMessageItemRow, type DisplayChatMessage } from "@/components/conversation-thread/render-message-item-row";
import { CHAT_ATTACHMENT_UPLOAD_TIMEOUT_MS, CHAT_MESSAGE_PAGE_SIZE, CHAT_SMALL_IMAGE_SIZE_BYTES, CHAT_VIDEO_UPLOAD_MAX_SIZE_BYTES, CHAT_VIDEO_UPLOAD_TIMEOUT_MS } from "@/lib/constants/upload";
import {
  useConversationsControllerGetConversationQuery,
  useConversationsControllerGetMessagesQuery,
  useLazyConversationsControllerGetMessagesQuery,
  useConversationsControllerSendMessageMutation,
  useGcsControllerGenerateSignedUrlMutation,
  useMeetingsControllerCancelMutation,
  useMeetingsControllerCreateInstantMutation,
  useMeetingsControllerListUpcomingQuery,
} from "@/lib/api";


type PendingAttachment = {
  localId: string;
  file: File;
  preview: string | null;
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

function confirmsOptimisticMessage(message: ChatMessage, pendingMessage: DisplayChatMessage) {
  if (!messagesEquivalent(message, pendingMessage)) return false;
  if (!message.createdAt || !pendingMessage.createdAt) return false;

  const messageTime = new Date(message.createdAt).getTime();
  const pendingTime = new Date(pendingMessage.createdAt).getTime();
  if (!Number.isFinite(messageTime) || !Number.isFinite(pendingTime)) return false;

  const confirmationDelay = messageTime - pendingTime;
  return confirmationDelay >= -5_000 && confirmationDelay <= 120_000;
}
const mergeUniqueMessages = (current: ChatMessage[], incoming: ChatMessage[]) => {
  const byId = new Map<string, ChatMessage>();
  for (const m of current) byId.set(m.id, m);
  for (const m of incoming) byId.set(m.id, m);
  return Array.from(byId.values()).sort((a, b) => {
    const aT = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bT = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    if (aT !== bT) return aT - bT;
    return a.id.localeCompare(b.id);
  });
};

const VIRTUOSO_FIRST_ITEM_INDEX = 1_000_000;
const MESSAGE_ROW_ESTIMATED_HEIGHT_PX = 72;
const MESSAGE_OVERSCAN_PX = 1_200;
const MESSAGE_OVERSCAN_ITEMS = 8;
const MEETING_STATUS_POLL_INTERVAL_MS = 60_000;
const MAX_BROWSER_TIMEOUT_MS = 2_147_000_000;
const CHAT_COMPOSER_MIN_HEIGHT_PX = 40;
const CHAT_COMPOSER_MAX_HEIGHT_PX = 120;

type MessageListContext = {
  isLoadingOlder: boolean;
};

function MessageListHeader({ context }: { context: MessageListContext }) {
  return (
    <div className="px-5 pt-4">
      {context.isLoadingOlder ? (
        <div className="flex justify-center py-3 text-xs text-(--color-text-muted)">
          <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
          Loading older messages...
        </div>
      ) : null}
    </div>
  );
}

function MessageListFooter() {
  return <div aria-hidden="true" className="h-4" />;
}

const MESSAGE_LIST_COMPONENTS: Components<DisplayChatMessage, MessageListContext> = {
  Header: MessageListHeader,
  Footer: MessageListFooter,
};

// Main conversation thread
export default function ConversationThread({ conversationId }: { conversationId: string }) {
  const router = useRouter();
  const { startRouteLoading } = useNavigationLoading();
  const { token, userId, avatarUrl: myAvatarUrl } = useAppSelector((s) => s.auth);
  const { socket, connected, joinConversation, leaveConversation, emitConversationRead } = useChatSocket();
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
  const { currentData: latestMessagesData, isError: messagesQueryFailed } =
    useConversationsControllerGetMessagesQuery({ id: conversationId, before: "", limit: String(CHAT_MESSAGE_PAGE_SIZE) }, {
      skip: !token || !conversationId,
      refetchOnFocus: true,
      refetchOnReconnect: true,
    });
  const [fetchOlderMessages] = useLazyConversationsControllerGetMessagesQuery();
  const [sendMessage] = useConversationsControllerSendMessageMutation();
  const [generateSignedUrl] = useGcsControllerGenerateSignedUrlMutation();
  const [createInstantMeeting, { isLoading: startingMeeting }] = useMeetingsControllerCreateInstantMutation();
  const [cancelMeeting, { isLoading: cancellingMeeting }] = useMeetingsControllerCancelMutation();
  const { data: upcomingMeetingsData, refetch: refetchUpcomingMeetings } = useMeetingsControllerListUpcomingQuery(
    { conversationId },
    {
      skip: !token || !conversationId,
      refetchOnFocus: true,
      refetchOnReconnect: true,
      pollingInterval: MEETING_STATUS_POLL_INTERVAL_MS,
      skipPollingIfUnfocused: true,
    },
  );
  const [meetingClock, setMeetingClock] = useState(() => Date.now());
  const [inactiveMeetingIds, setInactiveMeetingIds] = useState<ReadonlySet<string>>(() => new Set());
  const upcomingMeeting = useMemo(
    () =>
      ((upcomingMeetingsData as Meeting[] | undefined) ?? []).find((meeting) => {
        const endTime = new Date(meeting.endTimeUtc).getTime();
        return (
          !inactiveMeetingIds.has(meeting.id) &&
          (meeting.status === "SCHEDULED" || meeting.status === "STARTED") &&
          Number.isFinite(endTime) &&
          endTime > meetingClock
        );
      }) ?? null,
    [inactiveMeetingIds, meetingClock, upcomingMeetingsData],
  );
  const canCancelUpcomingMeeting = Boolean(
    upcomingMeeting &&
      upcomingMeeting.status === "SCHEDULED" &&
      upcomingMeeting.hostUserId === userId &&
      new Date(upcomingMeeting.startTimeUtc).getTime() > meetingClock,
  );
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);

  const baseConversation = (convData as ConversationSummary | undefined) ?? null;
  const [patches, setPatches] = useState<Partial<ConversationSummary>>({});
  const conversation = baseConversation ? { ...baseConversation, ...patches } : null;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [optimisticMessages, setOptimisticMessages] = useState<DisplayChatMessage[]>([]);
  const [nextHistoryCursor, setNextHistoryCursor] = useState<string | null>(null);
  const [hasMoreHistory, setHasMoreHistory] = useState(true);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [firstItemIndex, setFirstItemIndex] = useState(VIRTUOSO_FIRST_ITEM_INDEX);
  const [isAtBottom, setIsAtBottom] = useState(false);
  const [loadedMessagesConversationId, setLoadedMessagesConversationId] = useState<string | null>(null);
  const [isWindowActive, setIsWindowActive] = useState(
    () => typeof document !== "undefined" && document.visibilityState === "visible" && document.hasFocus(),
  );

  const [body, setBody] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
  const [attachmentMenuOpen, setAttachmentMenuOpen] = useState(false);
  const [attachmentPickerKind, setAttachmentPickerKind] = useState<AttachmentPickerKind>("IMAGE");
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const [mediaPreview, setMediaPreview] = useState<{ open: boolean; src: string; type: "IMAGE" | "VIDEO"; title?: string }>({
    open: false,
    src: "",
    type: "IMAGE",
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const attachmentMenuRef = useRef<HTMLDivElement>(null);
  const activeUploadControllersRef = useRef<Map<string, AbortController>>(new Map());
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const emojiMenuRef = useRef<HTMLDivElement>(null);
  const isLoadingOlderRef = useRef(false);
  const hasLoadedOlderMessagesRef = useRef(false);
  const activeConversationIdRef = useRef(conversationId);
  const lastReadMessageIdRef = useRef<string | null>(null);
  activeConversationIdRef.current = conversationId;

  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);

  const visibleMessages = useMemo<DisplayChatMessage[]>(
    () => mergeUniqueMessages(messages, optimisticMessages) as DisplayChatMessage[],
    [messages, optimisticMessages],
  );

  const latestOutgoingMessageId = useMemo(() => {
    const latestMessage = visibleMessages.findLast((message) => message.messageType !== "SYSTEM");
    return latestMessage?.senderId === userId ? latestMessage.id : null;
  }, [visibleMessages, userId]);

  const openMediaPreview = useCallback((item: { url: string; type: "IMAGE" | "VIDEO"; name?: string }) => {
    setMediaPreview({ open: true, src: item.url, type: item.type, title: item.name });
  }, []);

  const closeMediaPreview = useCallback(() => {
    setMediaPreview((current) => ({ ...current, open: false }));
  }, []);

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
    if (!conversationId || !userId || !connected || !isAtBottom || !isWindowActive) return;
    const lastIncomingMessage = visibleMessages.findLast(
      (message) =>
        message.conversationId === conversationId &&
        message.messageType !== "SYSTEM" && message.senderId !== userId,
    );
    if (!lastIncomingMessage || lastReadMessageIdRef.current === lastIncomingMessage.id) return;

    lastReadMessageIdRef.current = lastIncomingMessage.id;
    emitConversationRead(conversationId, lastIncomingMessage.id);
    setPatches((prev) => ({ ...prev, unreadCount: 0 }));
  }, [connected, conversationId, emitConversationRead, isAtBottom, isWindowActive, userId, visibleMessages]);

  useEffect(() => {
    const updateWindowActivity = () => {
      setIsWindowActive(document.visibilityState === "visible" && document.hasFocus());
    };

    document.addEventListener("visibilitychange", updateWindowActivity);
    window.addEventListener("focus", updateWindowActivity);
    window.addEventListener("blur", updateWindowActivity);
    return () => {
      document.removeEventListener("visibilitychange", updateWindowActivity);
      window.removeEventListener("focus", updateWindowActivity);
      window.removeEventListener("blur", updateWindowActivity);
    };
  }, []);

  useEffect(() => {
    for (const controller of activeUploadControllersRef.current.values()) {
      controller.abort(new DOMException("Conversation changed", "AbortError"));
    }
    activeUploadControllersRef.current.clear();
    setAttachmentMenuOpen(false);
    setMessages([]);
    setOptimisticMessages([]);
    setPatches({});
    setMeetingClock(Date.now());
    setInactiveMeetingIds(new Set());
    setNextHistoryCursor(null);
    setHasMoreHistory(true);
    setIsLoadingOlder(false);
    isLoadingOlderRef.current = false;
    hasLoadedOlderMessagesRef.current = false;
    setFirstItemIndex(VIRTUOSO_FIRST_ITEM_INDEX);
    setIsAtBottom(false);
    setLoadedMessagesConversationId(null);
    lastReadMessageIdRef.current = null;
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
  }, [conversationId]);
  useEffect(() => {
    if (!upcomingMeeting) return;

    const now = Date.now();
    const startTime = new Date(upcomingMeeting.startTimeUtc).getTime();
    const endTime = new Date(upcomingMeeting.endTimeUtc).getTime();
    if (!Number.isFinite(endTime)) return;

    const nextBoundary =
      upcomingMeeting.status === "SCHEDULED" && Number.isFinite(startTime) && startTime > now
        ? startTime
        : endTime;
    const remaining = Math.max(nextBoundary - now, 0);
    const timeout = window.setTimeout(() => {
      setMeetingClock(Date.now());
      void refetchUpcomingMeetings();
    }, Math.min(remaining + 250, MAX_BROWSER_TIMEOUT_MS));

    return () => window.clearTimeout(timeout);
  }, [meetingClock, refetchUpcomingMeetings, upcomingMeeting]);


  useEffect(() => {
    if (!latestMessagesData) return;
    const page = latestMessagesData as ChatMessagePage;
    const pageItems = page.items ?? [];

    setMessages((current) => mergeUniqueMessages(current, pageItems));
    if (!hasLoadedOlderMessagesRef.current) {
      setNextHistoryCursor(page.nextCursor ?? null);
      setHasMoreHistory(Boolean(page.hasMore));
    }
    setLoadedMessagesConversationId(conversationId);
  }, [conversationId, latestMessagesData]);

  useEffect(() => {
    isLoadingOlderRef.current = isLoadingOlder;
  }, [isLoadingOlder]);

  const followNewMessages = useCallback((atBottom: boolean): "smooth" | false => {
    // Prepending history and following appended messages both adjust scrollTop.
    // Never let those two Virtuoso modes compete for the same render.
    if (isLoadingOlderRef.current) return false;
    return atBottom ? "smooth" : false;
  }, []);

  const messageListContext = useMemo(() => ({ isLoadingOlder }), [isLoadingOlder]);
  const loadOlderMessages = useCallback(async () => {
    const cursor = nextHistoryCursor;
    if (isLoadingOlderRef.current || !hasMoreHistory || !cursor || !token) return;

    const requestedConversationId = conversationId;
    isLoadingOlderRef.current = true;
    setIsLoadingOlder(true);

    try {
      const page = (await fetchOlderMessages(
        {
          id: requestedConversationId,
          before: cursor,
          limit: String(CHAT_MESSAGE_PAGE_SIZE),
        },
        true,
      ).unwrap()) as ChatMessagePage;

      if (activeConversationIdRef.current !== requestedConversationId) return;

      const pageItems = page.items ?? [];
      setMessages((current) => {
        const merged = mergeUniqueMessages(current, pageItems);
        const addedCount = merged.length - current.length;
        if (addedCount > 0) {
          setFirstItemIndex((value) => value - addedCount);
        }
        return merged;
      });
      hasLoadedOlderMessagesRef.current = true;
      setNextHistoryCursor(page.nextCursor ?? null);
      setHasMoreHistory(Boolean(page.hasMore));
    } catch {
      if (activeConversationIdRef.current === requestedConversationId) {
        toast.error("Could not load older messages. Please try again.");
      }
    } finally {
      if (activeConversationIdRef.current === requestedConversationId) {
        setIsLoadingOlder(false);
      }
    }
  }, [conversationId, fetchOlderMessages, hasMoreHistory, nextHistoryCursor, token]);

  useEffect(() => {
    if (!socket) return;
    const onMessage = (p: ChatMessage) => {
      if (p.conversationId !== conversationId) return;
      setMessages((cur) => cur.some((m) => m.id === p.id) ? cur : mergeUniqueMessages(cur, [p]));
      setOptimisticMessages((current) => current.filter((pendingMessage) => !confirmsOptimisticMessage(p, pendingMessage)));
      setPatches((prev) => ({ ...prev, lastMessageText: p.body, lastMessageAt: p.createdAt }));
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
    const onMeetingCreated = (meeting: Meeting) => {
      if (meeting.conversationId !== conversationId) return;

      setMeetingClock(Date.now());
      setInactiveMeetingIds((current) => {
        if (!current.has(meeting.id)) return current;
        const next = new Set(current);
        next.delete(meeting.id);
        return next;
      });
      void refetchUpcomingMeetings();

      if (meeting.type === "INSTANT" && meeting.hostUserId !== userId) {
        toast("Video call started", {
          description: meeting.topic,
          action: { label: "Join", onClick: () => window.open(meeting.joinUrl, "_blank") },
        });
      }
    };
    const onMeetingInactive = (meeting: Pick<Meeting, "id" | "conversationId">) => {
      if (meeting.conversationId !== conversationId) return;

      setInactiveMeetingIds((current) => new Set(current).add(meeting.id));
      setMeetingClock(Date.now());
      void refetchUpcomingMeetings();
    };
    socket.on("message.created", onMessage);
    socket.on("conversation.updated", onUpdated);
    socket.on("message.status.updated", onStatusUpdated);
    socket.on("meeting.created", onMeetingCreated);
    socket.on("meeting.ended", onMeetingInactive);
    socket.on("meeting.cancelled", onMeetingInactive);
    return () => {
      socket.off("message.created", onMessage);
      socket.off("conversation.updated", onUpdated);
      socket.off("message.status.updated", onStatusUpdated);
      socket.off("meeting.created", onMeetingCreated);
      socket.off("meeting.ended", onMeetingInactive);
      socket.off("meeting.cancelled", onMeetingInactive);
    };
  }, [conversationId, refetchUpcomingMeetings, socket, userId]);

  useEffect(() => () => {
    activeConversationIdRef.current = "";
    for (const controller of activeUploadControllersRef.current.values()) controller.abort();
    activeUploadControllersRef.current.clear();
  }, []);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (emojiMenuRef.current && !emojiMenuRef.current.contains(event.target as Node)) {
        setEmojiPickerOpen(false);
      }
      if (attachmentMenuRef.current && !attachmentMenuRef.current.contains(event.target as Node)) {
        setAttachmentMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = "auto";
    const contentHeight = textarea.scrollHeight;
    textarea.style.height = `${Math.min(Math.max(contentHeight, CHAT_COMPOSER_MIN_HEIGHT_PX), CHAT_COMPOSER_MAX_HEIGHT_PX)}px`;
    textarea.style.overflowY = contentHeight > CHAT_COMPOSER_MAX_HEIGHT_PX ? "auto" : "hidden";
  }, [body]);

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

  type SignedUpload = { signedUrl: string; publicUrl: string; objectName: string };

  const requestSignedUpload = async (file: File, folder: string, signal: AbortSignal) => {
    signal.throwIfAborted();
    const request = generateSignedUrl({
      generateUploadUrlDto: {
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        folder,
      },
    });
    const abortRequest = () => request.abort();
    signal.addEventListener("abort", abortRequest, { once: true });

    try {
      signal.throwIfAborted();
      return (await request.unwrap()) as SignedUpload;
    } finally {
      signal.removeEventListener("abort", abortRequest);
    }
  };

  const uploadAttachment = async (pending: PendingAttachment, signal: AbortSignal): Promise<AttachmentDto> => {
    if (pending.result) return pending.result;

    const isImage = pending.file.type.startsWith("image/");
    const useOriginalAsThumbnail = isImage && pending.file.size <= CHAT_SMALL_IMAGE_SIZE_BYTES;
    let thumbnailFile: File | null = null;

    if (isImage && !useOriginalAsThumbnail) {
      thumbnailFile = await createThumbnailFile(pending.file, 800, 0.8, signal);
    }

    signal.throwIfAborted();
    const originalSignedPromise = requestSignedUpload(pending.file, "chat-attachments", signal);
    const thumbnailSignedPromise = thumbnailFile
      ? requestSignedUpload(thumbnailFile, "chat-attachments/thumbnails", signal).catch((error) => {
          signal.throwIfAborted();
          console.warn("Could not prepare the optional image thumbnail upload.", error);
          return null;
        })
      : Promise.resolve(null);
    const [originalSigned, thumbnailSigned] = await Promise.all([
      originalSignedPromise,
      thumbnailSignedPromise,
    ]);

    const originalUpload = fetch(originalSigned.signedUrl, {
      method: "PUT",
      headers: { "Content-Type": pending.file.type || "application/octet-stream" },
      body: pending.file,
      signal,
    });
    const thumbnailUpload = thumbnailFile && thumbnailSigned
      ? fetch(thumbnailSigned.signedUrl, {
          method: "PUT",
          headers: { "Content-Type": thumbnailFile.type },
          body: thumbnailFile,
          signal,
        }).catch((error) => {
          signal.throwIfAborted();
          console.warn("Could not upload the optional image thumbnail.", error);
          return null;
        })
      : Promise.resolve(null);
    const [originalResponse, thumbnailResponse] = await Promise.all([
      originalUpload,
      thumbnailUpload,
    ]);

    if (!originalResponse.ok) {
      throw new Error(`Upload failed (HTTP ${originalResponse.status})`);
    }

    return {
      url: originalSigned.publicUrl,
      publicId: originalSigned.objectName,
      name: pending.file.name,
      mimeType: pending.file.type || "application/octet-stream",
      type: resolveAttachmentType(pending.file),
      size: pending.file.size,
      thumbnailUrl: useOriginalAsThumbnail
        ? originalSigned.publicUrl
        : thumbnailResponse?.ok && thumbnailSigned
          ? thumbnailSigned.publicUrl
          : undefined,
    };
  };

  const openAttachmentPicker = (kind: AttachmentPickerKind) => {
    setAttachmentPickerKind(kind);
    setAttachmentMenuOpen(false);
    window.requestAnimationFrame(() => fileInputRef.current?.click());
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    setSendError(null);

    for (const file of files) {
      const matchesSelectedType =
        (attachmentPickerKind === "IMAGE" && file.type.startsWith("image/")) ||
        (attachmentPickerKind === "VIDEO" && file.type.startsWith("video/")) ||
        (attachmentPickerKind === "DOCUMENT" && !file.type.startsWith("image/") && !file.type.startsWith("video/"));
      if (!matchesSelectedType) {
        setSendError(`Please choose a ${attachmentPickerKind.toLowerCase()} file.`);
        continue;
      }
      if (file.type.startsWith("video/") && file.size > CHAT_VIDEO_UPLOAD_MAX_SIZE_BYTES) {
        setSendError("Video must be under 100 MB.");
        continue;
      }

      const pending: PendingAttachment = {
        localId: crypto.randomUUID(),
        file,
        preview: URL.createObjectURL(file),
        error: null,
        result: null,
      };
      setPendingAttachments((current) => [...current, pending]);
    }
  };

  const removePending = (localId: string) => {
    setPendingAttachments((prev) => {
      const item = prev.find((p) => p.localId === localId);
      if (item?.preview) URL.revokeObjectURL(item.preview);
      return prev.filter((p) => p.localId !== localId);
    });
  };

  const handleSend = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = body.trim();
    const selectedAttachments = pendingAttachments;
    if ((!trimmed && selectedAttachments.length === 0) || !token) {
      return;
    }

    const optimisticId = `optimistic-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const optimisticAttachments: MessageAttachment[] = selectedAttachments.map((attachment) => ({
      url: attachment.preview ?? attachment.result?.url ?? "",
      publicId: attachment.result?.publicId ?? attachment.localId,
      name: attachment.file.name,
      mimeType: attachment.file.type || "application/octet-stream",
      type: resolveAttachmentType(attachment.file),
      size: attachment.file.size,
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

    const requestedConversationId = conversationId;
    const uploadController = new AbortController();
    const uploadedById = new Map<string, AttachmentDto>();
    for (const attachment of selectedAttachments) {
      if (attachment.result) uploadedById.set(attachment.localId, attachment.result);
    }
    let uploadPhase = selectedAttachments.some((attachment) => !attachment.result);
    let failedAttachmentId: string | null = null;
    let uploadTimedOut = false;
    const uploadTimeoutMs = selectedAttachments.some((attachment) => attachment.file.type.startsWith("video/"))
      ? CHAT_VIDEO_UPLOAD_TIMEOUT_MS
      : CHAT_ATTACHMENT_UPLOAD_TIMEOUT_MS;
    const uploadTimeout = uploadPhase
      ? window.setTimeout(() => {
          uploadTimedOut = true;
          uploadController.abort(new DOMException("Upload timed out", "TimeoutError"));
        }, uploadTimeoutMs)
      : null;

    activeUploadControllersRef.current.set(optimisticId, uploadController);
    setSendError(null);
    setOptimisticMessages((current) => [...current, optimisticMessage]);
    setBody("");
    setPendingAttachments([]);
    window.requestAnimationFrame(() => {
      textareaRef.current?.focus();
      virtuosoRef.current?.scrollToIndex({ index: "LAST", align: "end", behavior: "smooth" });
    });

    try {
      await Promise.all(
        selectedAttachments.map(async (attachment) => {
          if (attachment.result) return;
          try {
            const result = await uploadAttachment(attachment, uploadController.signal);
            uploadedById.set(attachment.localId, result);
          } catch (error) {
            failedAttachmentId ??= attachment.localId;
            throw error;
          }
        }),
      );
      uploadPhase = false;
      if (uploadTimeout !== null) window.clearTimeout(uploadTimeout);

      const readyAttachments = selectedAttachments.map((attachment) => {
        const result = uploadedById.get(attachment.localId);
        if (!result) throw new Error(`Could not upload ${attachment.file.name}`);
        return result;
      });
      const sentMessage = (await sendMessage({
        id: requestedConversationId,
        sendMessageDto: {
          ...(trimmed ? { body: trimmed } : {}),
          ...(readyAttachments.length > 0 ? { attachments: readyAttachments } : {}),
        },
      }).unwrap()) as ChatMessage;

      if (activeConversationIdRef.current === requestedConversationId) {
        setMessages((current) => mergeUniqueMessages(current, [sentMessage]));
        setOptimisticMessages((current) => current.filter((message) => message.id !== optimisticId));
        setPatches((current) => ({
          ...current,
          lastMessageText: sentMessage.body,
          lastMessageAt: sentMessage.createdAt,
        }));
      }
      window.setTimeout(() => {
        for (const attachment of selectedAttachments) {
          if (attachment.preview) URL.revokeObjectURL(attachment.preview);
        }
      }, 0);
    } catch {
      if (!uploadController.signal.aborted) uploadController.abort();

      if (activeConversationIdRef.current === requestedConversationId) {
        const errorMessage = uploadPhase
          ? uploadTimedOut
            ? "Upload timed out. Check your connection and send again."
            : "Attachment upload failed. Send again to retry."
          : "Failed to send. Please try again.";
        setOptimisticMessages((current) => current.filter((message) => message.id !== optimisticId));
        setBody((current) => current || trimmed);
        setPendingAttachments((current) => {
          const restored = selectedAttachments.map((attachment) => ({
            ...attachment,
            result: uploadedById.get(attachment.localId) ?? attachment.result,
            error:
              uploadPhase && (!failedAttachmentId || failedAttachmentId === attachment.localId)
                ? errorMessage
                : null,
          }));
          const restoredIds = new Set(restored.map((attachment) => attachment.localId));
          return [...restored, ...current.filter((attachment) => !restoredIds.has(attachment.localId))];
        });
        setSendError(errorMessage);
      } else {
        for (const attachment of selectedAttachments) {
          if (attachment.preview) URL.revokeObjectURL(attachment.preview);
        }
      }
    } finally {
      if (uploadTimeout !== null) window.clearTimeout(uploadTimeout);
      if (activeUploadControllersRef.current.get(optimisticId) === uploadController) {
        activeUploadControllersRef.current.delete(optimisticId);
      }
    }
  };

  const handleStartMeeting = async () => {
    try {
      const meeting = (await createInstantMeeting({
        instantMeetingDto: { conversationId },
      }).unwrap()) as Meeting;
      refetchUpcomingMeetings();
      window.open(meeting.startUrl ?? meeting.joinUrl, "_blank");
    } catch {
      toast.error("Failed to start the call. Please try again.");
    }
  };

  const handleCancelMeeting = async () => {
    if (!upcomingMeeting || !canCancelUpcomingMeeting) return;

    const meetingId = upcomingMeeting.id;
    try {
      await cancelMeeting({ id: meetingId }).unwrap();
      setInactiveMeetingIds((current) => new Set(current).add(meetingId));
      setMeetingClock(Date.now());
      await refetchUpcomingMeetings();
      toast.success("Meeting cancelled");
    } catch {
      toast.error("Failed to cancel the meeting. Please try again.");
    }
  };

  const canSend = body.trim().length > 0 || pendingAttachments.length > 0;

  const showInitialLoading =
    (!conversation && convLoading) || (loadedMessagesConversationId !== conversationId && !messagesQueryFailed);

  if (showInitialLoading) {
    return (
      <div className="h-full min-h-0 bg-(--color-surface)">
        <AppLoader label="Loading conversation..." className="h-full min-h-0" />
      </div>
    );
  }

  if (queryError && !conversation) {
    return (
      <div className="flex h-full min-h-0 flex-col items-center justify-center gap-4 bg-(--color-surface) px-6 text-center">
        <p className="text-sm text-(--color-text-secondary)">{queryError}</p>
        <button type="button" onClick={() => {
            startRouteLoading("/dashboard/messages");
            router.push("/dashboard/messages");
          }} className="ui-primary-button">
          Back to Messages
        </button>
      </div>
    );
  }

  const otherName = conversation?.otherUserName ?? "Conversation";
  const otherAvatarUrl = conversation?.otherUserAvatarUrl ?? null;

  return (
    <section className="grid h-full min-h-0 min-w-0 grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden bg-(--color-surface)">
      <div>
        <header className="flex min-w-0 items-center gap-2 border-b border-(--color-border) px-3 py-3 sm:gap-3 sm:px-5">
          <Link href="/dashboard/messages" className="ui-icon-button lg:hidden" aria-label="Back to conversations">
            <ArrowLeft className="h-4 w-4" />
          </Link>

          <div className="relative shrink-0">
            <Avatar name={otherName} url={otherAvatarUrl} size={40} />
            <span
              className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-(--color-surface) ${
                conversation?.otherUserOnline ? "bg-(--color-success)" : "bg-(--color-text-muted)"
              }`}
              aria-label={conversation?.otherUserOnline ? "Online" : "Offline"}
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-sm font-bold text-(--color-text-main) sm:text-base">{otherName}</h1>
              {conversation?.status === "ARCHIVED" ? (
                <span className="shrink-0 rounded-[var(--radius-sm)] border border-(--color-border) px-2 py-0.5 text-[10px] font-semibold text-(--color-text-muted)">
                  Archived
                </span>
              ) : null}
            </div>
            <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-(--color-text-muted)">
              <span className={conversation?.otherUserOnline ? "text-(--color-success)" : ""}>
                {conversation?.otherUserOnline ? "Active now" : "Offline"}
              </span>
              <span aria-hidden="true" className="h-1 w-1 shrink-0 rounded-full bg-(--color-text-muted)" />
              <span className="hidden font-medium text-(--color-brand) sm:inline">
                {conversation?.type === "CONTRACT" ? "Contract" : "Pre-hire"}
              </span>
              <span aria-hidden="true" className="hidden h-1 w-1 shrink-0 rounded-full bg-(--color-text-muted) sm:inline-block" />
              <span className="truncate">{conversation?.taskTitle}</span>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            {conversation?.status !== "ARCHIVED" ? (
              <>
                <button
                  type="button"
                  onClick={() => setScheduleModalOpen(true)}
                  className="ui-icon-button"
                  aria-label="Schedule a meeting"
                  title="Schedule a meeting"
                >
                  <CalendarPlus className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={handleStartMeeting}
                  disabled={startingMeeting}
                  className="ui-primary-button h-9 min-w-9 px-2.5 sm:px-3"
                  aria-label="Start video call"
                  title="Start video call"
                >
                  {startingMeeting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Video className="h-4 w-4" />
                  )}
                  <span className="hidden xl:inline">Start call</span>
                </button>
              </>
            ) : null}

            {conversation?.otherUserRole === "FREELANCER" && conversation?.otherUserId ? (
              <Link
                href={`/dashboard/profile/${conversation.otherUserId}`}
                className="ui-icon-button hidden sm:inline-flex"
                aria-label="View profile"
                title="View profile"
              >
                <UserCircle className="h-4 w-4" />
              </Link>
            ) : null}
          </div>
        </header>

        {upcomingMeeting ? (
          <div className="flex items-center justify-between gap-3 border-b border-(--color-border) bg-(--color-brand-soft) px-3 py-2 text-xs sm:px-5">
            <span className="flex min-w-0 items-center gap-2 font-medium text-(--color-text-main)">
              <Video className="h-3.5 w-3.5 shrink-0 text-(--color-brand)" />
              <span className="truncate">
                {upcomingMeeting.topic || "Upcoming meeting"} - {new Date(upcomingMeeting.startTimeUtc).toLocaleString()}
              </span>
            </span>
            <div className="flex shrink-0 items-center gap-2">
              {canCancelUpcomingMeeting ? (
                <button
                  type="button"
                  onClick={handleCancelMeeting}
                  disabled={cancellingMeeting}
                  className="inline-flex h-8 items-center justify-center gap-1.5 rounded-[var(--radius-sm)] border border-[color-mix(in_srgb,var(--color-danger)_28%,var(--color-border))] bg-(--color-surface) px-3 text-xs font-semibold text-(--color-danger) transition-colors hover:bg-[color-mix(in_srgb,var(--color-danger)_6%,var(--color-surface))] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {cancellingMeeting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                  Cancel
                </button>
              ) : null}
              <a
                href={upcomingMeeting.startUrl ?? upcomingMeeting.joinUrl}
                target="_blank"
                rel="noreferrer"
                className="ui-primary-button h-8 shrink-0 px-3 text-xs"
              >
                Join
              </a>
            </div>
          </div>
        ) : null}
      </div>

      <Virtuoso
        ref={virtuosoRef}
        key={conversationId}
        data={visibleMessages}
        context={messageListContext}
        components={MESSAGE_LIST_COMPONENTS}
        className="ui-scrollbar min-h-0 bg-(--color-bg)"
        style={{ height: "100%", overflowAnchor: "none", overscrollBehavior: "contain" }}
        alignToBottom
        firstItemIndex={firstItemIndex}
        defaultItemHeight={MESSAGE_ROW_ESTIMATED_HEIGHT_PX}
        initialTopMostItemIndex={{ index: "LAST", align: "end" }}
        followOutput={followNewMessages}
        atBottomStateChange={setIsAtBottom}
        atBottomThreshold={32}
        increaseViewportBy={{ top: MESSAGE_OVERSCAN_PX, bottom: MESSAGE_OVERSCAN_PX }}
        minOverscanItemCount={{ top: MESSAGE_OVERSCAN_ITEMS, bottom: MESSAGE_OVERSCAN_ITEMS }}
        startReached={loadOlderMessages}
        computeItemKey={(_, message) => message.id}
        itemContent={(index, message) => {
          const itemIndex = index - firstItemIndex;
          return (
            <div className="px-3 sm:px-5">
              {renderMessageItemRow(message, {
                previousMessage: visibleMessages[itemIndex - 1],
                userId,
                myAvatarUrl,
                otherAvatarUrl,
                openMediaPreview,
                isLatestOutgoingMessage: message.id === latestOutgoingMessageId,
              })}
            </div>
          );
        }}
      />

      <form onSubmit={handleSend} className="border-t border-(--color-border) bg-(--color-surface) p-3 sm:p-4">
        {pendingAttachments.length > 0 ? (
          <div className="ui-scrollbar mb-3 flex max-h-40 gap-3 overflow-x-auto overflow-y-hidden pb-1">
            {pendingAttachments.map((pending) => (
              <PendingAttachmentPreview
                key={pending.localId}
                file={pending.file}
                preview={pending.preview}
                error={pending.error}
                onRemove={() => removePending(pending.localId)}
                onOpenMedia={() => {
                  if (!pending.preview) return;
                  const type = resolveAttachmentType(pending.file);
                  if (type === "IMAGE" || type === "VIDEO") {
                    openMediaPreview({ url: pending.preview, type, name: pending.file.name });
                  }
                }}
              />
            ))}
          </div>
        ) : null}
        {sendError ? <p className="mb-2 text-xs text-(--color-danger)">{sendError}</p> : null}

        <div className="ui-input-shell chat-composer flex min-w-0 items-end gap-1 p-1.5">
          <div className="relative shrink-0" ref={attachmentMenuRef}>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={ATTACHMENT_ACCEPT[attachmentPickerKind]}
              className="hidden"
              onChange={handleFileChange}
            />
            <button
              type="button"
              onClick={() => setAttachmentMenuOpen((open) => !open)}
              aria-label="Attach media or document"
              title="Attach media or document"
              aria-expanded={attachmentMenuOpen}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-(--color-text-muted) transition hover:bg-(--color-hover) hover:text-(--color-text-main)"
            >
              <Paperclip className="h-4 w-4" />
            </button>
            <AttachmentPickerMenu open={attachmentMenuOpen} onSelect={openAttachmentPicker} />
          </div>
          <div className="relative shrink-0" ref={emojiMenuRef}>
            <button
              type="button"
              aria-label="Choose emoji"
              title="Choose emoji"
              aria-expanded={emojiPickerOpen}
              onClick={() => setEmojiPickerOpen((open) => !open)}
              className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-sm)] text-(--color-text-muted) transition hover:bg-(--color-hover) hover:text-(--color-text-main)"
            >
              <Smile className="h-4 w-4" />
            </button>
            <EmojiPicker open={emojiPickerOpen} onSelect={insertEmoji} onClose={() => setEmojiPickerOpen(false)} />
          </div>

          <textarea
            ref={textareaRef}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                if (canSend) handleSend(event as unknown as React.FormEvent);
              }
            }}
            rows={1}
            placeholder="Write a message..."
            className="ui-scrollbar min-h-10 min-w-0 flex-1 resize-none bg-transparent px-2 py-2.5 text-sm leading-5 text-(--color-text-main) outline-none placeholder:text-(--color-text-muted)"
            style={{ maxHeight: CHAT_COMPOSER_MAX_HEIGHT_PX }}
          />

          <button
            type="submit"
            disabled={!canSend}
            aria-label="Send message"
            className="ui-primary-button h-10 min-w-10 shrink-0 px-3 disabled:cursor-not-allowed disabled:opacity-40 sm:min-w-[86px]"
          >
            <Send className="h-4 w-4" />
            <span className="hidden sm:inline">Send</span>
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

      <ScheduleMeetingModal
        open={scheduleModalOpen}
        conversationId={conversationId}
        onClose={() => setScheduleModalOpen(false)}
        onScheduled={() => {
          refetchUpcomingMeetings();
          toast.success("Meeting scheduled");
        }}
      />
    </section>
  );
}
