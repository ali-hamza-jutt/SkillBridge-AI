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
  MessageAttachment,
} from './schemas/message.schema';
import { AttachmentDto } from './dto/send-message.dto';
import { ConversationsGateway } from './conversations.gateway';
import { UsersService } from '../users/users.service';
import { UtilityService } from '../common/utility/utility.service';
import { NotificationsService } from '../notifications/notifications.service';

type ConversationLike = Conversation & {
  _id: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
};

type MessageLike = ChatMessage & { _id: Types.ObjectId };

@Injectable()
export class ConversationsService {
  constructor(
    @InjectModel(Conversation.name)
    private readonly conversationModel: Model<ConversationDocument>,
    @InjectModel(ChatMessage.name)
    private readonly messageModel: Model<ChatMessageDocument>,
    @InjectModel(Task.name)
    private readonly taskModel: Model<TaskDocument>,
    @InjectModel(Bid.name)
    private readonly bidModel: Model<BidDocument>,
    @Inject(forwardRef(() => ConversationsGateway))
    private readonly gateway: ConversationsGateway,
    private readonly usersService: UsersService,
    private readonly utilityService: UtilityService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private async buildConversationView(
    conversation: ConversationLike,
    currentUserId: string,
  ) {
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

    const nameMap = await this.usersService.getUserNameMap([
      conversation.clientId,
      conversation.freelancerId,
    ]);

    const isClient = conversation.clientId === currentUserId;
    const otherUserId = isClient
      ? conversation.freelancerId
      : conversation.clientId;

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
      clientName: nameMap.get(conversation.clientId) ?? 'Unknown Client',
      freelancerId: conversation.freelancerId,
      freelancerName:
        nameMap.get(conversation.freelancerId) ?? 'Unknown Freelancer',
      otherUserId,
      otherUserName: nameMap.get(otherUserId) ?? 'Unknown User',
      otherUserRole: isClient ? 'FREELANCER' : 'HIRER',
      bidAmount: bid.bidAmount,
      lastMessageText: conversation.lastMessageText ?? null,
      lastAttachmentType: conversation.lastAttachmentType ?? null,
      lastMessageAt: this.utilityService.toISOString(
        conversation.lastMessageAt,
      ),
      hiredAt: this.utilityService.toISOString(conversation.hiredAt),
      archivedAt: this.utilityService.toISOString(conversation.archivedAt),
      createdAt: this.utilityService.toISOString(conversation.createdAt),
      updatedAt: this.utilityService.toISOString(conversation.updatedAt),
    };
  }

  private async ensureAccess(conversationId: string, userId: string) {
    const conversation = (await this.conversationModel
      .findById(conversationId)
      .lean()) as ConversationLike | null;
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    if (
      conversation.clientId !== userId &&
      conversation.freelancerId !== userId
    ) {
      throw new ForbiddenException(
        'You do not have access to this conversation',
      );
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
      .lean();

    return Promise.all(
      conversations.map((conversation) =>
        this.buildConversationView(conversation, userId),
      ),
    );
  }

  async getConversation(conversationId: string, userId: string) {
    const conversation = await this.ensureAccess(conversationId, userId);
    return this.buildConversationView(conversation, userId);
  }

  async getMessages(
    conversationId: string,
    userId: string,
    limit = 50,
    before?: string,
  ) {
    await this.ensureAccess(conversationId, userId);

    const query: Record<string, unknown> = { conversationId };

    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }

    const messages = (await this.messageModel
      .find(query)
      .sort({ createdAt: -1, _id: -1 })
      .limit(Math.min(limit, 100))
      .lean()) as MessageLike[];

    const userIds = messages.map((message) => message.senderId).filter(Boolean);

    const nameMap = await this.usersService.getUserNameMap(userIds);

    return messages.reverse().map((message) => ({
      id: String(message._id),
      conversationId: message.conversationId,
      senderId: message.senderId,
      senderName:
        nameMap.get(message.senderId) ?? message.senderName ?? 'System',
      body: message.body,
      messageType: message.messageType,
      attachments: message.attachments ?? [],
      createdAt: this.utilityService.toISOString(message.createdAt),
      updatedAt: this.utilityService.toISOString(message.updatedAt),
    }));
  }

