export type ConversationType = "PRE_HIRE" | "CONTRACT";
export type ConversationStatus = "ACTIVE" | "ARCHIVED";
export type ChatMessageType = "TEXT" | "SYSTEM";
export type ChatMessageStatus = "sent" | "delivered" | "read";
export type AttachmentType = "IMAGE" | "VIDEO" | "DOCUMENT";

export type MessageAttachment = {
  url: string;
  publicId: string;
  name: string;
  mimeType: string;
  type: AttachmentType;
  size?: number;
  thumbnailUrl?: string;
};

export type ConversationSummary = {
  conversationId: string;
  id: string;
  type: ConversationType;
  status: ConversationStatus;
  taskId: string;
  bidId: string;
  taskTitle: string;
  taskStatus: string;
  clientId: string;
  clientName: string;
  freelancerId: string;
  freelancerName: string;
  otherUserId: string;
  otherUserName: string;
  otherUserAvatarUrl: string | null;
  otherUserOnline?: boolean;
  otherUserRole: "HIRER" | "FREELANCER";
  bidAmount: number;
  lastMessageText: string | null;
  lastAttachmentType: AttachmentType | null;
  lastMessageAt: string | null;
  unreadCount?: number;
  hiredAt: string | null;
  archivedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type ChatMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  body: string;
  messageType: ChatMessageType;
  status?: ChatMessageStatus;
  attachments?: MessageAttachment[];
  createdAt: string | null;
  updatedAt: string | null;
};

export type ChatMessagePage = {
  items: ChatMessage[];
  nextCursor: string | null;
  hasMore: boolean;
};

export type MeetingType = "INSTANT" | "SCHEDULED";
export type MeetingStatus = "SCHEDULED" | "STARTED" | "ENDED" | "CANCELLED";

export type Meeting = {
  id: string;
  conversationId: string;
  hostUserId: string;
  type: MeetingType;
  status: MeetingStatus;
  topic: string;
  startTimeUtc: string;
  endTimeUtc: string;
  durationMinutes: number;
  timezone: string;
  joinUrl: string;
  startUrl?: string;
};

export type MeetingConflict =
  | { conflict: true; startTimeUtc: string; endTimeUtc: string }
  | { conflict: false };
