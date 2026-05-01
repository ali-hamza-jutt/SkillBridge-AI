"use client";

import { useRouter } from "next/navigation";
import { useAppSelector } from "@/lib/hooks";
import DashboardNavbar from "@/components/dashboard-navbar";
import RoleAccessNotice from "@/components/role-access-notice";
import ConversationListItem from "@/components/conversation-list-item";
import type { ConversationSummary } from "@/lib/types/chat";
import { useConversationsControllerGetMyConversationsQuery } from "@/lib/api";

export default function MessagesPage() {
  const router = useRouter();
  const { role, token } = useAppSelector((state) => state.auth);
  const {
    data,
    isLoading,
    isFetching,
    error,
  } = useConversationsControllerGetMyConversationsQuery(undefined, {
    skip: !token || (role !== "HIRER" && role !== "FREELANCER"),
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
    <main
      className="min-h-screen"
      style={{
        background:
          "radial-gradient(circle at 8% 0%, color-mix(in srgb, var(--color-brand-soft) 50%, transparent), transparent 34%), radial-gradient(circle at 96% 8%, color-mix(in srgb, var(--color-accent-soft) 42%, transparent), transparent 44%), linear-gradient(160deg, var(--color-bg), color-mix(in srgb, var(--color-surface-strong) 86%, var(--color-bg)))",
      }}
    >
      <DashboardNavbar role={role} activeItem="messages" />

      <div className="mx-auto grid w-[min(100%-2rem,1200px)] gap-6 py-6 lg:grid-cols-[0.42fr_0.58fr]">
        <section className="rounded-3xl border border-[color-mix(in_srgb,var(--color-border)_90%,transparent)] bg-[color-mix(in_srgb,var(--color-surface)_92%,transparent)] p-5 shadow-[0_20px_44px_-34px_rgba(15,23,42,0.35)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-[var(--color-text-main)]">Messages</h1>
              <p className="mt-2 text-sm text-[var(--color-text-muted)]">All of your proposal and contract chats live here.</p>
            </div>
            <button
              type="button"
              className="rounded-full border border-[var(--color-border)] px-4 py-2 text-sm font-semibold text-[var(--color-text-main)]"
              onClick={() => router.push("/dashboard")}
            >
              Back
            </button>
          </div>

          <div className="mt-5 grid gap-3">
            {loading ? <p className="text-sm text-[var(--color-text-muted)]">Loading conversations...</p> : null}
            {!loading && errorMessage ? <p className="text-sm text-red-600">{errorMessage}</p> : null}
            {!loading && !errorMessage && conversations.length === 0 ? (
              <article className="rounded-2xl border border-dashed border-[color-mix(in_srgb,var(--color-border)_90%,transparent)] bg-[color-mix(in_srgb,var(--color-surface)_85%,transparent)] p-6 text-center">
                <p className="text-sm text-[var(--color-text-muted)]">No conversations yet.</p>
              </article>
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

        <section className="rounded-3xl border border-[color-mix(in_srgb,var(--color-border)_90%,transparent)] bg-[color-mix(in_srgb,var(--color-surface)_92%,transparent)] p-5 shadow-[0_20px_44px_-34px_rgba(15,23,42,0.35)]">
          <div className="flex h-full min-h-[60vh] items-center justify-center text-center">
            <div className="max-w-md">
              <h2 className="text-2xl font-bold tracking-tight text-[var(--color-text-main)]">Select a conversation</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">
                Open a proposal chat or contract chat from the list to continue the conversation in real time.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
