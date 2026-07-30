"use client";

import { FileText } from "lucide-react";
import type { MessageAttachment } from "@/lib/types/chat";
import { fileTypeMeta, formatFileSize, normalizeAttachmentUrl } from "@/lib/utils/formatting";

type DocPreviewProps = {
  attachment: MessageAttachment;
  tone?: "default" | "inverse";
};

export default function DocPreview({ attachment, tone = "default" }: DocPreviewProps) {
  const meta = fileTypeMeta(attachment.mimeType);
  const size = formatFileSize(attachment.size);
  const url = normalizeAttachmentUrl(attachment.url);
  const inverse = tone === "inverse";

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`group inline-flex min-w-0 items-center gap-3 rounded-[var(--radius-sm)] border px-3 py-2.5 no-underline transition ${
        inverse
          ? "border-white/25 bg-white/10 text-white hover:bg-white/15"
          : "border-(--color-border) bg-(--color-surface-tint) text-(--color-text-main) hover:border-[color-mix(in_srgb,var(--color-brand)_35%,var(--color-border))]"
      }`}
    >
      <span
        className={`flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded-[var(--radius-sm)] ${
          inverse ? "bg-white/15 text-white" : "bg-(--color-brand-soft) text-(--color-brand)"
        }`}
      >
        <FileText className="h-4 w-4" />
        <span className="text-[8px] font-extrabold tracking-wide">{meta.label}</span>
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="max-w-48 truncate text-sm font-semibold group-hover:underline">
          {attachment.name}
        </span>
        {size ? (
          <span className={`text-xs ${inverse ? "text-white/70" : "text-(--color-text-muted)"}`}>
            {size}
          </span>
        ) : null}
      </span>
    </a>
  );
}