  private async upsertConversation(
    type: ConversationType,
    taskId: string,
    bidId: string,
    clientId: string,
    freelancerId: string,
  ) {
    const existing = await this.conversationModel.findOne({
      type,
      taskId,
      bidId,
    });
    if (existing) {
      return existing;
    }

    return await this.conversationModel.create({
      type,
      taskId,
      bidId,
      clientId,
      freelancerId,
      status: ConversationStatus.ACTIVE,
    });
  }

  async createOrOpenPreHireConversation(
    taskId: string,
    bidId: string,
    userId: string,
  ) {
    const task = await this.taskModel.findById(taskId).lean();
    if (!task) {
      throw new NotFoundException('Task not found');
    }

    const bid = await this.bidModel.findById(bidId).lean();
    if (!bid || bid.taskId !== taskId) {
      throw new NotFoundException('Bid not found');
    }

    if (task.clientId !== userId && bid.freelancerId !== userId) {
      throw new ForbiddenException('You cannot open this conversation');
    }

    const conversation = await this.upsertConversation(
      ConversationType.PRE_HIRE,
      taskId,
      bidId,
      task.clientId,
      bid.freelancerId,
    );

    this.gateway.emitToConversation(
      String(conversation._id),
      'conversation.updated',
      {
        conversationId: String(conversation._id),
        type: conversation.type,
        status: conversation.status,
      },
    );

    return this.buildConversationView(conversation, userId);
  }

  async hireConversation(taskId: string, bidId: string, userId: string) {
    const task = await this.taskModel.findById(taskId);
    if (!task) {
      throw new NotFoundException('Task not found');
    }

    if (task.clientId !== userId) {
      throw new ForbiddenException('Only the task owner can hire a freelancer');
    }

    const bid = await this.bidModel.findById(bidId).lean();
    if (!bid || bid.taskId !== taskId) {
      throw new NotFoundException('Bid not found');
    }

    if (
      task.status === TaskStatus.ASSIGNED &&
      task.assignedFreelancer &&
      task.assignedFreelancer !== bid.freelancerId
    ) {
      throw new BadRequestException(
        'This task is already assigned to another freelancer',
      );
    }

    const clientNameMap = await this.usersService.getUserNameMap([
      task.clientId,
      bid.freelancerId,
    ]);
    const clientName = clientNameMap.get(task.clientId) ?? 'Client';
    const freelancerName = clientNameMap.get(bid.freelancerId) ?? 'Freelancer';

    const preHireConversation = await this.conversationModel.findOne({
      type: ConversationType.PRE_HIRE,
      taskId,
      bidId,
    });

    if (
      preHireConversation &&
      preHireConversation.status !== ConversationStatus.ARCHIVED
    ) {
      preHireConversation.status = ConversationStatus.ARCHIVED;
      preHireConversation.archivedAt = new Date();
      await preHireConversation.save();
      this.gateway.emitToConversation(
        String(preHireConversation._id),
        'conversation.updated',
        {
          conversationId: String(preHireConversation._id),
          type: preHireConversation.type,
          status: preHireConversation.status,
        },
      );
    }

    task.assignedFreelancer = bid.freelancerId;
    task.status = TaskStatus.ASSIGNED;
    await task.save();

    const existingContract = await this.conversationModel.findOne({
      type: ConversationType.CONTRACT,
      taskId,
      bidId,
    });

    if (existingContract) {
      return this.buildConversationView(existingContract, userId);
    }

    const contractConversation = await this.conversationModel.create({
      type: ConversationType.CONTRACT,
      taskId,
      bidId,
      clientId: task.clientId,
      freelancerId: bid.freelancerId,
      status: ConversationStatus.ACTIVE,
      hiredAt: new Date(),
    });

    const systemMessage = await this.messageModel.create({
      conversationId: String(contractConversation._id),
      senderId: task.clientId,
      senderName: clientName,
      body: `${clientName} hired ${freelancerName}`,
      messageType: ChatMessageType.SYSTEM,
    });

    contractConversation.lastMessageAt = systemMessage.createdAt;
    contractConversation.lastMessageId = String(systemMessage._id);
    contractConversation.lastMessageText = systemMessage.body;
    contractConversation.lastMessageType = systemMessage.messageType;
    if (!contractConversation.hiredAt) {
      contractConversation.hiredAt = new Date();
    }
    await contractConversation.save();

    const result = await this.buildConversationView(
      contractConversation,
      userId,
    );

    this.gateway.emitToConversation(
      String(contractConversation._id),
      'message.created',
      {
        id: String(systemMessage._id),
        conversationId: String(contractConversation._id),
        senderId: systemMessage.senderId,
        senderName: systemMessage.senderName,
        body: systemMessage.body,
        messageType: systemMessage.messageType,
        createdAt: this.utilityService.toISOString(systemMessage.createdAt),
      },
    );

    this.gateway.emitToUser(task.clientId, 'conversation.updated', result);
    this.gateway.emitToUser(bid.freelancerId, 'conversation.updated', result);

    // notify the freelancer they were hired
    this.notificationsService.emitEvent('notification.hired', {
      recipientId: bid.freelancerId,
      clientName,
      taskTitle: task.title,
      conversationId: String(contractConversation._id),
    });

    return result;
  }

