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

const iconByKind = (kind: AttachmentKind) => {
  switch (kind) {
    case "image":
      return ImageIcon;
    case "video":
      return VideoIcon;
    case "pdf":
      return FileText;
    case "doc":
      return FileText;
    default:
      return FileIcon;
  }
};

export default function FileTypeIcon({ kind, className = "h-4 w-4" }: FileTypeIconProps) {
  const Icon = iconByKind(kind);
  return <Icon className={`${className} ${iconColorClass(kind)}`} aria-hidden="true" />;
}
