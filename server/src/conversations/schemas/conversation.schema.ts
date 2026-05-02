import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ConversationDocument = Conversation & Document;

export enum ConversationType {
  PRE_HIRE = 'PRE_HIRE',
  CONTRACT = 'CONTRACT',
}

export enum ConversationStatus {
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
}

@Schema({ timestamps: true })
export class Conversation {
  @Prop({ required: true, enum: ConversationType })
  type!: ConversationType;

  @Prop({ required: true })
  taskId!: string;

  @Prop({ required: true })
  bidId!: string;

  @Prop({ required: true })
  clientId!: string;

  @Prop({ required: true })
  freelancerId!: string;

  @Prop({ enum: ConversationStatus, default: ConversationStatus.ACTIVE })
  status!: ConversationStatus;

  @Prop()
  hiredAt?: Date;

  @Prop()
  archivedAt?: Date;

  @Prop()
  lastMessageAt?: Date;

  @Prop()
  lastMessageId?: string;

  @Prop()
  lastMessageText?: string;

  @Prop()
  lastMessageType?: string;

  @Prop({ type: String, enum: ['IMAGE', 'VIDEO', 'DOCUMENT'], default: null })
  lastAttachmentType?: 'IMAGE' | 'VIDEO' | 'DOCUMENT' | null;
}

export const ConversationSchema = SchemaFactory.createForClass(Conversation);
ConversationSchema.index({ type: 1, taskId: 1, bidId: 1 }, { unique: true });
ConversationSchema.index({ clientId: 1, updatedAt: -1 });
ConversationSchema.index({ freelancerId: 1, updatedAt: -1 });
