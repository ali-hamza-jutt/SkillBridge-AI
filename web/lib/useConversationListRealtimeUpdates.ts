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
  ) => any;

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

    socket.on("conversation.updated", onConversationUpdated);
    return () => {
      socket.off("conversation.updated", onConversationUpdated);
    };
  }, [dispatch, role, socket, token, updateQueryData]);
}