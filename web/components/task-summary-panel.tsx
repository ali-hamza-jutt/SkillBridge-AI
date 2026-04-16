"use client";

type TaskSummaryPanelProps = {
  title: string;
  description: string;
  budget: number;
  maxBudget?: number;
  budgetType: "hourly" | "fixed";
  projectType: "ongoing" | "one_time";
  experienceLevel: "entry" | "intermediate" | "expert";
  status?: string;
  categoryName?: string;
  subCategoryName?: string;
  requiredSkills?: string[];
};

const statusClassName = (status?: string) => {
  if (status === "OPEN") {
    return "border-[color-mix(in_srgb,var(--color-brand)_35%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-brand-soft)_70%,var(--color-surface))] text-[var(--color-brand-strong)]";
  }
  if (status === "ASSIGNED") {
    return "border-[color-mix(in_srgb,var(--color-accent)_35%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-accent-soft)_72%,var(--color-surface))] text-[color-mix(in_srgb,var(--color-text-main)_90%,#3b2f12)]";
  }
  return "border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface)_86%,transparent)] text-[var(--color-text-muted)]";
};

export default function TaskSummaryPanel({
  title,
  description,
  budget,
  maxBudget,
  budgetType,
  projectType,
  experienceLevel,
  status,
  categoryName,
  subCategoryName,
  requiredSkills = [],
}: TaskSummaryPanelProps) {
  return (
    <section className="rounded-3xl border border-[color-mix(in_srgb,var(--color-border)_90%,transparent)] bg-[color-mix(in_srgb,var(--color-surface)_94%,transparent)] p-5 shadow-[0_20px_44px_-34px_rgba(15,23,42,0.35)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="m-0 text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">Project Brief</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-[var(--color-text-main)]">{title}</h1>
        </div>
        {status ? (
          <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.08em] ${statusClassName(status)}`}>
            {status === "ASSIGNED" ? "ONGOING" : status}
          </span>
        ) : null}
      </div>

      <p className="mt-4 whitespace-pre-line text-sm leading-6 text-[var(--color-text-muted)]">{description}</p>

      <div className="mt-5 flex flex-wrap gap-2 text-xs">
        <span className="rounded-full border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface)_85%,transparent)] px-2.5 py-1 text-[var(--color-text-main)]">
          {budgetType === "hourly" ? "Hourly" : "Fixed"}
        </span>
        <span className="rounded-full border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface)_85%,transparent)] px-2.5 py-1 text-[var(--color-text-main)]">
          ${budget}
          {typeof maxBudget === "number" ? ` - $${maxBudget}` : ""}
        </span>
        <span className="rounded-full border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface)_85%,transparent)] px-2.5 py-1 text-[var(--color-text-main)]">
          {projectType === "one_time" ? "One-time" : "Ongoing"}
        </span>
        <span className="rounded-full border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface)_85%,transparent)] px-2.5 py-1 text-[var(--color-text-main)] capitalize">
          {experienceLevel}
        </span>
      </div>

      {categoryName || subCategoryName ? (
        <div className="mt-5 grid gap-2 text-sm text-[var(--color-text-main)] sm:grid-cols-2">
          {categoryName ? <p className="m-0"><span className="font-semibold text-[var(--color-text-muted)]">Category:</span> {categoryName}</p> : null}
          {subCategoryName ? <p className="m-0"><span className="font-semibold text-[var(--color-text-muted)]">Sub-category:</span> {subCategoryName}</p> : null}
        </div>
      ) : null}

      {requiredSkills.length ? (
        <div className="mt-5 flex flex-wrap gap-2">
          {requiredSkills.map((skill) => (
            <span
              key={skill}
              className="rounded-full border border-[color-mix(in_srgb,var(--color-brand)_24%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-brand-soft)_68%,var(--color-surface))] px-2.5 py-1 text-xs font-semibold text-[color-mix(in_srgb,var(--color-brand-strong)_88%,var(--color-text-main))]"
            >
              {skill}
            </span>
          ))}
        </div>
      ) : null}
    </section>
  );
}