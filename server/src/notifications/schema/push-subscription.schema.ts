import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PushSubscriptionDocument = PushSubscription & Document;

@Schema({ timestamps: true })
export class PushSubscription {
  @Prop({ required: true })
  userId!: string;

  @Prop({ required: true })
  endpoint!: string;

  @Prop({ type: Object, required: true })
  keys!: { p256dh: string; auth: string };
}

export const PushSubscriptionSchema =
  SchemaFactory.createForClass(PushSubscription);

PushSubscriptionSchema.index({ userId: 1, endpoint: 1 }, { unique: true });
