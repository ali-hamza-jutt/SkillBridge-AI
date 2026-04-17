"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAppSelector } from "@/lib/hooks";
import DashboardNavbar from "@/components/dashboard-navbar";
import type { Task, TaskBid } from "@/lib/types/proposal";
import { getAttachmentDisplayItems, money, formatBidDate } from "@/lib/utils/formatting";

const attachmentBadge = (kind: "image" | "video" | "pdf" | "doc" | "file") => {
  switch (kind) {
    case "image":
      return "IMG";
    case "video":
      return "VID";
    case "pdf":
      return "PDF";
    case "doc":
      return "DOC";
    default:
      return "FILE";
  }
};

const attachmentBadgeClass = (kind: "image" | "video" | "pdf" | "doc" | "file") => {
  switch (kind) {
    case "image":
      return "border-[color-mix(in_srgb,var(--color-brand)_30%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-brand-soft)_72%,var(--color-surface))] text-[var(--color-brand-strong)]";
    case "video":
      return "border-[color-mix(in_srgb,var(--color-accent)_35%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-accent-soft)_72%,var(--color-surface))] text-[color-mix(in_srgb,var(--color-text-main)_90%,#3b2f12)]";
    case "pdf":
      return "border-[color-mix(in_srgb,#dc2626_36%,var(--color-border))] bg-[color-mix(in_srgb,#fee2e2_78%,var(--color-surface))] text-[color-mix(in_srgb,#991b1b_85%,var(--color-text-main))]";
    case "doc":
      return "border-[color-mix(in_srgb,#2563eb_34%,var(--color-border))] bg-[color-mix(in_srgb,#dbeafe_75%,var(--color-surface))] text-[color-mix(in_srgb,#1d4ed8_84%,var(--color-text-main))]";
    default:
      return "border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface)_86%,transparent)] text-[var(--color-text-main)]";
  }
};

