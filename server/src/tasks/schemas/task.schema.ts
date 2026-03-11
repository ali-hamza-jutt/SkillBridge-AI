import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TaskDocument = Task & Document;

@Schema({ timestamps: true })
export class Task {

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  budget: number;

  @Prop({ default: "OPEN" })
  status: string;

  @Prop({ required: true })
  clientId: string;

  @Prop()
  assignedFreelancer: string;

}

export const TaskSchema = SchemaFactory.createForClass(Task);