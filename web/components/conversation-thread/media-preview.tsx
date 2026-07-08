"use client";

import Image from "next/image";
import { Loader2 } from "lucide-react";
import type { MessageAttachment } from "@/lib/types/chat";
import { normalizeAttachmentUrl } from "@/lib/utils/formatting";
import { inferAttachmentType } from "@/lib/utils/chatAttachmentType";

export default function MediaPreview({
  attachment,
  optimistic = false,
  onOpen,
}: {
  attachment: MessageAttachment;
  optimistic?: boolean;
  onOpen?: (item: { url: string; type: "IMAGE" | "VIDEO"; name?: string }) => void;
}) {
  const url = normalizeAttachmentUrl(attachment.url);
  const isLocalPreview = url.startsWith("blob:");
  const attachmentType = inferAttachmentType(attachment);

  if (!url.startsWith("http") && !isLocalPreview) return null;

  if (attachmentType === "IMAGE") {
    const displayUrl = optimistic || isLocalPreview ? url : (attachment.thumbnailUrl ?? url);

    if (optimistic || isLocalPreview) {
      return (
        <button
          type="button"
          onClick={() => onOpen?.({ url, type: "IMAGE", name: attachment.name })}
          className="relative overflow-hidden rounded-xl text-left"
          style={{ width: "min(380px, 100%)", aspectRatio: "4 / 3" }}
        >
          <Image
            src={displayUrl}
            alt={attachment.name}
            width={380}
            height={285}
            unoptimized
            sizes="380px"
            className="h-full w-full rounded-xl object-cover blur-md scale-105"
          />
          <div className="absolute left-2 top-2 inline-flex items-center gap-1.5 rounded-full bg-black/60 px-2 py-1 text-[11px] font-medium text-white shadow-sm backdrop-blur-sm">
            <Loader2 className="h-3 w-3 animate-spin" />
            Sending...
          </div>
        </button>
      );
    }

    return (
      <button
        type="button"
        onClick={() => onOpen?.({ url, type: "IMAGE", name: attachment.name })}
        className="block text-left"
      >
        <Image
          src={displayUrl}
          alt={attachment.name}
          width={380}
          height={285}
          unoptimized
          sizes="380px"
          className="max-h-80 w-auto rounded-xl object-contain"
          style={{ maxWidth: 380 }}
        />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onOpen?.({ url, type: "VIDEO", name: attachment.name })}
      className="relative block overflow-hidden rounded-xl text-left"
      aria-label={`Open ${attachment.name}`}
      style={{ width: "min(380px, 100%)", aspectRatio: "4 / 3" }}
    >
      <video
        src={`${url}#t=0.1`}
        muted
        playsInline
        className="h-full w-full rounded-xl object-cover"
        preload="metadata"
      />
      <div className="absolute inset-0 bg-black/10" />
      <div className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-1 text-[11px] font-medium text-white shadow-sm backdrop-blur-sm">
        Tap to preview
      </div>
    </button>
  );
}
