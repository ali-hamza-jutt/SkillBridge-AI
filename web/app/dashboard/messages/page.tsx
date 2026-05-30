"use client";

import { useRouter } from "next/navigation";
import { useAppSelector } from "@/lib/hooks";
import DashboardNavbar from "@/components/dashboard-navbar";
import RoleAccessNotice from "@/components/role-access-notice";
import ConversationListItem from "@/components/conversation-list-item";
import type { ConversationSummary } from "@/lib/types/chat";
import { useConversationsControllerGetMyConversationsQuery } from "@/lib/api";
import { useConversationListRealtimeUpdates } from "@/lib/useConversationListRealtimeUpdates";

export default function MessagesPage() {
  const router = useRouter();
  const { role, token } = useAppSelector((state) => state.auth);
  useConversationListRealtimeUpdates();
  const {
    data,
    isLoading,
    isFetching,
    error,
  } = useConversationsControllerGetMyConversationsQuery(undefined, {
    skip: !token || (role !== "HIRER" && role !== "FREELANCER"),
    refetchOnFocus: true,
    refetchOnReconnect: true,
  });

  const conversations = (data as ConversationSummary[] | undefined) ?? [];
  const loading = isLoading || isFetching;
  const errorMessage =
    error && typeof error === "object" && "data" in error
      ? typeof (error as { data?: unknown }).data === "string"
        ? (error as { data?: string }).data ?? "Failed to load conversations"
        : "Failed to load conversations"
      : null;

  if (role !== "HIRER" && role !== "FREELANCER") {
    return <RoleAccessNotice title="Messages unavailable" description="This area is available for active client and freelancer accounts." />;
  }

  return (
    <main className="min-h-screen bg-(--color-bg)">
      <DashboardNavbar role={role} activeItem="messages" />

      <div className="mx-auto grid w-[min(100%-1rem,1440px)] gap-3 py-4 lg:grid-cols-[300px_1fr]">
        <section className="rounded-2xl bg-(--background-color-chat-list-box)" style={{ maxHeight: "calc(100vh - 88px)" }}>
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <div>
              <h1 className="text-lg font-bold tracking-tight text-(--color-text-main)">Messages</h1>
            </div>
            <button
              type="button"
              className="rounded-full border border-[color-mix(in_srgb,var(--color-border)_90%,transparent)] px-3 py-1.5 text-xs font-semibold text-(--color-text-main) transition hover:bg-[color-mix(in_srgb,var(--color-surface)_80%,transparent)]"
              onClick={() => router.push("/dashboard")}
            >
              Back
            </button>
          </div>

          <div className="grid gap-0 p-3 overflow-y-auto hide-scrollbar">
            {loading ? <p className="px-2 py-3 text-sm text-(--color-text-muted)">Loading...</p> : null}
            {!loading && errorMessage ? <p className="px-2 text-sm text-red-600">{errorMessage}</p> : null}
            {!loading && !errorMessage && conversations.length === 0 ? (
              <p className="px-2 py-6 text-center text-sm text-(--color-text-muted)">No conversations yet.</p>
            ) : null}
            {conversations.map((conversation) => (
              <ConversationListItem
                key={conversation.conversationId}
                conversation={conversation}
                href={`/dashboard/messages/${conversation.conversationId}`}
              />
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-[color-mix(in_srgb,var(--color-border)_90%,transparent)] bg-[color-mix(in_srgb,var(--color-surface)_94%,transparent)] shadow-[0_8px_24px_-12px_rgba(15,23,42,0.18)]">
          <div className="flex min-h-[70vh] items-center justify-center text-center">
            <div className="max-w-xs">
              <p className="text-2xl">💬</p>
              <h2 className="mt-3 text-lg font-bold tracking-tight text-(--color-text-main)">Select a conversation</h2>
              <p className="mt-1.5 text-sm leading-6 text-(--color-text-muted)">
                Choose a chat from the list to start messaging in real time.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
