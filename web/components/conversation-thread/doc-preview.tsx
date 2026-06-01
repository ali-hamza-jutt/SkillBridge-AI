"use client";

import { FileText } from "lucide-react";
import type { MessageAttachment } from "@/lib/types/chat";
import { fileTypeMeta, formatFileSize, normalizeAttachmentUrl } from "@/lib/utils/formatting";

export default function DocPreview({ attachment }: { attachment: MessageAttachment }) {
  const meta = fileTypeMeta(attachment.mimeType);
  const size = formatFileSize(attachment.size);
  const url = normalizeAttachmentUrl(attachment.url);

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="group inline-flex items-center gap-3 rounded-xl border border-(--color-border) bg-[color-mix(in_srgb,var(--color-surface)_80%,transparent)] px-3 py-2.5 no-underline transition hover:border-[color-mix(in_srgb,var(--color-brand)_40%,var(--color-border))]"
    >
      <div className={`flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg ${meta.bg}`}>
        <FileText className="h-4 w-4 text-white/80" />
        <span className="text-[9px] font-black tracking-wider text-white">{meta.label}</span>
      </div>
      <div className="flex min-w-0 flex-col">
        <span className="max-w-48 truncate text-sm font-semibold text-(--color-text-main) group-hover:underline">{attachment.name}</span>
        {size && <span className="text-xs text-(--color-text-muted)">{size}</span>}
      </div>
    </a>
  );
}
