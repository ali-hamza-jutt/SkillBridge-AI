"use client";

import { KeyboardEvent, useMemo } from "react";

type SkillSuggestionInputProps = {
  label: string;
  inputId: string;
  value: string;
  onValueChange: (value: string) => void;
  selectedSkills: string[];
  suggestions: Array<string | { name?: unknown }>;
  onAddSkill: (skill: string) => void;
  onRemoveSkill: (skill: string) => void;
  placeholder: string;
  disabled?: boolean;
  suggestionLimit?: number;
  noMatchesText?: string;
};

const inputClassName =
  "mt-1 w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm text-[var(--color-text-main)] outline-none transition placeholder:text-[color-mix(in_srgb,var(--color-text-muted)_86%,transparent)] focus:border-[color-mix(in_srgb,var(--color-brand)_58%,var(--color-border))] focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-brand-soft)_75%,transparent)]";
const labelClassName = "text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]";

const normalizeSuggestions = (suggestions: Array<string | { name?: unknown }>) => {
  const names = suggestions
    .map((item) => {
      if (typeof item === "string") {
        return item.trim();
      }

      if (!item || typeof item !== "object") {
        return "";
      }

      const value = item.name;
      return typeof value === "string" ? value.trim() : "";
    })
    .filter(Boolean);

  return [...new Set(names)];
};

const filterSuggestions = (allSkills: string[], selectedSkills: string[], input: string) => {
  const query = input.trim().toLowerCase();
  const selected = new Set(selectedSkills.map((skill) => skill.toLowerCase()));

  return allSkills.filter(
    (skill) => !selected.has(skill.toLowerCase()) && (query.length === 0 || skill.toLowerCase().includes(query)),
  );
};

const pickMatchingSuggestion = (input: string, suggestions: string[]) => {
  const query = input.trim().toLowerCase();
  if (!query) {
    return undefined;
  }

  return suggestions.find((skill) => skill.toLowerCase() === query) ?? suggestions[0];
};

export default function SkillSuggestionInput({
  label,
  inputId,
  value,
  onValueChange,
  selectedSkills,
  suggestions,
  onAddSkill,
  onRemoveSkill,
  placeholder,
  disabled,
  suggestionLimit = 20,
  noMatchesText = "No matching skills found.",
}: SkillSuggestionInputProps) {
  const normalizedSuggestions = useMemo(() => normalizeSuggestions(suggestions), [suggestions]);
  const filteredSuggestions = useMemo(
    () => filterSuggestions(normalizedSuggestions, selectedSkills, value),
    [normalizedSuggestions, selectedSkills, value],
  );

  const addMatchingSuggestion = () => {
    const skillToAdd = pickMatchingSuggestion(value, filteredSuggestions);

    if (skillToAdd) {
      onAddSkill(skillToAdd);
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    addMatchingSuggestion();
  };

  const hasVisibleSuggestions = value.trim().length > 0 && filteredSuggestions.length > 0;

  return (
    <div>
      <label className={labelClassName} htmlFor={inputId}>
        {label}
      </label>
      <input
        id={inputId}
        className={inputClassName}
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        disabled={disabled}
      />

      {hasVisibleSuggestions ? (
        <div className="mt-2 flex max-h-40 flex-wrap gap-2 overflow-auto">
          {filteredSuggestions.slice(0, suggestionLimit).map((skill) => (
            <button
              key={skill}
              type="button"
              className="rounded-full border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface)_88%,transparent)] px-3 py-1 text-xs font-semibold text-[var(--color-text-main)]"
              onClick={() => onAddSkill(skill)}
            >
              {skill}
            </button>
          ))}
        </div>
      ) : null}

      {value.trim().length > 0 && filteredSuggestions.length === 0 ? (
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">{noMatchesText}</p>
      ) : null}

      {selectedSkills.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {selectedSkills.map((skill) => (
            <span
              key={skill}
              className="inline-flex items-center gap-1 rounded-full border border-[color-mix(in_srgb,var(--color-brand)_24%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-brand-soft)_68%,var(--color-surface))] px-2.5 py-1 text-xs font-semibold text-[color-mix(in_srgb,var(--color-brand-strong)_88%,var(--color-text-main))]"
            >
              {skill}
              <button
                type="button"
                className="rounded-full px-1 text-[var(--color-brand-strong)]"
                onClick={() => onRemoveSkill(skill)}
                aria-label={`Remove ${skill}`}
              >
                x
              </button>
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}