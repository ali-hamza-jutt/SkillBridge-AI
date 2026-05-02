"use client";

import { useMemo, useSyncExternalStore } from "react";
import { useAppSelector } from "@/lib/hooks";
import { useConversationsControllerGetMyConversationsQuery } from "@/lib/api";
import type { ConversationSummary } from "@/lib/types/chat";

const STORAGE_KEY = "messages_last_read";

function getLastReadMap(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

let readVersion = 0;
const readListeners = new Set<() => void>();

function subscribeToReadMap(callback: () => void) {
  readListeners.add(callback);
  return () => {
    readListeners.delete(callback);
  };
}

function getReadVersion() {
  return readVersion;
}

export function markConversationRead(conversationId: string) {
  if (typeof window === "undefined") return;
  const map = getLastReadMap();
  map[conversationId] = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  readVersion++;
  readListeners.forEach((fn) => fn());
}

export function useUnreadConversationCount(): number {
  const { token, role } = useAppSelector((state) => state.auth);
  const skip = !token || (role !== "HIRER" && role !== "FREELANCER");

  const { data } = useConversationsControllerGetMyConversationsQuery(undefined, {
    skip,
    pollingInterval: 30_000,
  });

  const version = useSyncExternalStore(subscribeToReadMap, getReadVersion, getReadVersion);

  return useMemo(() => {
    void version;
    const conversations = (data as ConversationSummary[] | undefined) ?? [];
    if (!conversations.length) return 0;
    const lastReadMap = getLastReadMap();
    return conversations.filter((conv) => {
      if (!conv.lastMessageAt) return false;
      const lastRead = lastReadMap[conv.conversationId];
      if (!lastRead) return true;
      return new Date(conv.lastMessageAt) > new Date(lastRead);
    }).length;
  }, [data, version]);
}
