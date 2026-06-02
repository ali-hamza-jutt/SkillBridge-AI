import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { Task, TaskDocument, TaskStatus } from '../tasks/schemas/task.schema';
import { Bid, BidDocument } from '../bids/schemas/bid.schema';
import {
  Conversation,
  ConversationDocument,
  ConversationStatus,
  ConversationType,
} from './schemas/conversation.schema';
import {
  ChatMessage,
  ChatMessageDocument,
  ChatMessageType,
} from './schemas/message.schema';
import {
  MessageMedia,
  MessageMediaDocument,
  MessageAttachment,
} from './schemas/message-media.schema';
import { ReadReceipt, ReadReceiptDocument } from './schemas/read-receipt.schema';
import { AttachmentDto } from './dto/send-message.dto';
import { ConversationsGateway } from './conversations.gateway';
import { UsersService } from '../users/users.service';
import { UtilityService } from '../common/utility/utility.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CacheService } from '../cache/cache.service';

type ConversationLike = Conversation & {
  _id: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
};

type ConversationViewSource = ConversationLike | (ConversationDocument & { createdAt?: Date; updatedAt?: Date });

type MessageLike = ChatMessage & { _id: Types.ObjectId };
type MessageMediaLike = MessageMedia & { _id: Types.ObjectId };
//type ReadReceiptLike = ReadReceipt & { _id: Types.ObjectId };

const UNREAD_PREFIX = 'conversations:unread';
const PRESENCE_PREFIX = 'conversations:presence';

function encodeMessageCursor(message: MessageLike) {
  return `${message.createdAt?.toISOString() ?? new Date().toISOString()}|${message._id.toString()}`;
}

function decodeMessageCursor(cursor: string) {
  const [createdAt, id] = cursor.split('|');
  if (!createdAt || !id || !Types.ObjectId.isValid(id)) {
    throw new BadRequestException('Invalid message cursor');
  }

  return { createdAt: new Date(createdAt), id: new Types.ObjectId(id) };
}

function dedupeAttachments(attachments: MessageAttachment[] = []) {
  const seen = new Set<string>();
  const out: MessageAttachment[] = [];
  for (const a of attachments) {
    const key = a.publicId ?? a.url ?? a.name ?? JSON.stringify(a);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(a);
  }
  return out;
}

function isMessageAttachment(attachment: unknown): attachment is MessageAttachment {
  if (!attachment || typeof attachment !== 'object') return false;

  const candidate = attachment as Partial<MessageAttachment> & { thumbnailUrl?: unknown };

  return (
    typeof candidate.url === 'string' &&
    typeof candidate.publicId === 'string' &&
    typeof candidate.name === 'string' &&
    typeof candidate.mimeType === 'string' &&
    typeof candidate.type === 'string' &&
    (candidate.size === undefined || typeof candidate.size === 'number') &&
    (candidate.thumbnailUrl === undefined || typeof candidate.thumbnailUrl === 'string')
  );
}

function getLegacyAttachments(message: MessageLike): MessageAttachment[] {
  const rawAttachments = (message as { attachments?: unknown }).attachments;
  if (!Array.isArray(rawAttachments)) return [];
  return rawAttachments.filter(isMessageAttachment);
}

function mapAttachmentDtoToAttachment(attachment: AttachmentDto): MessageAttachment {
  return {
    url: attachment.url,
    publicId: attachment.publicId,
    name: attachment.name,
    mimeType: attachment.mimeType,
    type: attachment.type,
    size: attachment.size,
    thumbnailUrl: attachment.thumbnailUrl,
  };
}

