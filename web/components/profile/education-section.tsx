"use client";

import { useState } from "react";
import { Pencil, Trash2, GraduationCap } from "lucide-react";
import SectionCard, { FormField, Input, Select } from "./section-card";
import type { EducationEntry, UserProfile } from "@/lib/types/profile";

function monthLabel(ym: string) {
  if (!ym) return "";
  const [y, m] = ym.split("-");
  return new Date(Number(y), Number(m) - 1).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

const MONTHS = ["01","02","03","04","05","06","07","08","09","10","11","12"];
const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const YEARS = Array.from({ length: 50 }, (_, i) => String(new Date().getFullYear() + 5 - i));

function DateSelect({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  const [year, month] = (value ?? "").split("-");
  return (
    <div>
      <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-(--color-text-muted)">{label}</span>
      <div className="flex gap-2">
        <Select value={month ?? ""} onChange={(e) => onChange(`${year || new Date().getFullYear()}-${e.target.value}`)} className="flex-1">
          <option value="">Month</option>
          {MONTHS.map((m, i) => <option key={m} value={m}>{MONTH_NAMES[i]}</option>)}
        </Select>
        <Select value={year ?? ""} onChange={(e) => onChange(`${e.target.value}-${month || "01"}`)} className="flex-1">
          <option value="">Year</option>
          {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
        </Select>
      </div>
    </div>
  );
}

const emptyEntry = (): EducationEntry => ({
  institution: "", degree: "", field: "", startDate: "", endDate: "", current: false,
});

function EntryForm({ entry, onSave, onCancel }: { entry: EducationEntry; onSave: (e: EducationEntry) => void; onCancel: () => void }) {
  const [form, setForm] = useState<EducationEntry>({ ...entry });
  const set = (k: keyof EducationEntry, v: unknown) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <div className="grid gap-4 rounded-xl border border-(--color-border) bg-[color-mix(in_srgb,var(--color-surface-strong)_40%,transparent)] p-4">
      <FormField label="Institution" required><Input value={form.institution} onChange={(e) => set("institution", e.target.value)} placeholder="e.g. MIT" /></FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Degree" required><Input value={form.degree} onChange={(e) => set("degree", e.target.value)} placeholder="e.g. Bachelor's" /></FormField>
        <FormField label="Field of Study" required><Input value={form.field} onChange={(e) => set("field", e.target.value)} placeholder="e.g. Computer Science" /></FormField>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <DateSelect label="Start Date" value={form.startDate} onChange={(v) => set("startDate", v)} />
        {!form.current && <DateSelect label="End Date" value={form.endDate ?? ""} onChange={(v) => set("endDate", v)} />}
      </div>
      <label className="flex cursor-pointer items-center gap-2 text-sm">
        <input type="checkbox" checked={form.current} onChange={(e) => { set("current", e.target.checked); if (e.target.checked) set("endDate", ""); }} className="h-4 w-4 rounded border-(--color-border) accent-(--color-brand)" />
        <span className="text-(--color-text-main)">Currently studying here</span>
      </label>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-lg border border-(--color-border) px-4 py-2 text-sm font-semibold text-(--color-text-muted) transition hover:bg-[color-mix(in_srgb,var(--color-border)_30%,transparent)]">Cancel</button>
        <button type="button" onClick={() => onSave(form)} disabled={!form.institution || !form.degree || !form.field || !form.startDate} className="rounded-lg bg-[linear-gradient(135deg,var(--color-brand),var(--color-brand-strong))] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">Save</button>
      </div>
    </div>
  );
}

type Props = { profile: UserProfile; onSave: (education: EducationEntry[]) => Promise<void> };

export default function EducationSection({ profile, onSave }: Props) {
  const [entries, setEntries] = useState<EducationEntry[]>(profile.education ?? []);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const persist = async (next: EducationEntry[]) => {
    setSaving(true);
    try { await onSave(next); setEntries(next); } finally { setSaving(false); }
  };

  return (
    <SectionCard title="Education" saving={saving} onAdd={() => setAdding(true)} addLabel="Add Education">
      <div className="flex flex-col gap-4">
        {adding && <EntryForm entry={emptyEntry()} onSave={async (e) => { await persist([{ ...e, _id: Date.now().toString() }, ...entries]); setAdding(false); }} onCancel={() => setAdding(false)} />}

        {entries.length === 0 && !adding && (
          <p className="text-sm italic text-(--color-text-muted)">No education added yet.</p>
        )}

        {entries.map((entry) =>
          editingId === entry._id ? (
            <EntryForm key={entry._id} entry={entry} onSave={async (e) => { await persist(entries.map((x) => (x._id === e._id ? e : x))); setEditingId(null); }} onCancel={() => setEditingId(null)} />
          ) : (
            <div key={entry._id} className="flex gap-3">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--color-accent-soft)_60%,var(--color-surface))]">
                <GraduationCap className="h-4 w-4 text-(--color-brand-strong)" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-(--color-text-main)">{entry.degree} · {entry.field}</p>
                    <p className="text-sm text-(--color-text-muted)">{entry.institution}</p>
                    <p className="mt-0.5 text-xs text-(--color-text-muted)">
                      {monthLabel(entry.startDate)} – {entry.current ? "Present" : monthLabel(entry.endDate ?? "")}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button type="button" onClick={() => setEditingId(entry._id ?? null)} className="flex h-7 w-7 items-center justify-center rounded-lg text-(--color-text-muted) hover:bg-[color-mix(in_srgb,var(--color-border)_40%,transparent)] hover:text-(--color-text-main)"><Pencil className="h-3.5 w-3.5" /></button>
                    <button type="button" onClick={async () => { if (entry._id) await persist(entries.filter((e) => e._id !== entry._id)); }} className="flex h-7 w-7 items-center justify-center rounded-lg text-(--color-text-muted) hover:bg-red-50 hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
              </div>
            </div>
          )
        )}
      </div>
    </SectionCard>
  );
}
