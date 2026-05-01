"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppSelector } from "@/lib/hooks";
import { useChatSocket } from "@/components/chat-socket-provider";
import ChatMessageTimestamp from "@/components/chat-message-timestamp";
import type { ChatMessage, ConversationSummary } from "@/lib/types/chat";
import {
  useConversationsControllerGetConversationQuery,
  useConversationsControllerGetMessagesQuery,
  useConversationsControllerSendMessageMutation,
} from "@/lib/api";

const mergeUniqueMessages = (current: ChatMessage[], incoming: ChatMessage[]) => {
  const byId = new Map<string, ChatMessage>();

  for (const message of current) {
    byId.set(message.id, message);
  }

  for (const message of incoming) {
    byId.set(message.id, message);
  }

  return Array.from(byId.values()).sort((a, b) => {
    const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return aTime - bTime;
  });
};

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
    if (!token || !conversationId) {
      return;
    }

    joinConversation(conversationId);
    return () => {
      leaveConversation(conversationId);
    };
  }, [conversationId, joinConversation, leaveConversation, token]);

  useEffect(() => {
    if (!socket) {
      return;
    }

    const handleMessageCreated = (payload: ChatMessage) => {
      if (payload.conversationId !== conversationId) {
        return;
      }
      setMessages((current) => {
        if (current.some((message) => message.id === payload.id)) {
          return current;
        }
        return mergeUniqueMessages(current, [payload]);
      });
      setConversationPatches((prev) => ({
        ...prev,
        lastMessageText: payload.body,
        lastMessageAt: payload.createdAt,
      }));
    };

    const handleConversationUpdated = (payload: Partial<ConversationSummary> & { conversationId: string }) => {
      if (payload.conversationId !== conversationId) {
        return;
      }
      setConversationPatches((prev) => ({ ...prev, ...payload }));
    };

    socket.on("message.created", handleMessageCreated);
    socket.on("conversation.updated", handleConversationUpdated);

    return () => {
      socket.off("message.created", handleMessageCreated);
      socket.off("conversation.updated", handleConversationUpdated);
    };
  }, [conversationId, socket]);

  const handleSend = async (event: FormEvent) => {
    event.preventDefault();
    if (!body.trim() || !token) {
      return;
    }

    try {
      setSendError(null);
      await sendMessage({
        id: conversationId,
        sendMessageDto: { body: body.trim() },
      }).unwrap();
      setBody("");
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "Failed to send message");
    }
  };

  const loading = isConversationLoading || isMessagesLoading;

  if (loading) {
    return (
      <div className="rounded-3xl border border-[color-mix(in_srgb,var(--color-border)_90%,transparent)] bg-[color-mix(in_srgb,var(--color-surface)_92%,transparent)] p-5 shadow-[0_20px_44px_-34px_rgba(15,23,42,0.35)]">
        <p className="text-sm text-(--color-text-muted)">Loading conversation...</p>
      </div>
    );
  }

  if (error && !conversation) {
    return (
      <div className="rounded-3xl border border-dashed border-[color-mix(in_srgb,var(--color-border)_90%,transparent)] bg-[color-mix(in_srgb,var(--color-surface)_85%,transparent)] p-6 text-center shadow-[0_20px_44px_-34px_rgba(15,23,42,0.35)]">
        <h2 className="text-xl font-bold tracking-tight text-(--color-text-main)">Conversation not available</h2>
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
    <section className="grid min-h-[70vh] grid-rows-[auto_1fr_auto] rounded-3xl border border-[color-mix(in_srgb,var(--color-border)_90%,transparent)] bg-[color-mix(in_srgb,var(--color-surface)_92%,transparent)] shadow-[0_20px_44px_-34px_rgba(15,23,42,0.35)]">
      <header className="border-b border-[color-mix(in_srgb,var(--color-border)_85%,transparent)] p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-(--color-text-muted)">
              {conversation?.type === "CONTRACT" ? "Contract Chat" : "Pre-hire Chat"}
            </p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-(--color-text-main)">
              {conversation?.otherUserName ?? "Conversation"}
            </h1>
            <p className="mt-1 text-sm text-(--color-text-muted)">{conversation?.taskTitle}</p>
          </div>
          {conversation?.status === "ARCHIVED" ? (
            <span className="rounded-full border border-(--color-border) px-3 py-1 text-xs font-semibold text-(--color-text-muted)">
              Archived
            </span>
          ) : null}
        </div>
      </header>

      <div className="max-h-[56vh] overflow-y-auto p-5">
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
                <p className="whitespace-pre-wrap text-sm leading-6 text-(--color-text-main)">{message.body}</p>
                {isSystem ? (
                  <div className="mt-2 text-center text-[11px] text-(--color-text-muted)">
                    <ChatMessageTimestamp value={message.createdAt} />
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      </div>

      <form onSubmit={handleSend} className="border-t border-[color-mix(in_srgb,var(--color-border)_85%,transparent)] p-4">
        <div className="flex gap-3">
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={2}
            placeholder="Write a message..."
            className="min-h-14 flex-1 resize-none rounded-2xl border border-(--color-border) bg-[color-mix(in_srgb,var(--color-surface)_95%,transparent)] px-4 py-3 text-sm text-(--color-text-main) outline-none placeholder:text-(--color-text-muted) focus:border-[color-mix(in_srgb,var(--color-brand)_35%,var(--color-border))]"
          />
          <button
            type="submit"
            disabled={sending || !body.trim()}
            className="inline-flex items-center justify-center rounded-full border border-transparent bg-[linear-gradient(135deg,var(--color-brand),var(--color-brand-strong))] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            Send
          </button>
        </div>
      </form>
    </section>
  );
}