@Injectable()
export class ConversationsService {
  constructor(
    @InjectModel(Conversation.name)
    private conversationModel: Model<ConversationDocument>,
    @InjectModel(ChatMessage.name)
    private messageModel: Model<ChatMessageDocument>,
    @InjectModel(MessageMedia.name)
    private messageMediaModel: Model<MessageMediaDocument>,
    @InjectModel(ReadReceipt.name)
    private readReceiptModel: Model<ReadReceiptDocument>,
    @InjectModel(Task.name)
    private taskModel: Model<TaskDocument>,
    @InjectModel(Bid.name)
    private bidModel: Model<BidDocument>,
    @Inject(forwardRef(() => ConversationsGateway))
    private gateway: ConversationsGateway,
    private readonly usersService: UsersService,
    private readonly utilityService: UtilityService,
    private readonly cacheService: CacheService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private unreadKey(userId: string) {
    return `${UNREAD_PREFIX}:${userId}`;
  }

  private presenceKey(userId: string) {
    return `${PRESENCE_PREFIX}:${userId}`;
  }

  private async getUnreadCount(userId: string, conversationId: string) {
    const raw = await this.cacheService.hGet(this.unreadKey(userId), conversationId);
    return raw ? Number(raw) : 0;
  }

  private async isUserOnline(userId: string) {
    return this.cacheService.exists(this.presenceKey(userId));
  }

  private async getConversationPeers(conversationId: string, userId: string) {
    const conversation = (await this.conversationModel.findById(conversationId).lean()) as ConversationLike | null;
    if (!conversation) return [] as string[];
    return [conversation.clientId, conversation.freelancerId].filter((id) => id !== userId);
  }

  async refreshPresence(userId: string) {
    await this.cacheService.set(this.presenceKey(userId), '1', 30);
  }

  private async getConversationPeersForUser(userId: string) {
    const conversations = await this.conversationModel
      .find({ $or: [{ clientId: userId }, { freelancerId: userId }] })
      .select('clientId freelancerId')
      .lean();

    const peerIds = new Set<string>();
    for (const c of conversations) {
      if (c.clientId && c.clientId !== userId) peerIds.add(c.clientId);
      if (c.freelancerId && c.freelancerId !== userId) peerIds.add(c.freelancerId);
    }
    return Array.from(peerIds);
  }

  private async buildConversationView(conversation: ConversationViewSource, currentUserId: string) {
    const task = await this.taskModel
      .findById(conversation.taskId)
      .select('_id title clientId status assignedFreelancer')
      .lean();

    const bid = await this.bidModel
      .findById(conversation.bidId)
      .select('_id freelancerId bidAmount')
      .lean();

    if (!task || !bid) {
      throw new NotFoundException('Conversation context not found');
    }

    const infoMap = await this.usersService.getUserInfoMap([
      conversation.clientId,
      conversation.freelancerId,
    ]);

    const isClient = conversation.clientId === currentUserId;
    const otherUserId = isClient ? conversation.freelancerId : conversation.clientId;

    const clientInfo = infoMap.get(conversation.clientId);
    const freelancerInfo = infoMap.get(conversation.freelancerId);
    const otherUserInfo = infoMap.get(otherUserId);

    const [unreadCount, otherUserOnline] = await Promise.all([
      this.getUnreadCount(currentUserId, String(conversation._id)),
      this.isUserOnline(otherUserId),
    ]);

    return {
      conversationId: String(conversation._id),
      id: String(conversation._id),
      type: conversation.type,
      status: conversation.status,
      taskId: conversation.taskId,
      bidId: conversation.bidId,
      taskTitle: task.title,
      taskStatus: task.status,
      clientId: conversation.clientId,
      clientName: clientInfo?.name ?? 'Unknown Client',
      freelancerId: conversation.freelancerId,
      freelancerName: freelancerInfo?.name ?? 'Unknown Freelancer',
      otherUserId,
      otherUserName: otherUserInfo?.name ?? 'Unknown User',
      otherUserAvatarUrl: otherUserInfo?.avatarUrl ?? null,
      otherUserOnline,
      otherUserRole: isClient ? 'FREELANCER' : 'HIRER',
      bidAmount: bid.bidAmount,
      lastMessageText: conversation.lastMessageText ?? null,
      lastAttachmentType: conversation.lastAttachmentType ?? null,
      unreadCount,
      lastMessageAt: this.utilityService.toISOString(conversation.lastMessageAt),
      hiredAt: this.utilityService.toISOString(conversation.hiredAt),
      archivedAt: this.utilityService.toISOString(conversation.archivedAt),
      createdAt: this.utilityService.toISOString(conversation.createdAt),
      updatedAt: this.utilityService.toISOString(conversation.updatedAt),
    };
  }

  private async ensureAccess(conversationId: string, userId: string) {
    const conversation = (await this.conversationModel.findById(conversationId).lean()) as ConversationLike | null;
    if (!conversation) throw new NotFoundException('Conversation not found');
    if (conversation.clientId !== userId && conversation.freelancerId !== userId) {
      throw new ForbiddenException('You do not have access to this conversation');
    }
    return conversation;
  }

  async canAccessConversation(conversationId: string, userId: string) {
    try {
      await this.ensureAccess(conversationId, userId);
      return true;
    } catch {
      return false;
    }
  }

  async findMyConversations(userId: string) {
    const conversations = await this.conversationModel
      .find({ $or: [{ clientId: userId }, { freelancerId: userId }] })
      .sort({ lastMessageAt: -1, updatedAt: -1 })
      .lean<ConversationLike[]>();

    return Promise.all(conversations.map((conversation) => this.buildConversationView(conversation, userId)));
  }

  async markConversationRead(conversationId: string, userId: string, lastReadMessageId?: string) {
    await this.ensureAccess(conversationId, userId);

    const lastMessage = lastReadMessageId
      ? await this.messageModel.findById(lastReadMessageId).lean()
      : await this.messageModel.findOne({ conversationId }).sort({ createdAt: -1, _id: -1 }).lean();

    if (!lastMessage) {
      await this.cacheService.hSet(this.unreadKey(userId), conversationId, 0);
      this.gateway.emitToUser(userId, 'conversation.updated', { conversationId, unreadCount: 0 });
      return { ok: true };
    }

    const lastReadId = String(lastMessage._id);
    await this.messageModel.updateMany(
      { conversationId, senderId: { $ne: userId }, _id: { $lte: new Types.ObjectId(lastReadId) } },
      { $set: { status: 'read' } },
    );

    await this.readReceiptModel.findOneAndUpdate(
      { userId, conversationId },
      { userId, conversationId, lastReadMessageId: lastReadId, seenAt: new Date() },
      { upsert: true, new: true },
    );

    await this.cacheService.hSet(this.unreadKey(userId), conversationId, 0);

    this.gateway.emitToUser(userId, 'conversation.read', { conversationId, lastReadMessageId: lastReadId, unreadCount: 0 });

    const peers = await this.getConversationPeers(conversationId, userId);
    for (const peerId of peers) {
      this.gateway.emitToUser(peerId, 'message.status.updated', {
        conversationId,
        messageId: lastReadId,
        status: 'read',
        seenByUserId: userId,
      });
    }

    return { ok: true };
  }

  async markMessageDelivered(conversationId: string, messageId: string, userId: string) {
    await this.ensureAccess(conversationId, userId);

    const message = await this.messageModel.findById(messageId).lean();
    if (!message || message.conversationId !== conversationId) {
      throw new NotFoundException('Message not found');
    }

    if (message.senderId === userId) {
      return { ok: true };
    }

    await this.messageModel.updateOne(
      { _id: message._id },
      { $set: { status: 'delivered' } },
    );

    this.gateway.emitToUser(message.senderId, 'message.status.updated', {
      conversationId,
      messageId: String(message._id),
      status: 'delivered',
      seenByUserId: userId,
    });

    return { ok: true };
  }

  async getConversation(conversationId: string, userId: string) {
    const conversation = await this.ensureAccess(conversationId, userId);
    return this.buildConversationView(conversation, userId);
  }

  async getMessages(conversationId: string, userId: string, limit = 50, before?: string) {
    await this.ensureAccess(conversationId, userId);

    const query: Record<string, unknown> = { conversationId };

    if (before) {
      const cursor = decodeMessageCursor(before);
      query.$or = [
        { createdAt: { $lt: cursor.createdAt } },
        { createdAt: cursor.createdAt, _id: { $lt: cursor.id } },
      ];
    }

    const pageSize = Math.min(limit, 100);

    const messages = (await this.messageModel
      .find(query)
      .sort({ createdAt: -1, _id: -1 })
      .limit(pageSize + 1)
      .lean()) as MessageLike[];

    const hasMore = messages.length > pageSize;
    if (hasMore) messages.pop();

    const userIds = messages.map((m) => m.senderId).filter((senderId): senderId is string => senderId.trim().length > 0);
    const nameMap = await this.usersService.getUserNameMap(userIds);

    const messageIds = messages.map((m) => String(m._id));
    const mediaDocs = messageIds.length
      ? ((await this.messageMediaModel.find({ messageId: { $in: messageIds } }).sort({ createdAt: 1, _id: 1 }).lean()) as MessageMediaLike[])
      : [];

    const mediaMap = new Map<string, MessageAttachment[]>();
    for (const media of mediaDocs) {
      const next = mediaMap.get(media.messageId) ?? [];
      next.push({ url: media.url, publicId: media.publicId, name: media.name, mimeType: media.mimeType, type: media.type, size: media.size });
      mediaMap.set(media.messageId, next);
    }

    const items = messages.reverse().map((message) => {
      const legacyAttachments = getLegacyAttachments(message);
      const storedAttachments = mediaMap.get(String(message._id)) ?? [];

      return {
        id: String(message._id),
        conversationId: message.conversationId,
        senderId: message.senderId,
        senderName: nameMap.get(message.senderId) ?? message.senderName ?? 'System',
        body: message.body,
        messageType: message.messageType,
        attachments: dedupeAttachments([...legacyAttachments, ...storedAttachments]),
        createdAt: this.utilityService.toISOString(message.createdAt),
        updatedAt: this.utilityService.toISOString(message.updatedAt),
      };
    });

    return {
      items,
      nextCursor: hasMore && messages.length > 0 ? encodeMessageCursor(messages[messages.length - 1]) : null,
      hasMore,
    };
  }

  private async upsertConversation(type: ConversationType, taskId: string, bidId: string, clientId: string, freelancerId: string) {
    const existing = await this.conversationModel.findOne({ type, taskId, bidId });
    if (existing) return existing;
    return this.conversationModel.create({ type, taskId, bidId, clientId, freelancerId, status: ConversationStatus.ACTIVE });
  }

  async createOrOpenPreHireConversation(taskId: string, bidId: string, userId: string) {
    const task = await this.taskModel.findById(taskId).lean();
    if (!task) throw new NotFoundException('Task not found');

    const bid = await this.bidModel.findById(bidId).lean();
    if (!bid || bid.taskId !== taskId) throw new NotFoundException('Bid not found');

    if (task.clientId !== userId && bid.freelancerId !== userId) throw new ForbiddenException('You cannot open this conversation');

    const conversation = await this.upsertConversation(ConversationType.PRE_HIRE, taskId, bidId, task.clientId, bid.freelancerId);

    this.gateway.emitToConversation(String(conversation._id), 'conversation.updated', { conversationId: String(conversation._id), type: conversation.type, status: conversation.status });

    return this.buildConversationView(conversation, userId);
  }

  async hireConversation(taskId: string, bidId: string, userId: string) {
    const task = await this.taskModel.findById(taskId);
    if (!task) throw new NotFoundException('Task not found');
    if (task.clientId !== userId) throw new ForbiddenException('Only the task owner can hire a freelancer');

    const bid = await this.bidModel.findById(bidId).lean();
    if (!bid || bid.taskId !== taskId) throw new NotFoundException('Bid not found');

    if (task.status === TaskStatus.ASSIGNED && task.assignedFreelancer && task.assignedFreelancer !== bid.freelancerId) {
      throw new BadRequestException('This task is already assigned to another freelancer');
    }

    const clientNameMap = await this.usersService.getUserNameMap([task.clientId, bid.freelancerId]);
    const clientName = clientNameMap.get(task.clientId) ?? 'Client';
    const freelancerName = clientNameMap.get(bid.freelancerId) ?? 'Freelancer';

    const preHireConversation = await this.conversationModel.findOne({ type: ConversationType.PRE_HIRE, taskId, bidId });
    if (preHireConversation && preHireConversation.status !== ConversationStatus.ARCHIVED) {
      preHireConversation.status = ConversationStatus.ARCHIVED;
      preHireConversation.archivedAt = new Date();
      await preHireConversation.save();
      this.gateway.emitToConversation(String(preHireConversation._id), 'conversation.updated', { conversationId: String(preHireConversation._id), type: preHireConversation.type, status: preHireConversation.status });
    }

    task.assignedFreelancer = bid.freelancerId;
    task.status = TaskStatus.ASSIGNED;
    await task.save();

    const existingContract = await this.conversationModel.findOne({ type: ConversationType.CONTRACT, taskId, bidId });
    if (existingContract) return this.buildConversationView(existingContract, userId);

    const contractConversation = await this.conversationModel.create({ type: ConversationType.CONTRACT, taskId, bidId, clientId: task.clientId, freelancerId: bid.freelancerId, status: ConversationStatus.ACTIVE, hiredAt: new Date() });

    const systemMessage = await this.messageModel.create({ conversationId: String(contractConversation._id), senderId: task.clientId, senderName: clientName, body: `${clientName} hired ${freelancerName}`, messageType: ChatMessageType.SYSTEM });

    contractConversation.lastMessageAt = systemMessage.createdAt;
    contractConversation.lastMessageId = String(systemMessage._id);
    contractConversation.lastMessageText = systemMessage.body;
    contractConversation.lastMessageType = systemMessage.messageType;
    if (!contractConversation.hiredAt) contractConversation.hiredAt = new Date();
    await contractConversation.save();

    const result = await this.buildConversationView(contractConversation, userId);

    this.gateway.emitToConversation(String(contractConversation._id), 'message.created', {
      id: String(systemMessage._id),
      conversationId: String(contractConversation._id),
      senderId: systemMessage.senderId,
      senderName: systemMessage.senderName,
      body: systemMessage.body,
      messageType: systemMessage.messageType,
      createdAt: this.utilityService.toISOString(systemMessage.createdAt),
    });

    this.gateway.emitToUser(task.clientId, 'conversation.updated', result);
    this.gateway.emitToUser(bid.freelancerId, 'conversation.updated', result);

    void this.notificationsService.saveAndDeliver(bid.freelancerId, {
      type: 'HIRED' as const,
      title: "You've been hired!",
      message: `${clientName} hired you for "${task.title}"`,
      url: `/dashboard/messages/${String(contractConversation._id)}`,
    });

    return result;
  }

  async sendMessage(conversationId: string, userId: string, body?: string, attachments?: AttachmentDto[]) {
    const conversation = await this.ensureAccess(conversationId, userId);
    if (conversation.status === ConversationStatus.ARCHIVED) throw new BadRequestException('Conversation is archived');

    const trimmedBody = body?.trim() ?? '';
    const hasAttachments = Boolean(attachments?.length);
    if (!trimmedBody && !hasAttachments) throw new BadRequestException('Message body or attachment is required');

    const senderNameMap = await this.usersService.getUserNameMap([userId]);
    const senderName = senderNameMap.get(userId) ?? 'System';

    const attachmentDocs: MessageAttachment[] = hasAttachments
      ? attachments!.map(mapAttachmentDtoToAttachment)
      : [];

    const message = await this.messageModel.create({ conversationId, senderId: userId, senderName, body: trimmedBody, messageType: ChatMessageType.TEXT, status: 'sent' });

    if (attachmentDocs.length > 0) {
      await this.messageMediaModel.insertMany(attachmentDocs.map((attachment) => ({ conversationId, messageId: String(message._id), ...attachment })));
    }

    const recipientId = conversation.clientId === userId ? conversation.freelancerId : conversation.clientId;

    await this.cacheService.hIncrBy(this.unreadKey(recipientId), conversationId, 1);

    const recipientUnreadCount = await this.getUnreadCount(recipientId, conversationId);
    const senderUnreadCount = await this.getUnreadCount(userId, conversationId);

    const lastMessageText = trimmedBody || (attachmentDocs[0]?.name ?? 'Attachment');
    const lastAttachmentType = hasAttachments ? attachmentDocs[0].type : null;

    await this.conversationModel.findByIdAndUpdate(conversationId, { lastMessageAt: message.createdAt, lastMessageId: String(message._id), lastMessageText, lastMessageType: message.messageType, lastAttachmentType }, { new: true });

    const conversationUpdate = { conversationId, lastMessageText, lastAttachmentType, lastMessageAt: this.utilityService.toISOString(message.createdAt), unreadCount: recipientUnreadCount };

    const payload = { id: String(message._id), conversationId, senderId: message.senderId, senderName: message.senderName, body: message.body, messageType: message.messageType, status: message.status, recipientId, attachments: attachmentDocs, createdAt: this.utilityService.toISOString(message.createdAt), updatedAt: this.utilityService.toISOString(message.updatedAt) };

    this.gateway.emitToConversation(conversationId, 'message.created', payload);
    this.gateway.emitToUser(recipientId, 'message.created', payload);
    this.gateway.emitToUser(userId, 'conversation.updated', { ...conversationUpdate, unreadCount: senderUnreadCount });
    this.gateway.emitToUser(recipientId, 'conversation.updated', { ...conversationUpdate, unreadCount: recipientUnreadCount });

    const preview = trimmedBody ? trimmedBody.substring(0, 120) : `(${attachmentDocs[0]?.name ?? 'Sent an attachment'})`;

    void this.notificationsService.saveAndDeliver(recipientId, { type: 'MESSAGE_NEW' as const, title: `New message from ${senderName}`, message: preview, url: `/dashboard/messages/${conversationId}` });

    return payload;
  }
}