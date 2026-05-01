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

export default function ConversationPage() {
  const params = useParams<{ conversationId: string }>();
  const conversationId = Array.isArray(params.conversationId) ? params.conversationId[0] : params.conversationId;
  const { role, token } = useAppSelector((state) => state.auth);
  const { data, isLoading, isFetching } = useConversationsControllerGetMyConversationsQuery(undefined, {
    skip: !token || (role !== "HIRER" && role !== "FREELANCER"),
  });
  const conversations = (data as ConversationSummary[] | undefined) ?? [];
  const loadingSidebar = isLoading || isFetching;

  if (role !== "HIRER" && role !== "FREELANCER") {
    return <RoleAccessNotice title="Messages unavailable" description="This area is available for active client and freelancer accounts." />;
  }

  return (
    <main
      className="min-h-screen"
      style={{
        background:
          "radial-gradient(circle at 8% 0%, color-mix(in srgb, var(--color-brand-soft) 50%, transparent), transparent 34%), radial-gradient(circle at 96% 8%, color-mix(in srgb, var(--color-accent-soft) 42%, transparent), transparent 44%), linear-gradient(160deg, var(--color-bg), color-mix(in srgb, var(--color-surface-strong) 86%, var(--color-bg)))",
      }}
    >
      <DashboardNavbar role={role} activeItem="messages" />

      <div className="mx-auto grid w-[min(100%-2rem,1200px)] gap-6 py-6 lg:grid-cols-[0.38fr_0.62fr]">
        <section className="rounded-3xl border border-[color-mix(in_srgb,var(--color-border)_90%,transparent)] bg-[color-mix(in_srgb,var(--color-surface)_92%,transparent)] p-5 shadow-[0_20px_44px_-34px_rgba(15,23,42,0.35)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">Inbox</p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-[var(--color-text-main)]">Messages</h1>
            </div>
            <Link href="/dashboard/messages" className="text-sm font-semibold text-[var(--color-brand-strong)] no-underline hover:underline">
              All
            </Link>
          </div>

          <div className="mt-5 grid gap-3">
            {loadingSidebar ? <p className="text-sm text-[var(--color-text-muted)]">Loading conversations...</p> : null}
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
