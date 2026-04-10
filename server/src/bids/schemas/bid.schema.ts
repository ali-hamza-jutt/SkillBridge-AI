import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type BidDocument = Bid & Document;

@Schema({ timestamps: true })
export class Bid {
  @Prop({ required: true })
  taskId!: string;

  @Prop({ required: true })
  freelancerId!: string;

  @Prop({ required: true })
  bidAmount!: number;

  @Prop()
  message!: string;
}

export const BidSchema = SchemaFactory.createForClass(Bid);
