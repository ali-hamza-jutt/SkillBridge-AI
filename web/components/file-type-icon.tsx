import { File as FileIcon, FileText, Image as ImageIcon, Video as VideoIcon } from "lucide-react";
import type { AttachmentKind } from "@/lib/utils/formatting";

type FileTypeIconProps = {
  kind: AttachmentKind;
  className?: string;
};

const iconColorClass = (kind: AttachmentKind): string => {
  switch (kind) {
    case "image":
      return "text-[var(--color-brand-strong)]";
    case "video":
      return "text-[color-mix(in_srgb,var(--color-text-main)_92%,#7c5a14)]";
    case "pdf":
      return "text-[color-mix(in_srgb,#b91c1c_82%,var(--color-text-main))]";
    case "doc":
      return "text-[color-mix(in_srgb,#1d4ed8_82%,var(--color-text-main))]";
    default:
      return "text-[var(--color-text-main)]";
  }
};


export default function FileTypeIcon({ kind, className = "h-4 w-4" }: FileTypeIconProps) {
  const colorClass = iconColorClass(kind);
  const combined = `${className} ${colorClass}`;
  switch (kind) {
    case "image":
      return <ImageIcon className={combined} aria-hidden="true" />;
    case "video":
      return <VideoIcon className={combined} aria-hidden="true" />;
    case "pdf":
    case "doc":
      return <FileText className={combined} aria-hidden="true" />;
    default:
      return <FileIcon className={combined} aria-hidden="true" />;
  }
}
