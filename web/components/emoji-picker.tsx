"use client";

import { useMemo } from "react";
import { ChevronDown } from "lucide-react";
import { EMOJI_CATEGORIES, ALL_EMOJIS } from "@/lib/utils/emojis";

type EmojiPickerProps = {
  open: boolean;
  onSelect: (emoji: string) => void;
  onClose: () => void;
};

export default function EmojiPicker({ open, onSelect, onClose }: EmojiPickerProps) {
  const emojiCount = useMemo(() => ALL_EMOJIS.length, []);

  if (!open) return null;

  return (
    <div className="absolute bottom-[calc(100%+0.5rem)] left-0 z-20 w-[21rem] rounded-2xl border border-[color-mix(in_srgb,var(--color-border)_85%,transparent)] bg-(--color-surface) p-3 shadow-[0_18px_36px_-24px_rgba(15,23,42,0.28)]">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-(--color-text-muted)">Emoji</p>
          <p className="text-[11px] text-(--color-text-muted)">{emojiCount} available</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold text-(--color-text-muted) transition hover:bg-[color-mix(in_srgb,var(--color-border)_24%,transparent)] hover:text-(--color-text-main)"
        >
          <ChevronDown className="h-3.5 w-3.5" />
          Close
        </button>
      </div>

      <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
        {EMOJI_CATEGORIES.map((category) => (
          <div key={category.label}>
            <div className="mb-1 flex items-center justify-between">
              <h3 className="text-[11px] font-bold uppercase tracking-[0.12em] text-(--color-text-muted)">{category.label}</h3>
              <span className="text-[10px] text-(--color-text-muted)">{category.emojis.length}</span>
            </div>
            <div className="grid grid-cols-8 gap-1">
              {category.emojis.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => onSelect(emoji)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-lg transition hover:bg-[color-mix(in_srgb,var(--color-border)_35%,transparent)]"
                  aria-label={`Insert ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}