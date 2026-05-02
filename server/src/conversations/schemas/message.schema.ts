import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ChatMessageDocument = ChatMessage & Document;

export enum ChatMessageType {
  TEXT = 'TEXT',
  SYSTEM = 'SYSTEM',
}

export type AttachmentType = 'IMAGE' | 'VIDEO' | 'DOCUMENT';

export class MessageAttachment {
  url!: string;
  publicId!: string;
  name!: string;
  mimeType!: string;
  type!: AttachmentType;
  size?: number;
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

  @Prop({
    type: [
      {
        url: { type: String, required: true },
        publicId: { type: String, required: true },
        name: { type: String, required: true },
        mimeType: { type: String, required: true },
        type: {
          type: String,
          enum: ['IMAGE', 'VIDEO', 'DOCUMENT'],
          required: true,
        },
        size: { type: Number },
      },
    ],
    default: [],
  })
  attachments!: MessageAttachment[];

  createdAt?: Date;

  updatedAt?: Date;
}

export const ChatMessageSchema = SchemaFactory.createForClass(ChatMessage);
ChatMessageSchema.index({ conversationId: 1, createdAt: 1 });
