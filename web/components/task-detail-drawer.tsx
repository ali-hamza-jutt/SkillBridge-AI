"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import TaskSummaryPanel from "@/components/task-summary-panel";

type TaskDetailDrawerProps = {
  open: boolean;
  onClose: () => void;
  task: {
    _id: string;
    title: string;
    description: string;
    budget: number;
    maxBudget?: number;
    budgetType: "hourly" | "fixed";
    projectType: "ongoing" | "one_time";
    experienceLevel: "entry" | "intermediate" | "expert";
    status: string;
    categoryName?: string;
    subCategoryName?: string;
    requiredSkills?: string[];
  } | null;
};

export default function TaskDetailDrawer({ open, onClose, task }: TaskDetailDrawerProps) {
  const [isMounted, setIsMounted] = useState(open);
  const [isVisible, setIsVisible] = useState(open);

  useEffect(() => {
    if (open && task) {
      setIsMounted(true);
      const frameId = window.requestAnimationFrame(() => {
        setIsVisible(true);
      });
      return () => window.cancelAnimationFrame(frameId);
    }

    setIsVisible(false);
    const timeoutId = window.setTimeout(() => {
      setIsMounted(false);
    }, 280);

    return () => window.clearTimeout(timeoutId);
  }, [open, task]);

  if (!isMounted || !task) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <button
        type="button"
        aria-label="Close job details"
        className={`absolute inset-0 cursor-default bg-[rgba(9,15,28,0.46)] backdrop-blur-[2px] transition-opacity duration-300 ease-out ${
          isVisible ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
      />

      <aside
        className={`absolute right-0 top-0 flex h-full w-full max-w-[min(100vw,560px)] flex-col border-l border-[color-mix(in_srgb,var(--color-border)_88%,transparent)] bg-[var(--color-surface)] shadow-[0_18px_52px_-18px_rgba(15,23,42,0.45)] transition-transform duration-300 ease-out will-change-transform ${
          isVisible ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-6 py-4">
          <div>
            <p className="m-0 text-xs font-bold uppercase tracking-[0.16em] text-[var(--color-text-muted)]">Job details</p>
            <h2 className="mt-1 text-lg font-semibold text-[var(--color-text-main)]">Review before applying</h2>
          </div>
          <button
            type="button"
            className="rounded-full border border-[var(--color-border)] px-3 py-1.5 text-sm font-medium text-[var(--color-text-main)] transition hover:border-[var(--color-brand)] hover:text-[var(--color-brand-strong)]"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <TaskSummaryPanel
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

          <div className="mt-5 rounded-3xl border border-[color-mix(in_srgb,var(--color-brand)_18%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-brand-soft)_60%,var(--color-surface))] p-5">
            <p className="m-0 text-sm font-semibold text-[var(--color-text-main)]">Ready to send your proposal?</p>
            <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">
              Use the apply page to write your cover letter, add attachments, and choose a whole-project or module-based bid.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href={`/dashboard/apply/${task._id}`}
                className="inline-flex items-center justify-center rounded-full bg-[var(--color-brand)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--color-brand-strong)]"
              >
                Apply now
              </Link>
              <button
                type="button"
                className="rounded-full border border-[var(--color-border)] px-4 py-2 text-sm font-semibold text-[var(--color-text-main)] transition hover:border-[var(--color-brand)] hover:text-[var(--color-brand-strong)]"
                onClick={onClose}
              >
                Keep browsing
              </button>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}