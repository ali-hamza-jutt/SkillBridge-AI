"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useAppSelector } from "@/lib/hooks";
import { useTasksControllerFindOneQuery } from "@/lib/api";
import DashboardNavbar from "@/components/dashboard-navbar";
import RoleAccessNotice from "@/components/role-access-notice";
import TaskSummaryPanel from "@/components/task-summary-panel";
import BidApplicationForm from "@/components/bid-application-form";

type Task = {
  _id: string;
  title: string;
  description: string;
  budget: number;
  maxBudget?: number;
  budgetType: "hourly" | "fixed";
  projectType: "ongoing" | "one_time";
  experienceLevel: "entry" | "intermediate" | "expert";
  status: string;
  requiredSkills?: string[];
};

export default function ApplyPage() {
  const params = useParams<{ taskId: string }>();
  const taskId = Array.isArray(params.taskId) ? params.taskId[0] : params.taskId;
  const { role } = useAppSelector((state) => state.auth);

  const { data: taskRaw, isFetching } = useTasksControllerFindOneQuery(
    { id: taskId ?? "" },
    { skip: !taskId },
  );

  const task = taskRaw as Task | undefined;

  if (role !== "FREELANCER") {
    return (
      <RoleAccessNotice
        title="This page is for freelancers"
        description="Switch to a freelancer account to submit bids."
      />
    );
  }

  if (isFetching) {
    return (
      <main className="min-h-screen bg-[var(--color-bg)] py-10">
        <div className="mx-auto w-[min(100%-2rem,1200px)]">
          <p className="text-sm text-[var(--color-text-muted)]">Loading job details...</p>
        </div>
      </main>
    );
  }

  if (!task) {
    return (
      <main className="min-h-screen bg-[var(--color-bg)] py-10">
        <div className="mx-auto w-[min(100%-2rem,1200px)]">
          <section className="rounded-3xl border border-dashed border-[color-mix(in_srgb,var(--color-border)_90%,transparent)] bg-[color-mix(in_srgb,var(--color-surface)_85%,transparent)] p-8 text-center shadow-[0_20px_44px_-34px_rgba(15,23,42,0.35)]">
            <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-main)]">Job not found</h1>
            <p className="mt-2 text-sm text-[var(--color-text-muted)]">The task you are trying to apply for no longer exists or cannot be loaded.</p>
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
      <DashboardNavbar role={role} activeItem="jobs" />

      <div className="mx-auto grid w-[min(100%-2rem,1200px)] gap-6 py-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="grid gap-5">
          <div className="rounded-3xl border border-[color-mix(in_srgb,var(--color-border)_90%,transparent)] bg-[color-mix(in_srgb,var(--color-surface)_92%,transparent)] p-5 shadow-[0_20px_44px_-34px_rgba(15,23,42,0.35)]">
            <Link href="/dashboard" className="text-sm font-semibold text-[var(--color-brand-strong)] no-underline hover:underline">
              Back to jobs
            </Link>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-[var(--color-text-main)]">Apply to this project</h1>
            <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">
              Review the brief, then submit a proposal with a cover letter, optional attachments, and either a whole bid or module-based bid.
            </p>
          </div>

          <TaskSummaryPanel
            title={task.title}
            description={task.description}
            budget={task.budget}
            maxBudget={task.maxBudget}
            budgetType={task.budgetType}
            projectType={task.projectType}
            experienceLevel={task.experienceLevel}
            status={task.status}
            requiredSkills={task.requiredSkills}
          />
        </section>

        <section className="grid gap-4 self-start">
          <div className="rounded-3xl border border-[color-mix(in_srgb,var(--color-border)_90%,transparent)] bg-[color-mix(in_srgb,var(--color-surface)_92%,transparent)] p-5 shadow-[0_20px_44px_-34px_rgba(15,23,42,0.35)]">
            <p className="m-0 text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">Application tips</p>
            <ul className="mt-4 grid gap-3 text-sm leading-6 text-[var(--color-text-muted)]">
              <li>Keep the cover letter specific to this brief.</li>
              <li>Use attachments only when they strengthen your proposal.</li>
              <li>If you choose module-based bidding, each module needs a title, details, and price.</li>
            </ul>
          </div>

          <BidApplicationForm taskId={task._id} defaultBidAmount={task.budget} />
        </section>
      </div>
    </main>
  );
}