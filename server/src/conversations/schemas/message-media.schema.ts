import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type MessageMediaDocument = MessageMedia & Document;

export type MessageMediaType = 'IMAGE' | 'VIDEO' | 'DOCUMENT';

export type MessageAttachment = {
  url: string;
  publicId: string;
  name: string;
  mimeType: string;
  type: MessageMediaType;
  size?: number;
};

@Schema({ timestamps: true })
export class MessageMedia {
  @Prop({ required: true })
  conversationId!: string;

  @Prop({ required: true, index: true })
  messageId!: string;

  @Prop({ required: true })
  url!: string;

  @Prop({ required: true })
  publicId!: string;

  @Prop({ required: true })
  name!: string;

  @Prop({ required: true })
  mimeType!: string;

  @Prop({ required: true, enum: ['IMAGE', 'VIDEO', 'DOCUMENT'] })
  type!: MessageMediaType;

  @Prop()
  size?: number;

  createdAt?: Date;

  updatedAt?: Date;
}

export const MessageMediaSchema = SchemaFactory.createForClass(MessageMedia);
MessageMediaSchema.index({ conversationId: 1, messageId: 1 });
MessageMediaSchema.index({ messageId: 1, createdAt: 1 });