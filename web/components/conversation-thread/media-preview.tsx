"use client";

import Image from "next/image";
import { memo } from "react";
import { Loader2 } from "lucide-react";
import type { MessageAttachment } from "@/lib/types/chat";
import { normalizeAttachmentUrl } from "@/lib/utils/formatting";
import { inferAttachmentType } from "@/lib/utils/chatAttachmentType";
import MediaDownloadButton from "@/components/conversation-thread/media-download-button";

function MediaPreview({
  attachment,
  optimistic = false,
  onOpen,
}: {
  attachment: MessageAttachment;
  optimistic?: boolean;
  onOpen?: (item: {
    url: string;
    type: "IMAGE" | "VIDEO";
    name?: string;
  }) => void;
}) {
  const url = normalizeAttachmentUrl(attachment.url);
  const isLocalPreview = url.startsWith("blob:");
  const attachmentType = inferAttachmentType(attachment);

  if (!url.startsWith("http") && !isLocalPreview) return null;

  if (attachmentType === "IMAGE") {
    const displayUrl =
      optimistic || isLocalPreview ? url : (attachment.thumbnailUrl ?? url);

    return (
      <div
        className="group relative overflow-hidden rounded-[var(--radius-md)]"
        style={{ width: "min(380px, 100%)", aspectRatio: "4 / 3" }}
      >
        <button
          type="button"
          onClick={() =>
            onOpen?.({ url, type: "IMAGE", name: attachment.name })
          }
          className="block h-full w-full text-left"
          aria-label={`Open ${attachment.name}`}
        >
          <Image
            src={displayUrl}
            alt={attachment.name}
            width={380}
            height={285}
            unoptimized
            decoding="async"
            loading={
              optimistic || isLocalPreview || attachment.thumbnailUrl
                ? "eager"
                : "lazy"
            }
            sizes="380px"
            className={`h-full w-full object-cover ${optimistic ? "scale-105 blur-md" : ""}`}
          />
          {optimistic ? (
            <span className="absolute left-2 top-2 inline-flex items-center gap-1.5 rounded-full bg-black/65 px-2 py-1 text-[11px] font-medium text-white shadow-sm backdrop-blur-sm">
              <Loader2 className="h-3 w-3 animate-spin" />
              Sending...
            </span>
          ) : null}
        </button>
        <MediaDownloadButton url={url} fileName={attachment.name} />
      </div>
    );
  }

  return (
    <div
      className="group relative overflow-hidden rounded-[var(--radius-md)]"
      style={{ width: "min(380px, 100%)", aspectRatio: "4 / 3" }}
    >
      <button
        type="button"
        onClick={() => onOpen?.({ url, type: "VIDEO", name: attachment.name })}
        className="block h-full w-full text-left"
        aria-label={`Open ${attachment.name}`}
      >
        <video
          src={`${url}#t=0.1`}
          muted
          playsInline
          className={`h-full w-full object-cover ${optimistic ? "opacity-75" : ""}`}
          preload="metadata"
        />
        <span className="absolute inset-0 bg-black/10" />
        <span className="absolute left-2 top-2 inline-flex items-center gap-1.5 rounded-full bg-black/65 px-2 py-1 text-[11px] font-medium text-white shadow-sm backdrop-blur-sm">
          {optimistic ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
          {optimistic ? "Sending..." : "Open preview"}
        </span>
      </button>
      <MediaDownloadButton url={url} fileName={attachment.name} />
    </div>
  );
}

export default memo(MediaPreview);
