import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type MeetingDocument = Meeting & Document;

export enum MeetingType {
  INSTANT = 'INSTANT',
  SCHEDULED = 'SCHEDULED',
}

export enum MeetingStatus {
  SCHEDULED = 'SCHEDULED',
  STARTED = 'STARTED',
  ENDED = 'ENDED',
  CANCELLED = 'CANCELLED',
}

@Schema({ timestamps: true })
export class Meeting {
  @Prop({ required: true })
  conversationId!: string;

  @Prop({ required: true })
  hostUserId!: string;

  @Prop({ type: [String], required: true })
  participantIds!: string[];

  @Prop({ enum: MeetingType, required: true })
  type!: MeetingType;

  @Prop({ enum: MeetingStatus, default: MeetingStatus.SCHEDULED })
  status!: MeetingStatus;

  @Prop({ required: true })
  topic!: string;

  @Prop({ required: true })
  startTimeUtc!: Date;

  @Prop({ required: true })
  endTimeUtc!: Date;

  @Prop({ required: true })
  durationMinutes!: number;

  // IANA timezone of the user who scheduled it — display-only, never used in comparisons.
  @Prop({ required: true })
  timezone!: string;

  @Prop({ required: true })
  zoomMeetingId!: string;

  @Prop({ required: true })
  joinUrl!: string;

  @Prop({ required: true })
  startUrl!: string;

  createdAt?: Date;

  updatedAt?: Date;
}

export const MeetingSchema = SchemaFactory.createForClass(Meeting);
MeetingSchema.index({ participantIds: 1, startTimeUtc: 1 });
MeetingSchema.index({ conversationId: 1, startTimeUtc: 1 });
