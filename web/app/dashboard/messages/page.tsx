"use client";

import { MessageSquareText } from "lucide-react";
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

export default function MessagesPage() {
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

      <div className="h-[calc(100dvh-64px)] p-2 sm:p-3 lg:p-4">
        <div className="ui-surface mx-auto grid h-full w-full max-w-[1500px] min-w-0 overflow-hidden lg:grid-cols-[320px_minmax(0,1fr)]">
          <MessagesSidebar conversations={conversations} loading={isLoading} errorMessage={getConversationError(error)} />

          <section className="hidden min-w-0 items-center justify-center bg-(--color-bg) px-8 text-center lg:flex">
            <div className="max-w-sm">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-[var(--radius-lg)] border border-(--color-border) bg-(--color-surface) text-(--color-brand) shadow-(--shadow-sm)">
                <MessageSquareText className="h-5 w-5" />
              </span>
              <h2 className="mt-4 text-lg font-bold tracking-tight text-(--color-text-main)">Select a conversation</h2>
              <p className="mt-1.5 text-sm leading-6 text-(--color-text-secondary)">
                Choose a conversation from the sidebar to view its messages and continue where you left off.
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