  async sendMessage(
    conversationId: string,
    userId: string,
    body?: string,
    attachments?: AttachmentDto[],
  ) {
    const conversation = await this.ensureAccess(conversationId, userId);

    if (conversation.status === ConversationStatus.ARCHIVED) {
      throw new BadRequestException('Conversation is archived');
    }

    const trimmedBody = body?.trim() ?? '';
    const hasAttachments = attachments && attachments.length > 0;

    if (!trimmedBody && !hasAttachments) {
      throw new BadRequestException('Message body or attachment is required');
    }

    const nameMap = await this.usersService.getUserNameMap([userId]);
    const senderName = nameMap.get(userId) ?? 'System';

    const attachmentDocs: MessageAttachment[] = hasAttachments
      ? attachments.map((a) => ({
          url: a.url,
          publicId: a.publicId,
          name: a.name,
          mimeType: a.mimeType,
          type: a.type,
          size: a.size,
        }))
      : [];

    const message = await this.messageModel.create({
      conversationId,
      senderId: userId,
      senderName,
      body: trimmedBody,
      messageType: ChatMessageType.TEXT,
      attachments: attachmentDocs,
    });

    const lastMessageText =
      trimmedBody || (attachmentDocs[0]?.name ?? 'Attachment');
    const lastAttachmentType = hasAttachments ? attachmentDocs[0].type : null;

    await this.conversationModel.findByIdAndUpdate(
      conversationId,
      {
        lastMessageAt: message.createdAt,
        lastMessageId: String(message._id),
        lastMessageText,
        lastMessageType: message.messageType,
        lastAttachmentType,
      },
      { new: true },
    );

    const payload = {
      id: String(message._id),
      conversationId,
      senderId: message.senderId,
      senderName: message.senderName,
      body: message.body,
      messageType: message.messageType,
      attachments: message.attachments ?? [],
      createdAt: this.utilityService.toISOString(message.createdAt),
      updatedAt: this.utilityService.toISOString(message.updatedAt),
    };

    const conversationUpdate = {
      conversationId,
      lastMessageText,
      lastAttachmentType,
      lastMessageAt: this.utilityService.toISOString(message.createdAt),
    };

    this.gateway.emitToConversation(conversationId, 'message.created', payload);
    this.gateway.emitToUser(
      conversation.clientId,
      'conversation.updated',
      conversationUpdate,
    );
    this.gateway.emitToUser(
      conversation.freelancerId,
      'conversation.updated',
      conversationUpdate,
    );

    // notify the OTHER party via RabbitMQ (they get a browser/push notification)
    const recipientId =
      conversation.clientId === userId
        ? conversation.freelancerId
        : conversation.clientId;

    const preview = trimmedBody
      ? trimmedBody.substring(0, 120)
      : `(${attachmentDocs[0]?.name ?? 'Sent an attachment'})`;

    this.notificationsService.emitEvent('notification.message.new', {
      recipientId,
      senderName,
      preview,
      conversationId,
    });

    return payload;
  }
}
