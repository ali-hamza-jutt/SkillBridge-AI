"use client";

import { useState } from "react";
import { Pencil, Trash2, Building2 } from "lucide-react";
import SectionCard, { FormField, Input, Textarea, Select } from "./section-card";
import type { ExperienceEntry, UserProfile } from "@/lib/types/profile";

function monthLabel(ym: string) {
  if (!ym) return "";
  const [y, m] = ym.split("-");
  return new Date(Number(y), Number(m) - 1).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

const MONTHS = ["01","02","03","04","05","06","07","08","09","10","11","12"];
const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const YEARS = Array.from({ length: 40 }, (_, i) => String(new Date().getFullYear() - i));

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

const emptyEntry = (): ExperienceEntry => ({
  company: "", jobTitle: "", startDate: "", endDate: "", current: false, description: "",
});

function EntryForm({
  entry,
  onSave,
  onCancel,
}: {
  entry: ExperienceEntry;
  onSave: (e: ExperienceEntry) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<ExperienceEntry>({ ...entry });
  const set = (k: keyof ExperienceEntry, v: unknown) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <div className="grid gap-4 rounded-xl border border-(--color-border) bg-[color-mix(in_srgb,var(--color-surface-strong)_40%,transparent)] p-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Job Title" required><Input value={form.jobTitle} onChange={(e) => set("jobTitle", e.target.value)} placeholder="e.g. Senior Developer" /></FormField>
        <FormField label="Company" required><Input value={form.company} onChange={(e) => set("company", e.target.value)} placeholder="e.g. Acme Corp" /></FormField>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <DateSelect label="Start Date" value={form.startDate} onChange={(v) => set("startDate", v)} />
        {!form.current && <DateSelect label="End Date" value={form.endDate ?? ""} onChange={(v) => set("endDate", v)} />}
      </div>
      <label className="flex cursor-pointer items-center gap-2 text-sm">
        <input type="checkbox" checked={form.current} onChange={(e) => { set("current", e.target.checked); if (e.target.checked) set("endDate", ""); }} className="h-4 w-4 rounded border-(--color-border) accent-(--color-brand)" />
        <span className="text-(--color-text-main)">I currently work here</span>
      </label>
      <FormField label="Description">
        <Textarea value={form.description ?? ""} onChange={(e) => set("description", e.target.value)} rows={3} placeholder="Describe your responsibilities and achievements…" />
      </FormField>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-lg border border-(--color-border) px-4 py-2 text-sm font-semibold text-(--color-text-muted) transition hover:bg-[color-mix(in_srgb,var(--color-border)_30%,transparent)]">Cancel</button>
        <button type="button" onClick={() => onSave(form)} disabled={!form.jobTitle || !form.company || !form.startDate} className="rounded-lg bg-[linear-gradient(135deg,var(--color-brand),var(--color-brand-strong))] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">Save</button>
      </div>
    </div>
  );
}

type Props = {
  profile: UserProfile;
  onSave: (experience: ExperienceEntry[]) => Promise<void>;
};

export default function ExperienceSection({ profile, onSave }: Props) {
  const [entries, setEntries] = useState<ExperienceEntry[]>(profile.experience ?? []);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const persist = async (next: ExperienceEntry[]) => {
    setSaving(true);
    try { await onSave(next); setEntries(next); } finally { setSaving(false); }
  };

  const handleAdd = async (entry: ExperienceEntry) => {
    const next = [{ ...entry, _id: Date.now().toString() }, ...entries];
    await persist(next);
    setAdding(false);
  };

  const handleEdit = async (entry: ExperienceEntry) => {
    const next = entries.map((e) => (e._id === entry._id ? entry : e));
    await persist(next);
    setEditingId(null);
  };

  const handleDelete = async (id: string) => {
    const next = entries.filter((e) => e._id !== id);
    await persist(next);
  };

  return (
    <SectionCard title="Experience" saving={saving} onAdd={() => setAdding(true)} addLabel="Add Experience">
      <div className="flex flex-col gap-4">
        {adding && <EntryForm entry={emptyEntry()} onSave={handleAdd} onCancel={() => setAdding(false)} />}

        {entries.length === 0 && !adding && (
          <p className="text-sm italic text-(--color-text-muted)">No experience added yet.</p>
        )}

        {entries.map((entry) =>
          editingId === entry._id ? (
            <EntryForm key={entry._id} entry={entry} onSave={handleEdit} onCancel={() => setEditingId(null)} />
          ) : (
            <div key={entry._id} className="flex gap-3">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--color-brand-soft)_60%,var(--color-surface))]">
                <Building2 className="h-4 w-4 text-(--color-brand-strong)" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-(--color-text-main)">{entry.jobTitle}</p>
                    <p className="text-sm text-(--color-text-muted)">{entry.company}</p>
                    <p className="mt-0.5 text-xs text-(--color-text-muted)">
                      {monthLabel(entry.startDate)} – {entry.current ? "Present" : monthLabel(entry.endDate ?? "")}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button type="button" onClick={() => setEditingId(entry._id ?? null)} className="flex h-7 w-7 items-center justify-center rounded-lg text-(--color-text-muted) hover:bg-[color-mix(in_srgb,var(--color-border)_40%,transparent)] hover:text-(--color-text-main)"><Pencil className="h-3.5 w-3.5" /></button>
                    <button type="button" onClick={() => entry._id && handleDelete(entry._id)} className="flex h-7 w-7 items-center justify-center rounded-lg text-(--color-text-muted) hover:bg-red-50 hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
                {entry.description && <p className="mt-1.5 whitespace-pre-wrap text-sm leading-6 text-(--color-text-muted)">{entry.description}</p>}
              </div>
            </div>
          )
        )}
      </div>
    </SectionCard>
  );
}
