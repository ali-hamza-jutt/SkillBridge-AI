export type ConversationType = "PRE_HIRE" | "CONTRACT";
export type ConversationStatus = "ACTIVE" | "ARCHIVED";
export type ChatMessageType = "TEXT" | "SYSTEM";
export type AttachmentType = "IMAGE" | "VIDEO" | "DOCUMENT";

export type MessageAttachment = {
  url: string;
  publicId: string;
  name: string;
  mimeType: string;
  type: AttachmentType;
  size?: number;
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
  otherUserRole: "HIRER" | "FREELANCER";
  bidAmount: number;
  lastMessageText: string | null;
  lastAttachmentType: AttachmentType | null;
  lastMessageAt: string | null;
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
  attachments?: MessageAttachment[];
  createdAt: string | null;
  updatedAt: string | null;
};
