"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useAppSelector } from "@/lib/hooks";
import { useBidsControllerFindByTaskQuery, useTasksControllerFindOneQuery } from "@/lib/api";
import DashboardNavbar from "@/components/dashboard-navbar";
import RoleAccessNotice from "@/components/role-access-notice";
import TaskSummaryPanel from "@/components/task-summary-panel";
import type { Task, TaskBid } from "@/lib/types/proposal";
import { getAttachmentUrls, money, formatBidDate } from "@/lib/utils/formatting";

export default function EmployerJobDetailsPage() {
  const params = useParams<{ taskId: string }>();
  const taskId = Array.isArray(params.taskId) ? params.taskId[0] : params.taskId;
  const { role, userId } = useAppSelector((state) => state.auth);

  const { data: taskRaw, isFetching: isLoadingTask } = useTasksControllerFindOneQuery(
    { id: taskId ?? "" },
    { skip: !taskId },
  );

  const { data: taskBidsRaw, isFetching: isLoadingBids } = useBidsControllerFindByTaskQuery(
    { taskId: taskId ?? "" },
    { skip: !taskId },
  );

  const task = taskRaw as Task | undefined;
  const taskBids = (taskBidsRaw as TaskBid[] | undefined) ?? [];

  if (role !== "HIRER") {
    return (
      <RoleAccessNotice
        title="This page is for employers"
        description="Switch to an employer account to review proposals."
      />
    );
  }

  if (isLoadingTask) {
    return (
      <main className="min-h-screen bg-[var(--color-bg)] py-10">
        <div className="mx-auto w-[min(100%-2rem,1200px)]">
          <p className="text-sm text-[var(--color-text-muted)]">Loading job details...</p>
        </div>
      </main>
    );
  }

  if (!task || task.clientId !== userId) {
    return (
      <main className="min-h-screen bg-[var(--color-bg)] py-10">
        <div className="mx-auto w-[min(100%-2rem,1200px)]">
          <section className="rounded-3xl border border-dashed border-[color-mix(in_srgb,var(--color-border)_90%,transparent)] bg-[color-mix(in_srgb,var(--color-surface)_85%,transparent)] p-8 text-center shadow-[0_20px_44px_-34px_rgba(15,23,42,0.35)]">
            <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-main)]">Job not accessible</h1>
            <p className="mt-2 text-sm text-[var(--color-text-muted)]">This task either does not exist or does not belong to your employer account.</p>
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

  return (
    <main
      className="min-h-screen"
      style={{
        background:
          "radial-gradient(circle at 8% 0%, color-mix(in srgb, var(--color-brand-soft) 50%, transparent), transparent 34%), radial-gradient(circle at 96% 8%, color-mix(in srgb, var(--color-accent-soft) 42%, transparent), transparent 44%), linear-gradient(160deg, var(--color-bg), color-mix(in srgb, var(--color-surface-strong) 86%, var(--color-bg)))",
      }}
    >
      <DashboardNavbar role={role} />

      <div className="mx-auto grid w-[min(100%-2rem,1200px)] gap-6 py-6 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="grid gap-5 self-start">
          <TaskSummaryPanel
            backHref="/dashboard"
            backLabel="Back to my jobs"
            title={task.title}
            description={task.description}
            budget={task.budget}
            maxBudget={task.maxBudget}
            budgetType={task.budgetType}
            projectType={task.projectType}
            experienceLevel={task.experienceLevel}
            status={task.status}
            categoryName={task.categoryName}
            subCategoryName={task.subCategoryName}
            requiredSkills={task.requiredSkills}
          />
        </section>

        <section className="grid gap-4 self-start">
          <div className="rounded-3xl border border-[color-mix(in_srgb,var(--color-border)_90%,transparent)] bg-[color-mix(in_srgb,var(--color-surface)_92%,transparent)] p-5 shadow-[0_20px_44px_-34px_rgba(15,23,42,0.35)]">
            <div className="flex items-center justify-between gap-3">
              <p className="m-0 text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">Proposals</p>
              <span className="rounded-full border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface)_88%,transparent)] px-3 py-1 text-xs font-semibold text-[var(--color-text-main)]">
                {taskBids.length}
              </span>
            </div>

            <div className="mt-4 grid gap-3">
              {isLoadingBids ? <p className="text-sm text-[var(--color-text-muted)]">Loading proposals...</p> : null}

              {!isLoadingBids && taskBids.length === 0 ? (
                <article className="rounded-2xl border border-dashed border-[color-mix(in_srgb,var(--color-border)_90%,transparent)] bg-[color-mix(in_srgb,var(--color-surface)_85%,transparent)] p-6 text-center">
                  <p className="text-sm text-[var(--color-text-muted)]">No proposals received yet for this job.</p>
                </article>
              ) : null}

              {taskBids.map((bid) => (
                (() => {
                  const attachmentUrls = getAttachmentUrls(bid.attachments);
                  return (
                <Link
                  key={bid._id}
                  href={{
                    pathname: `/dashboard/jobs/${task._id}/proposals/${bid._id}`,
                    query: { 
                      task: JSON.stringify(task),
                      bid: JSON.stringify(bid) 
                    },
                  }}
                  className="group block rounded-2xl border border-[color-mix(in_srgb,var(--color-border)_90%,transparent)] bg-[color-mix(in_srgb,var(--color-surface)_95%,transparent)] p-4 no-underline shadow-[0_18px_38px_-32px_rgba(15,23,42,0.4)] transition duration-200 hover:-translate-y-1 hover:border-[color-mix(in_srgb,var(--color-brand)_32%,var(--color-border))] hover:bg-[color-mix(in_srgb,var(--color-surface)_98%,var(--color-brand-soft))]"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="m-0 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">Proposal</p>
                      <p className="mt-1 text-sm font-semibold text-[var(--color-text-main)]">{bid.freelancerName ?? "Unknown Freelancer"}</p>
                    </div>
                    <div className="text-right">
                      <p className="m-0 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">Bid</p>
                      <p className="mt-1 text-base font-bold text-[var(--color-brand-strong)]">{money(bid.bidAmount)}</p>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded-full border border-[var(--color-border)] px-2.5 py-1 text-[var(--color-text-main)]">
                      {bid.payoutType === "module_based" ? "Module Based" : "Whole Project"}
                    </span>
                    <span className="rounded-full border border-[var(--color-border)] px-2.5 py-1 text-[var(--color-text-main)]">
                      {formatBidDate(bid.createdAt)}
                    </span>
                    {attachmentUrls.length > 0 ? (
                      <span className="rounded-full border border-[var(--color-border)] px-2.5 py-1 text-[var(--color-text-main)]">
                        {attachmentUrls.length} attachments
                      </span>
                    ) : null}
                  </div>

                  <p className="mt-3 line-clamp-2 text-sm leading-6 text-[var(--color-text-muted)]">{bid.coverLetter}</p>

                  <div className="mt-4 inline-flex items-center text-sm font-semibold text-[var(--color-brand-strong)] opacity-85 transition group-hover:opacity-100">
                    Open proposal
                    <span className="ml-2 transition-transform duration-200 group-hover:translate-x-1">→</span>
                  </div>
                </Link>
                  );
                })()
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