export default function ProposalDetailsPage() {
  const searchParams = useSearchParams();
  const { role, userId } = useAppSelector((state) => state.auth);

  const taskData = searchParams.get("task");
  const bidData = searchParams.get("bid");
  
  const task: Task | null = taskData ? JSON.parse(taskData) : null;
  const bid: TaskBid | null = bidData ? JSON.parse(bidData) : null;
  const attachmentItems = getAttachmentDisplayItems(bid?.attachments);

  if (role !== "HIRER") {
    return (
      <main className="min-h-screen bg-[var(--color-bg)] py-10">
        <div className="mx-auto w-[min(100%-2rem,980px)]">
          <section className="rounded-3xl border border-[color-mix(in_srgb,var(--color-border)_90%,transparent)] bg-[color-mix(in_srgb,var(--color-surface)_92%,transparent)] p-6 shadow-[0_20px_44px_-34px_rgba(15,23,42,0.35)]">
            <h1 className="text-3xl font-bold tracking-tight text-[var(--color-text-main)]">This page is for employers</h1>
            <p className="mt-3 text-sm text-[var(--color-text-muted)]">Switch to an employer account to review proposals.</p>
            <Link
              href="/dashboard"
              className="mt-6 inline-flex items-center justify-center rounded-full border border-transparent bg-[linear-gradient(135deg,var(--color-brand),var(--color-brand-strong))] px-5 py-2.5 text-sm font-semibold text-white no-underline"
            >
              Back to Dashboard
            </Link>
          </section>
        </div>
      </main>
    );
  }

  if (!task || task.clientId !== userId || !bid) {
    return (
      <main className="min-h-screen bg-[var(--color-bg)] py-10">
        <div className="mx-auto w-[min(100%-2rem,1200px)]">
          <section className="rounded-3xl border border-dashed border-[color-mix(in_srgb,var(--color-border)_90%,transparent)] bg-[color-mix(in_srgb,var(--color-surface)_85%,transparent)] p-8 text-center shadow-[0_20px_44px_-34px_rgba(15,23,42,0.35)]">
            <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-main)]">Proposal not accessible</h1>
            <p className="mt-2 text-sm text-[var(--color-text-muted)]">This proposal does not exist or is not available for your account.</p>
            <Link
              href={task ? `/dashboard/jobs/${task._id}` : "/dashboard"}
              className="mt-6 inline-flex items-center justify-center rounded-full border border-transparent bg-[linear-gradient(135deg,var(--color-brand),var(--color-brand-strong))] px-5 py-2.5 text-sm font-semibold text-white no-underline"
            >
              Back to Job Proposals
            </Link>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main
      className="min-h-screen"
      style={{
        background:
          "radial-gradient(circle at 8% 0%, color-mix(in srgb, var(--color-brand-soft) 50%, transparent), transparent 34%), radial-gradient(circle at 96% 8%, color-mix(in srgb, var(--color-accent-soft) 42%, transparent), transparent 44%), linear-gradient(160deg, var(--color-bg), color-mix(in srgb, var(--color-surface-strong) 86%, var(--color-bg)))",
      }}
    >
      <DashboardNavbar role={role} />

      <div className="mx-auto grid w-[min(100%-2rem,1100px)] gap-5 py-6">
        <section className="rounded-3xl border border-[color-mix(in_srgb,var(--color-border)_90%,transparent)] bg-[color-mix(in_srgb,var(--color-surface)_92%,transparent)] p-5 shadow-[0_20px_44px_-34px_rgba(15,23,42,0.35)]">
          <Link
            href={`/dashboard/jobs/${task._id}`}
            className="text-sm font-semibold text-[var(--color-brand-strong)] no-underline hover:underline"
          >
            Back to proposals
          </Link>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-[var(--color-text-main)]">Proposal Details</h1>
          <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">Task: {task.title}</p>
        </section>

        <section className="rounded-3xl border border-[color-mix(in_srgb,var(--color-border)_90%,transparent)] bg-[color-mix(in_srgb,var(--color-surface)_92%,transparent)] p-5 shadow-[0_20px_44px_-34px_rgba(15,23,42,0.35)]">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface)_90%,transparent)] p-3">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">Submitted By</p>
              <p className="mt-1 text-sm font-semibold text-[var(--color-text-main)]">{bid.freelancerName ?? "Unknown Freelancer"}</p>
            </div>
            <div className="rounded-2xl border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface)_90%,transparent)] p-3">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">Bid Amount</p>
              <p className="mt-1 text-sm font-semibold text-[var(--color-brand-strong)]">{money(bid.bidAmount)}</p>
            </div>
            <div className="rounded-2xl border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface)_90%,transparent)] p-3">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">Submitted</p>
              <p className="mt-1 text-sm font-semibold text-[var(--color-text-main)]">{formatBidDate(bid.createdAt)}</p>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface)_90%,transparent)] p-4">
            <h2 className="text-lg font-bold tracking-tight text-[var(--color-text-main)]">Cover Letter</h2>
            <p className="mt-3 text-sm leading-7 text-[var(--color-text-main)]">{bid.coverLetter}</p>
          </div>

          <div className="mt-5 rounded-2xl border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface)_90%,transparent)] p-4">
            <h2 className="text-lg font-bold tracking-tight text-[var(--color-text-main)]">Attachments</h2>
            {attachmentItems.length ? (
              <div className="mt-3 grid gap-2">
                {attachmentItems.map((attachment, index) => (
                  <a
                    key={`${bid._id}-attachment-${index}`}
                    href={attachment.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface)_95%,transparent)] px-3 py-2 text-sm text-[var(--color-text-main)] no-underline transition hover:border-[color-mix(in_srgb,var(--color-brand)_30%,var(--color-border))]"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span className={`inline-flex min-w-[2.5rem] justify-center rounded-md border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] ${attachmentBadgeClass(attachment.kind)}`}>
                        {attachmentBadge(attachment.kind)}
                      </span>
                      <span className="truncate font-medium" title={attachment.fileName}>
                        {attachment.fileName}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs text-[var(--color-text-muted)]">
                      {typeof attachment.sizeMb === "number" ? `${attachment.sizeMb.toFixed(1)} MB` : "Open"}
                    </span>
                  </a>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-[var(--color-text-muted)]">No attachments provided.</p>
            )}
          </div>

          {bid.modules?.length ? (
            <div className="mt-5 rounded-2xl border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface)_90%,transparent)] p-4">
              <h2 className="text-lg font-bold tracking-tight text-[var(--color-text-main)]">Milestones</h2>
              <div className="mt-3 grid gap-2">
                {bid.modules.map((module, index) => (
                  <div
                    key={`${bid._id}-${module.title}-${index}`}
                    className="rounded-xl border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface)_95%,transparent)] p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-[var(--color-text-main)]">{module.title}</p>
                      <p className="text-sm font-semibold text-[var(--color-brand-strong)]">{money(module.amount)}</p>
                    </div>
                    <p className="mt-1 text-sm text-[var(--color-text-muted)]">{module.details}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
