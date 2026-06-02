import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ReadReceiptDocument = ReadReceipt & Document;

@Schema({ timestamps: true })
export class ReadReceipt {
  @Prop({ required: true })
  userId!: string;

  @Prop({ required: true })
  conversationId!: string;

  @Prop({ required: true })
  lastReadMessageId!: string;

  @Prop({ required: true })
  seenAt!: Date;
}

export const ReadReceiptSchema = SchemaFactory.createForClass(ReadReceipt);
ReadReceiptSchema.index({ userId: 1, conversationId: 1 }, { unique: true });