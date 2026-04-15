import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import {
  BidAttachmentType,
  BidPayoutType,
} from '../dto/create-bid.dto';

export type BidDocument = Bid & Document;

@Schema({ _id: false })
export class BidAttachment {
  @Prop({ required: true })
  fileName!: string;

  @Prop({ required: true, enum: Object.values(BidAttachmentType) })
  type!: BidAttachmentType;

  @Prop({ required: true })
  url!: string;

  @Prop({ required: true, min: 0.01, max: 100 })
  sizeMb!: number;
}

@Schema({ _id: false })
export class BidMilestone {
  @Prop({ required: true })
  title!: string;

  @Prop({ required: true })
  details!: string;

  @Prop({ required: true, min: 0.01 })
  amount!: number;
}

@Schema({ timestamps: true })
export class Bid {
  @Prop({ required: true })
  taskId!: string;

  @Prop({ required: true })
  freelancerId!: string;

  @Prop({ required: true })
  bidAmount!: number;

  @Prop({ required: true })
  coverLetter!: string;

  @Prop({ type: [BidAttachment], default: [] })
  attachments!: BidAttachment[];

  @Prop({ required: true, enum: Object.values(BidPayoutType) })
  payoutType!: BidPayoutType;

  @Prop({ type: [BidMilestone], default: [] })
  modules!: BidMilestone[];
}

export const BidSchema = SchemaFactory.createForClass(Bid);
