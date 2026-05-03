"use client";

import { Pencil, Plus, X, Check, Loader2 } from "lucide-react";
import type { ReactNode } from "react";

type SectionCardProps = {
  title: string;
  children: ReactNode;
  editing?: boolean;
  saving?: boolean;
  onEdit?: () => void;
  onAdd?: () => void;
  onSave?: () => void;
  onCancel?: () => void;
  addLabel?: string;
};

export default function SectionCard({
  title,
  children,
  editing,
  saving,
  onEdit,
  onAdd,
  onSave,
  onCancel,
  addLabel = "Add",
}: SectionCardProps) {
  return (
    <div className="rounded-2xl border border-[color-mix(in_srgb,var(--color-border)_90%,transparent)] bg-(--color-surface) p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-base font-bold text-(--color-text-main)">{title}</h2>
        <div className="flex items-center gap-1.5">
          {editing ? (
            <>
              <button
                type="button"
                onClick={onCancel}
                disabled={saving}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-(--color-text-muted) transition hover:bg-[color-mix(in_srgb,var(--color-border)_40%,transparent)] hover:text-(--color-text-main) disabled:opacity-40"
              >
                <X className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={onSave}
                disabled={saving}
                className="flex h-8 items-center gap-1.5 rounded-lg bg-[linear-gradient(135deg,var(--color-brand),var(--color-brand-strong))] px-3 text-xs font-semibold text-white disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                Save
              </button>
            </>
          ) : (
            <>
              {onAdd && (
                <button
                  type="button"
                  onClick={onAdd}
                  className="flex h-8 items-center gap-1 rounded-lg border border-(--color-border) px-3 text-xs font-semibold text-(--color-text-main) transition hover:border-[color-mix(in_srgb,var(--color-brand)_40%,var(--color-border))] hover:text-(--color-brand-strong)"
                >
                  <Plus className="h-3.5 w-3.5" />
                  {addLabel}
                </button>
              )}
              {onEdit && (
                <button
                  type="button"
                  onClick={onEdit}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-(--color-text-muted) transition hover:bg-[color-mix(in_srgb,var(--color-border)_40%,transparent)] hover:text-(--color-text-main)"
                >
                  <Pencil className="h-4 w-4" />
                </button>
              )}
            </>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}

// ── Shared form primitives ────────────────────────────────────────────────────

const inputCls =
  "w-full rounded-xl border border-(--color-border) bg-[color-mix(in_srgb,var(--color-surface-strong)_50%,transparent)] px-3 py-2.5 text-sm text-(--color-text-main) outline-none transition placeholder:text-(--color-text-muted) focus:border-[color-mix(in_srgb,var(--color-brand)_40%,var(--color-border))]";

export function FormField({
  label,
  children,
  required,
}: {
  label: string;
  children: ReactNode;
  required?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold uppercase tracking-[0.12em] text-(--color-text-muted)">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputCls} ${props.className ?? ""}`} />;
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`${inputCls} resize-none ${props.className ?? ""}`}
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className={`${inputCls} ${props.className ?? ""}`} />
  );
}
