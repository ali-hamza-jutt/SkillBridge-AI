import type { TaskBid } from "../types/proposal";

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
