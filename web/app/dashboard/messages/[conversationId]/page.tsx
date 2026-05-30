"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useAppSelector } from "@/lib/hooks";
import DashboardNavbar from "@/components/dashboard-navbar";
import RoleAccessNotice from "@/components/role-access-notice";
import ConversationListItem from "@/components/conversation-list-item";
import ConversationThread from "@/components/conversation-thread";
import { useConversationsControllerGetMyConversationsQuery } from "@/lib/api";
import type { ConversationSummary } from "@/lib/types/chat";
import { useUnreadConversationCount } from "@/lib/useUnreadMessages";

export default function ConversationPage() {
  const params = useParams<{ conversationId: string }>();
  const conversationId = Array.isArray(params.conversationId) ? params.conversationId[0] : params.conversationId;
  const { role, token } = useAppSelector((state) => state.auth);
  const { data, isLoading, isFetching } = useConversationsControllerGetMyConversationsQuery(undefined, {
    skip: !token || (role !== "HIRER" && role !== "FREELANCER"),
  });
  const conversations = (data as ConversationSummary[] | undefined) ?? [];
  const loadingSidebar = isLoading || isFetching;
  useUnreadConversationCount(); // keep badge count in sync while on this page

  if (role !== "HIRER" && role !== "FREELANCER") {
    return <RoleAccessNotice title="Messages unavailable" description="This area is available for active client and freelancer accounts." />;
  }

  return (
    <main className="min-h-screen bg-(--color-bg)">
      <DashboardNavbar role={role} activeItem="messages" />

      <div className="mx-auto grid w-[min(100%-1rem,1440px)] gap-3 py-4 lg:grid-cols-[300px_1fr]">
        <section className="rounded-2xl border border-[color-mix(in_srgb,var(--color-border)_90%,transparent)] bg-[color-mix(in_srgb,var(--color-surface)_94%,transparent)] shadow-[0_8px_24px_-12px_rgba(15,23,42,0.18)]">
          <div className="flex items-center justify-between gap-3 border-b border-[color-mix(in_srgb,var(--color-border)_85%,transparent)] px-4 py-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-(--color-text-muted)">Inbox</p>
              <h1 className="text-lg font-bold tracking-tight text-(--color-text-main)">Messages</h1>
            </div>
            <Link href="/dashboard/messages" className="text-xs font-semibold text-(--color-brand-strong) no-underline hover:underline">
              All
            </Link>
          </div>

          <div className="grid gap-1.5 p-3">
            {loadingSidebar ? <p className="px-2 py-3 text-sm text-(--color-text-muted)">Loading...</p> : null}
            {conversations.map((conversation) => (
              <ConversationListItem
                key={conversation.conversationId}
                conversation={conversation}
                href={`/dashboard/messages/${conversation.conversationId}`}
                active={conversation.conversationId === conversationId}
              />
            ))}
          </div>
        </section>

        <ConversationThread conversationId={conversationId} />
      </div>
    </main>
  );
}
