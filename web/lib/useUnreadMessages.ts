"use client";

import { useMemo } from "react";
import { useAppSelector } from "@/lib/hooks";
import { useConversationsControllerGetMyConversationsQuery } from "@/lib/api";
import type { ConversationSummary } from "@/lib/types/chat";

export function useUnreadConversationCount(): number {
  const { token, role } = useAppSelector((state) => state.auth);
  const skip = !token || (role !== "HIRER" && role !== "FREELANCER");

  const { data } = useConversationsControllerGetMyConversationsQuery(undefined, {
    skip,
    pollingInterval: 30_000,
  });

  return useMemo(() => {
    const conversations = (data as ConversationSummary[] | undefined) ?? [];
    if (!conversations.length) return 0;
    return conversations.reduce((total, conversation) => total + (conversation.unreadCount ?? 0), 0);
  }, [data]);
}
