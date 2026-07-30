"use client";

import { useMemo } from "react";
import { ChevronDown } from "lucide-react";
import { ALL_EMOJIS, EMOJI_CATEGORIES } from "@/lib/utils/emojis";

type EmojiPickerProps = {
  open: boolean;
  onSelect: (emoji: string) => void;
  onClose: () => void;
};

export default function EmojiPicker({ open, onSelect, onClose }: EmojiPickerProps) {
  const emojiCount = useMemo(() => ALL_EMOJIS.length, []);

  if (!open) return null;

  return (
    <div className="absolute bottom-[calc(100%+0.65rem)] left-0 z-30 w-[min(21rem,calc(100vw-2rem))] rounded-[var(--radius-lg)] border border-(--color-border) bg-(--color-surface) p-3 shadow-(--shadow-panel)">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-(--color-text-main)">Emoji</p>
          <p className="text-[11px] text-(--color-text-muted)">{emojiCount} available</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-8 items-center gap-1 rounded-[var(--radius-sm)] px-2 text-xs font-semibold text-(--color-text-secondary) transition hover:bg-(--color-hover)"
        >
          <ChevronDown className="h-3.5 w-3.5" />
          Close
        </button>
      </div>

      <div className="ui-scrollbar max-h-72 space-y-3 overflow-y-auto pr-1">
        {EMOJI_CATEGORIES.map((category) => (
          <div key={category.label}>
            <div className="mb-1 flex items-center justify-between">
              <h3 className="text-[11px] font-bold uppercase tracking-[0.1em] text-(--color-text-muted)">
                {category.label}
              </h3>
              <span className="text-[10px] text-(--color-text-muted)">{category.emojis.length}</span>
            </div>
            <div className="grid grid-cols-8 gap-1">
              {category.emojis.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => onSelect(emoji)}
                  className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)] text-lg transition hover:bg-(--color-hover)"
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
