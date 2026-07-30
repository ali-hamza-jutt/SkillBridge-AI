"use client";

import Image from "next/image";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, CalendarPlus, FileText, Loader2, Paperclip, RotateCcw, Send, Smile, UserCircle, Video, X } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Virtuoso, type Components } from "react-virtuoso";
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
import { renderMessageItemRow, type DisplayChatMessage } from "@/components/conversation-thread/render-message-item-row";
import { CHAT_MESSAGE_PAGE_SIZE, CHAT_VIDEO_UPLOAD_MAX_SIZE_BYTES } from "@/lib/constants/upload";
import {
  useConversationsControllerGetConversationQuery,
  useConversationsControllerGetMessagesQuery,
  useLazyConversationsControllerGetMessagesQuery,
  useConversationsControllerSendMessageMutation,
  useGcsControllerGenerateSignedUrlMutation,
  useMeetingsControllerCreateInstantMutation,
  useMeetingsControllerListUpcomingQuery,
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
  const [sendMessage, { isLoading: sending }] = useConversationsControllerSendMessageMutation();
  const [generateSignedUrl] = useGcsControllerGenerateSignedUrlMutation();
  const [createInstantMeeting, { isLoading: startingMeeting }] = useMeetingsControllerCreateInstantMutation();
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
  const [endedMeetingIds, setEndedMeetingIds] = useState<ReadonlySet<string>>(() => new Set());
  const upcomingMeeting = useMemo(
    () =>
      ((upcomingMeetingsData as Meeting[] | undefined) ?? []).find((meeting) => {
        const endTime = new Date(meeting.endTimeUtc).getTime();
        return (
          !endedMeetingIds.has(meeting.id) &&
          (meeting.status === "SCHEDULED" || meeting.status === "STARTED") &&
          Number.isFinite(endTime) &&
          endTime > meetingClock
        );
      }) ?? null,
    [endedMeetingIds, meetingClock, upcomingMeetingsData],
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
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const [mediaPreview, setMediaPreview] = useState<{ open: boolean; src: string; type: "IMAGE" | "VIDEO"; title?: string }>({
    open: false,
    src: "",
    type: "IMAGE",
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const emojiMenuRef = useRef<HTMLDivElement>(null);
  const isLoadingOlderRef = useRef(false);
  const hasLoadedOlderMessagesRef = useRef(false);
  const activeConversationIdRef = useRef(conversationId);
  const lastReadMessageIdRef = useRef<string | null>(null);
  activeConversationIdRef.current = conversationId;

  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);

  const visibleMessages = useMemo<DisplayChatMessage[]>(() => {
    const stillPending = optimisticMessages.filter((pendingMessage) => {
      return !messages.some((message) => messagesEquivalent(message, pendingMessage));
    });

    return mergeUniqueMessages(messages, stillPending) as DisplayChatMessage[];
  }, [messages, optimisticMessages]);

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
    setMessages([]);
    setOptimisticMessages([]);
    setPatches({});
    setMeetingClock(Date.now());
    setEndedMeetingIds(new Set());
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

    const endTime = new Date(upcomingMeeting.endTimeUtc).getTime();
    if (!Number.isFinite(endTime)) return;

    const remaining = Math.max(endTime - Date.now(), 0);
    const timeout = window.setTimeout(() => {
      setMeetingClock(Date.now());
      void refetchUpcomingMeetings();
    }, Math.min(remaining + 250, MAX_BROWSER_TIMEOUT_MS));

    return () => window.clearTimeout(timeout);
  }, [refetchUpcomingMeetings, upcomingMeeting]);


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
      setOptimisticMessages((current) => current.filter((pendingMessage) => !messagesEquivalent(p, pendingMessage)));
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
      setEndedMeetingIds((current) => {
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
    const onMeetingEnded = (meeting: Pick<Meeting, "id" | "conversationId">) => {
      if (meeting.conversationId !== conversationId) return;

      setEndedMeetingIds((current) => new Set(current).add(meeting.id));
      setMeetingClock(Date.now());
      void refetchUpcomingMeetings();
    };
    socket.on("message.created", onMessage);
    socket.on("conversation.updated", onUpdated);
    socket.on("message.status.updated", onStatusUpdated);
    socket.on("meeting.created", onMeetingCreated);
    socket.on("meeting.ended", onMeetingEnded);
    return () => {
      socket.off("message.created", onMessage);
      socket.off("conversation.updated", onUpdated);
      socket.off("message.status.updated", onStatusUpdated);
      socket.off("meeting.created", onMeetingCreated);
      socket.off("meeting.ended", onMeetingEnded);
    };
  }, [conversationId, refetchUpcomingMeetings, socket, userId]);

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

  const canSend = !sending && !pendingAttachments.some((p) => p.uploading)
    && (body.trim().length > 0 || pendingAttachments.some((p) => p.result !== null));

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
              <span aria-hidden="true">{"\u00B7"}</span>
              <span className="hidden font-medium text-(--color-brand) sm:inline">
                {conversation?.type === "CONTRACT" ? "Contract" : "Pre-hire"}
              </span>
              <span className="hidden sm:inline" aria-hidden="true">{"\u00B7"}</span>
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
                {upcomingMeeting.topic || "Upcoming meeting"} {"\u00B7"} {new Date(upcomingMeeting.startTimeUtc).toLocaleString()}
              </span>
            </span>
            <a
              href={upcomingMeeting.startUrl ?? upcomingMeeting.joinUrl}
              target="_blank"
              rel="noreferrer"
              className="ui-primary-button h-8 shrink-0 px-3 text-xs"
            >
              Join
            </a>
          </div>
        ) : null}
      </div>

      <Virtuoso
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
          <div className="ui-scrollbar mb-3 flex max-h-28 flex-wrap gap-2 overflow-y-auto">
            {pendingAttachments.map((pending) => (
              <div
                key={pending.localId}
                className={`relative flex items-center gap-2 rounded-[var(--radius-md)] border p-2 ${
                  pending.error
                    ? "border-[color-mix(in_srgb,var(--color-danger)_35%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-danger)_6%,var(--color-surface))]"
                    : "border-(--color-border) bg-(--color-surface-tint)"
                }`}
              >
                {pending.file.type.startsWith("image/") && pending.preview ? (
                  <Image
                    src={pending.preview}
                    alt={pending.file.name}
                    width={48}
                    height={48}
                    className="h-12 w-12 rounded-[var(--radius-sm)] object-cover"
                    unoptimized
                  />
                ) : pending.file.type.startsWith("video/") && pending.preview ? (
                  <video src={pending.preview} className="h-12 w-12 rounded-[var(--radius-sm)] object-cover" muted />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-[var(--radius-sm)] bg-(--color-hover)">
                    <FileText className="h-5 w-5 text-(--color-text-muted)" />
                  </div>
                )}

                <div className="flex min-w-0 flex-col gap-0.5 pr-5">
                  {pending.uploading ? (
                    <div className="flex items-center gap-1.5">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-(--color-brand)" />
                      <span className="text-[11px] text-(--color-text-muted)">Uploading...</span>
                    </div>
                  ) : pending.error ? (
                    <>
                      <span className="text-[11px] font-medium text-(--color-danger)">Upload failed</span>
                      <button
                        type="button"
                        onClick={() => {
                          setPendingAttachments((current) =>
                            current.map((item) =>
                              item.localId === pending.localId
                                ? { ...item, uploading: true, error: null }
                                : item,
                            ),
                          );
                          uploadFile({ ...pending, uploading: true, error: null });
                        }}
                        className="flex items-center gap-1 text-[11px] font-semibold text-(--color-brand) hover:underline"
                      >
                        <RotateCcw className="h-3 w-3" />
                        Retry
                      </button>
                    </>
                  ) : (
                    <span className="max-w-36 truncate text-[11px] text-(--color-text-secondary)">
                      {pending.file.name}
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => removePending(pending.localId)}
                  className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-[var(--radius-sm)] text-(--color-text-muted) transition hover:bg-(--color-hover) hover:text-(--color-text-main)"
                  aria-label="Remove attachment"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        ) : null}

        {sendError ? <p className="mb-2 text-xs text-(--color-danger)">{sendError}</p> : null}

        <div className="ui-input-shell flex min-w-0 items-end gap-1 p-1.5">
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
            title="Attach file"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-(--color-text-muted) transition hover:bg-(--color-hover) hover:text-(--color-text-main)"
          >
            <Paperclip className="h-4 w-4" />
          </button>

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
            className="min-h-10 min-w-0 flex-1 resize-none bg-transparent px-2 py-2.5 text-sm leading-5 text-(--color-text-main) outline-none placeholder:text-(--color-text-muted)"
            style={{ maxHeight: 160 }}
          />

          <button
            type="submit"
            disabled={!canSend}
            aria-label="Send message"
            className="ui-primary-button h-10 min-w-10 shrink-0 px-3 disabled:cursor-not-allowed disabled:opacity-40 sm:min-w-[86px]"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
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
