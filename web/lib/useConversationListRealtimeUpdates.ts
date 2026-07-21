"use client";

import { useEffect } from "react";
import { useChatSocket } from "@/components/chat-socket-provider";
import { emptySplitApi } from "@/lib/api/emptyApi";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import type { ConversationSummary } from "@/lib/types/chat";

function toTime(value: string | null | undefined) {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

export function useConversationListRealtimeUpdates() {
  const dispatch = useAppDispatch();
  const { socket } = useChatSocket();
  const { token, role } = useAppSelector((state) => state.auth);
  const updateQueryData = emptySplitApi.util.updateQueryData as (
    endpointName: string,
    arg: void,
    updateRecipe: (draft: ConversationSummary[]) => void,
  ) => ReturnType<typeof emptySplitApi.util.updateQueryData>;

  useEffect(() => {
    if (!socket || !token || (role !== "HIRER" && role !== "FREELANCER")) {
      return;
    }

    const onConversationUpdated = (update: Partial<ConversationSummary> & { conversationId: string }) => {
      if (!update.conversationId) return;

      dispatch(
        updateQueryData("conversationsControllerGetMyConversations", undefined, (draft) => {
          const conversation = draft.find((item) => item.conversationId === update.conversationId);
          if (!conversation) return;

          Object.assign(conversation, update);
          draft.sort((left, right) => {
            const rightTime = toTime(right.lastMessageAt ?? right.updatedAt);
            const leftTime = toTime(left.lastMessageAt ?? left.updatedAt);
            return rightTime - leftTime;
          });
        }),
      );
    };

    const onMessageCreated = (message: { conversationId: string; body?: string; createdAt?: string; recipientId?: string }) => {
      if (!message.conversationId) return;

      dispatch(
        updateQueryData("conversationsControllerGetMyConversations", undefined, (draft) => {
          const conversation = draft.find((item) => item.conversationId === message.conversationId);
          if (!conversation) return;

          if (message.body) {
            conversation.lastMessageText = message.body;
          }
          if (message.createdAt) {
            conversation.lastMessageAt = message.createdAt;
          }
        }),
      );
    };

    const onConversationRead = (payload: { conversationId: string }) => {
      if (!payload.conversationId) return;

      dispatch(
        updateQueryData("conversationsControllerGetMyConversations", undefined, (draft) => {
          const conversation = draft.find((item) => item.conversationId === payload.conversationId);
          if (!conversation) return;

          conversation.unreadCount = 0;
        }),
      );
    };

    const onPresenceUpdated = (payload: { userId: string; online: boolean }) => {
      if (!payload.userId) return;

      dispatch(
        updateQueryData("conversationsControllerGetMyConversations", undefined, (draft) => {
          const conversation = draft.find((item) => item.otherUserId === payload.userId);
          if (!conversation) return;

          conversation.otherUserOnline = payload.online;
        }),
      );
    };

    socket.on("conversation.updated", onConversationUpdated);
    socket.on("message.created", onMessageCreated);
    socket.on("conversation.read", onConversationRead);
    socket.on("presence.updated", onPresenceUpdated);
    return () => {
      socket.off("conversation.updated", onConversationUpdated);
      socket.off("message.created", onMessageCreated);
      socket.off("conversation.read", onConversationRead);
      socket.off("presence.updated", onPresenceUpdated);
    };
  }, [dispatch, role, socket, token, updateQueryData]);
}