import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ChatMessageDocument = ChatMessage & Document;

export enum ChatMessageType {
  TEXT = 'TEXT',
  SYSTEM = 'SYSTEM',
}

@Schema({ timestamps: true })
export class ChatMessage {
  @Prop({ required: true })
  conversationId!: string;

  @Prop({ required: true })
  senderId!: string;

  @Prop({ required: true })
  senderName!: string;

  @Prop({ default: '' })
  body!: string;

  @Prop({ enum: ChatMessageType, default: ChatMessageType.TEXT })
  messageType!: ChatMessageType;

  createdAt?: Date;

  updatedAt?: Date;
}

export const ChatMessageSchema = SchemaFactory.createForClass(ChatMessage);
ChatMessageSchema.index({ conversationId: 1, createdAt: 1 });
