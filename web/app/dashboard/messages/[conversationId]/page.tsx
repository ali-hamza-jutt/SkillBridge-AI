"use client";

import { useParams } from "next/navigation";
import ConversationThread from "@/components/conversation-thread";
import DashboardNavbar from "@/components/dashboard-navbar";
import MessagesSidebar from "@/components/messages-sidebar";
import RoleAccessNotice from "@/components/role-access-notice";
import { useConversationsControllerGetMyConversationsQuery } from "@/lib/api";
import { useAppSelector } from "@/lib/hooks";
import type { ConversationSummary } from "@/lib/types/chat";

function getConversationError(error: unknown) {
  if (!error || typeof error !== "object" || !("data" in error)) return null;
  return typeof (error as { data?: unknown }).data === "string"
    ? (error as { data: string }).data
    : "Failed to load conversations";
}

export default function ConversationPage() {
  const params = useParams<{ conversationId: string }>();
  const conversationId = Array.isArray(params.conversationId) ? params.conversationId[0] : params.conversationId;
  const { role, token } = useAppSelector((state) => state.auth);
  const { data, isLoading, error } = useConversationsControllerGetMyConversationsQuery(undefined, {
    skip: !token || (role !== "HIRER" && role !== "FREELANCER"),
    refetchOnFocus: true,
    refetchOnReconnect: true,
  });

  const conversations = (data as ConversationSummary[] | undefined) ?? [];

  if (role !== "HIRER" && role !== "FREELANCER") {
    return (
      <RoleAccessNotice
        title="Messages unavailable"
        description="This area is available for active client and freelancer accounts."
      />
    );
  }

  return (
    <main className="min-h-screen bg-(--color-bg)">
      <DashboardNavbar role={role} activeItem="messages" />

      <div className="h-[calc(100dvh-64px)] p-0 sm:p-3 lg:p-4">
        <div className="ui-surface mx-auto grid h-full w-full max-w-[1500px] min-w-0 overflow-hidden lg:grid-cols-[320px_minmax(0,1fr)]">
          <MessagesSidebar
            conversations={conversations}
            activeConversationId={conversationId}
            loading={isLoading}
            errorMessage={getConversationError(error)}
            className="hidden lg:flex"
          />
          <ConversationThread conversationId={conversationId} />
        </div>
      </div>
    </main>
  );
}
