"use client";

import { useState } from "react";
import { Loader2, Check } from "lucide-react";
import SkillSuggestionInput from "@/components/skill-suggestion-input";
import type { UserProfile } from "@/lib/types/profile";

type Props = {
  profile: UserProfile;
  skillSuggestions: Array<{ name?: unknown }>;
  skillFallback: Array<{ name?: unknown }>;
  onSave: (skills: string[]) => Promise<void>;
};

export default function SkillsSection({ profile, skillSuggestions, skillFallback, onSave }: Props) {
  const saved = profile.skills ?? [];
  const [skills, setSkills] = useState<string[]>(saved);
  const [input, setInput] = useState("");
  const [saving, setSaving] = useState(false);

  const isDirty = JSON.stringify(skills) !== JSON.stringify(saved);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(skills);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl border border-[color-mix(in_srgb,var(--color-border)_90%,transparent)] bg-(--color-surface) p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-base font-bold text-(--color-text-main)">Skills</h2>
        {isDirty && (
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex h-8 items-center gap-1.5 rounded-lg bg-[linear-gradient(135deg,var(--color-brand),var(--color-brand-strong))] px-3 text-xs font-semibold text-white disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            Save
          </button>
        )}
      </div>

      <SkillSuggestionInput
        label=""
        inputId="profile-skills"
        value={input}
        onValueChange={setInput}
        selectedSkills={skills}
        suggestions={skillSuggestions}
        fallbackSuggestions={skillFallback}
        onAddSkill={(s) => {
          if (!skills.includes(s)) setSkills((p) => [...p, s]);
          setInput("");
        }}
        onRemoveSkill={(s) => setSkills((p) => p.filter((x) => x !== s))}
        placeholder="Type to search and add a skill…"
        suggestionLimit={20}
      />
    </div>
  );
}
