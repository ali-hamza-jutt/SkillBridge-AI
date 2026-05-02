import type { TaskBid } from "../types/proposal";

export type AttachmentKind = "image" | "video" | "pdf" | "doc" | "file";

export type AttachmentDisplayItem = {
  url: string;
  fileName: string;
  mimeType?: string;
  sizeMb?: number;
  kind: AttachmentKind;
};

export const getAttachmentUrls = (attachments?: TaskBid["attachments"]): string[] => {
  if (!attachments?.length) {
    return [];
  }

  return attachments
    .map((attachment) => {
      if (typeof attachment === "string") {
        return attachment;
      }
      return attachment?.url;
    })
    .filter((url): url is string => Boolean(url));
};

const getFileNameFromUrl = (url: string): string => {
  try {
    const parsed = new URL(url);
    const fromPath = parsed.pathname.split("/").filter(Boolean).pop();
    if (fromPath) {
      return decodeURIComponent(fromPath);
    }
  } catch {
    const fallback = url.split("/").filter(Boolean).pop();
    if (fallback) {
      return decodeURIComponent(fallback);
    }
  }
  return "attachment";
};

const getAttachmentKind = (fileName: string, mimeType?: string): AttachmentKind => {
  const normalizedType = (mimeType ?? "").toLowerCase();
  const extension = fileName.includes(".") ? fileName.split(".").pop()?.toLowerCase() ?? "" : "";

  if (
    normalizedType.startsWith("image/") ||
    ["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg", "heic"].includes(extension)
  ) {
    return "image";
  }

  if (
    normalizedType.startsWith("video/") ||
    ["mp4", "mov", "avi", "mkv", "webm", "m4v"].includes(extension)
  ) {
    return "video";
  }

  if (normalizedType.includes("pdf") || extension === "pdf") {
    return "pdf";
  }

  if (
    normalizedType.includes("word") ||
    ["doc", "docx", "rtf", "odt"].includes(extension)
  ) {
    return "doc";
  }

  return "file";
};

export const getAttachmentDisplayItems = (attachments?: TaskBid["attachments"]): AttachmentDisplayItem[] => {
  if (!attachments?.length) {
    return [];
  }

  return attachments
    .map((attachment) => {
      if (typeof attachment === "string") {
        const fileName = getFileNameFromUrl(attachment);
        return {
          url: attachment,
          fileName,
          kind: getAttachmentKind(fileName),
        } satisfies AttachmentDisplayItem;
      }

      if (!attachment?.url) {
        return null;
      }

      const fileName = attachment.fileName?.trim() || getFileNameFromUrl(attachment.url);
      return {
        url: attachment.url,
        fileName,
        mimeType: attachment.type,
        sizeMb: attachment.sizeMb,
        kind: getAttachmentKind(fileName, attachment.type),
      } satisfies AttachmentDisplayItem;
    })
    .filter((item): item is AttachmentDisplayItem => Boolean(item));
};

export function fileTypeMeta(mimeType: string): { label: string; bg: string } {
  if (mimeType === "application/pdf")
    return { label: "PDF", bg: "bg-red-500" };
  if (mimeType.includes("word") || mimeType.includes("doc"))
    return { label: "DOC", bg: "bg-blue-600" };
  if (mimeType.includes("powerpoint") || mimeType.includes("ppt") || mimeType.includes("presentation"))
    return { label: "PPT", bg: "bg-orange-500" };
  if (mimeType.includes("excel") || mimeType.includes("xls") || mimeType.includes("spreadsheet") || mimeType === "text/csv")
    return { label: "XLS", bg: "bg-emerald-600" };
  if (mimeType.includes("zip") || mimeType.includes("rar") || mimeType.includes("7z"))
    return { label: "ZIP", bg: "bg-yellow-600" };
  return { label: "FILE", bg: "bg-slate-500" };
}

export function formatFileSize(bytes?: number): string | null {
  if (!bytes) return null;
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

export const money = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);

export const formatBidDate = (value?: string) => {
  if (!value) {
    return "Recently";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "Recently";
  }
  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};
