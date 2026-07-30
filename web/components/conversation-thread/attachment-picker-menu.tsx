"use client";

import { FileText, ImageIcon, Video } from "lucide-react";

export type AttachmentPickerKind = "IMAGE" | "VIDEO" | "DOCUMENT";

export const ATTACHMENT_ACCEPT: Record<AttachmentPickerKind, string> = {
  IMAGE: "image/*",
  VIDEO: "video/*",
  DOCUMENT: ".pdf,.doc,.docx,.txt,.xlsx,.xls,.pptx,.ppt,.csv,.zip,.rar,.7z",
};

const OPTIONS = [
  {
    kind: "IMAGE" as const,
    label: "Photo",
    description: "JPG, PNG, WebP or GIF",
    icon: ImageIcon,
  },
  {
    kind: "VIDEO" as const,
    label: "Video",
    description: "Video up to 100 MB",
    icon: Video,
  },
  {
    kind: "DOCUMENT" as const,
    label: "Document",
    description: "PDF, Office, text or archive",
    icon: FileText,
  },
];

export default function AttachmentPickerMenu({
  open,
  onSelect,
}: {
  open: boolean;
  onSelect: (kind: AttachmentPickerKind) => void;
}) {
  if (!open) return null;

  return (
    <div
      role="menu"
      aria-label="Choose attachment type"
      className="absolute bottom-[calc(100%+0.625rem)] left-0 z-30 w-64 rounded-[var(--radius-md)] border border-(--color-border) bg-(--color-surface) p-1.5 shadow-(--shadow-panel)"
    >
      {OPTIONS.map(({ kind, label, description, icon: Icon }) => (
        <button
          key={kind}
          type="button"
          role="menuitem"
          onClick={() => onSelect(kind)}
          className="flex w-full items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2.5 text-left transition hover:bg-(--color-hover)"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-(--color-brand-soft) text-(--color-brand)">
            <Icon className="h-4 w-4" />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-(--color-text-main)">
              {label}
            </span>
            <span className="block truncate text-[11px] text-(--color-text-muted)">
              {description}
            </span>
          </span>
        </button>
      ))}
    </div>
  );
}
