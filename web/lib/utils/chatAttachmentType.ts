import type { MessageAttachment } from "@/lib/types/chat";
import { normalizeAttachmentUrl } from "@/lib/utils/formatting";

export function inferAttachmentType(attachment: MessageAttachment): "IMAGE" | "VIDEO" | "DOCUMENT" {
  if (attachment.type === "IMAGE" || attachment.type === "VIDEO" || attachment.type === "DOCUMENT") {
    return attachment.type;
  }

  const mimeType = attachment.mimeType.toLowerCase();
  const name = attachment.name.toLowerCase();
  const url = normalizeAttachmentUrl(attachment.url).toLowerCase();

  if (
    mimeType.startsWith("image/") ||
    /\.(png|jpe?g|gif|webp|bmp|svg|heic)(\?|#|$)/.test(name) ||
    /\.(png|jpe?g|gif|webp|bmp|svg|heic)(\?|#|$)/.test(url)
  ) {
    return "IMAGE";
  }

  if (
    mimeType.startsWith("video/") ||
    /\.(mp4|mov|avi|mkv|webm|m4v)(\?|#|$)/.test(name) ||
    /\.(mp4|mov|avi|mkv|webm|m4v)(\?|#|$)/.test(url)
  ) {
    return "VIDEO";
  }

  return "DOCUMENT";
}
