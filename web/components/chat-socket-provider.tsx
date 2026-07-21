"use client";

import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useAppSelector } from "@/lib/hooks";

type ChatSocketContextValue = {
  socket: Socket | null;
  connected: boolean;
  joinConversation: (conversationId: string) => void;
  leaveConversation: (conversationId: string) => void;
  emitConversationRead: (conversationId: string, lastReadMessageId?: string) => void;
  emitPresenceHeartbeat: () => void;
};

const ChatSocketContext = createContext<ChatSocketContextValue | null>(null);

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export default function ChatSocketProvider({ children }: PropsWithChildren) {
  const { token, hydrated, userId } = useAppSelector((state) => state.auth);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!hydrated || !token || !userId) {
      return;
    }

    const nextSocket = io(SOCKET_URL, {
      transports: ["websocket"],
      autoConnect: true,
      auth: {
        token,
      },
    });

    nextSocket.on("connect", () => setConnected(true));
    nextSocket.on("disconnect", () => setConnected(false));
    nextSocket.on("connect_error", (err) => {
      setConnected(false);
      // Stop retrying if the token is expired/invalid — avoids spamming the server
      if (err.message.includes("Unauthorized") || err.message.includes("expired") || err.message.includes("token")) {
        nextSocket.disconnect();
      }
    });

    const deliveredMessageIds = new Set<string>();
    const onMessageCreated = (message: {
      id?: string;
      conversationId?: string;
      senderId?: string;
      recipientId?: string;
    }) => {
      if (
        !message.id ||
        !message.conversationId ||
        !message.senderId ||
        message.senderId === userId ||
        (message.recipientId && message.recipientId !== userId) ||
        deliveredMessageIds.has(message.id)
      ) {
        return;
      }

      deliveredMessageIds.add(message.id);
      if (deliveredMessageIds.size > 500) {
        const oldestMessageId = deliveredMessageIds.values().next().value;
        if (oldestMessageId) deliveredMessageIds.delete(oldestMessageId);
      }

      nextSocket.emit("message.delivered", {
        conversationId: message.conversationId,
        messageId: message.id,
      });
    };

    nextSocket.on("message.created", onMessageCreated);

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSocket(nextSocket);

    const heartbeat = window.setInterval(() => {
      nextSocket.emit("presence.heartbeat");
    }, 25_000);

    return () => {
      window.clearInterval(heartbeat);
      nextSocket.removeAllListeners();
      nextSocket.disconnect();
      setSocket(null);
      setConnected(false);
    };
  }, [hydrated, token, userId]);

  // Attempt to reconnect when the page becomes visible or network comes back
  useEffect(() => {
    const tryReconnect = () => {
      if (!token || !userId) return;
      if (socket && !connected) {
        try {
          socket.connect();
        } catch {
          // ignore
        }
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") tryReconnect();
    };

    const onOnline = () => tryReconnect();

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("online", onOnline);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("online", onOnline);
    };
  }, [socket, connected, token, userId]);

  const value = useMemo<ChatSocketContextValue>(
    () => ({
      socket,
      connected,
      joinConversation: (conversationId: string) => {
        socket?.emit("conversation.join", conversationId);
      },
      leaveConversation: (conversationId: string) => {
        socket?.emit("conversation.leave", conversationId);
      },
      emitConversationRead: (conversationId: string, lastReadMessageId?: string) => {
        socket?.emit("conversation.read", { conversationId, lastReadMessageId });
      },
      emitPresenceHeartbeat: () => {
        socket?.emit("presence.heartbeat");
      },
    }),
    [connected, socket],
  );

  return <ChatSocketContext.Provider value={value}>{children}</ChatSocketContext.Provider>;
}

export function useChatSocket() {
  const context = useContext(ChatSocketContext);
  if (!context) {
    throw new Error("useChatSocket must be used within ChatSocketProvider");
  }
  return context;
}
