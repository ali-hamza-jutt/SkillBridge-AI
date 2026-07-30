"use client";

import Image from "next/image";
import { FileText, X } from "lucide-react";
import { fileTypeMeta, formatFileSize } from "@/lib/utils/formatting";

type Props = {
  file: File;
  preview: string | null;
  error: string | null;
  onRemove: () => void;
  onOpenMedia: () => void;
};

export default function PendingAttachmentPreview({
  file,
  preview,
  error,
  onRemove,
  onOpenMedia,
}: Props) {
  const isImage = file.type.startsWith("image/");
  const isVideo = file.type.startsWith("video/");
  const size = formatFileSize(file.size);

  if (preview && (isImage || isVideo)) {
    return (
      <div
        className={`group relative h-32 w-44 shrink-0 overflow-hidden rounded-[var(--radius-md)] border bg-(--color-surface-tint) shadow-(--shadow-sm) ${
          error
            ? "border-[color-mix(in_srgb,var(--color-danger)_40%,var(--color-border))]"
            : "border-(--color-border)"
        }`}
      >
        <button
          type="button"
          onClick={onOpenMedia}
          className="block h-full w-full text-left"
        >
          {isImage ? (
            <Image
              src={preview}
              alt={file.name}
              fill
              unoptimized
              sizes="176px"
              className="object-cover transition duration-200 group-hover:scale-[1.02]"
            />
          ) : (
            <video
              src={preview}
              muted
              playsInline
              preload="metadata"
              className="h-full w-full object-cover"
            />
          )}
          <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-3 pb-2 pt-8 text-white">
            <span className="block truncate text-xs font-semibold">
              {file.name}
            </span>
            <span className="block text-[10px] text-white/75">
              {error ?? `${size ?? "Media"} · Ready to send`}
            </span>
          </span>
        </button>
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${file.name}`}
          title="Remove attachment"
          className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-black/65 text-white shadow-sm transition hover:bg-black/80"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  const meta = fileTypeMeta(file.type);
  return (
    <div
      className={`relative flex min-h-20 w-72 max-w-full shrink-0 items-center gap-3 rounded-[var(--radius-md)] border bg-(--color-surface-tint) p-3 pr-11 shadow-(--shadow-sm) ${
        error
          ? "border-[color-mix(in_srgb,var(--color-danger)_40%,var(--color-border))]"
          : "border-(--color-border)"
      }`}
    >
      <span className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-[var(--radius-sm)] bg-(--color-brand-soft) text-(--color-brand)">
        <FileText className="h-4 w-4" />
        <span className="text-[8px] font-extrabold tracking-wide">
          {meta.label}
        </span>
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-(--color-text-main)">
          {file.name}
        </span>
        <span
          className={`mt-0.5 block text-[11px] ${
            error ? "text-(--color-danger)" : "text-(--color-text-muted)"
          }`}
        >
          {error ?? `${size ?? "Document"} · Ready to send`}
        </span>
      </span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${file.name}`}
        title="Remove attachment"
        className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] text-(--color-text-muted) transition hover:bg-(--color-hover) hover:text-(--color-text-main)"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
