"use client";

import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useAppSelector } from "@/lib/hooks";

type ChatSocketContextValue = {
  socket: Socket | null;
  connected: boolean;
  joinConversation: (conversationId: string) => void;
  leaveConversation: (conversationId: string) => void;
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

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSocket(nextSocket);

    return () => {
      nextSocket.removeAllListeners();
      nextSocket.disconnect();
      setSocket(null);
      setConnected(false);
    };
  }, [hydrated, token, userId]);

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
