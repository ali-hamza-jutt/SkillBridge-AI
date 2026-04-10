import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TaskDocument = Task & Document;

export enum BudgetType {
  HOURLY = 'hourly',
  FIXED = 'fixed',
}

export enum TaskStatus {
  OPEN = 'OPEN',
  ASSIGNED = 'ASSIGNED',
  COMPLETED = 'COMPLETED',
  CLOSED = 'CLOSED',
}

export enum ProjectType {
  ONGOING = 'ongoing',
  ONE_TIME = 'one_time',
}

export enum ExperienceLevel {
  ENTRY = 'entry',
  INTERMEDIATE = 'intermediate',
  EXPERT = 'expert',
}

@Schema({ timestamps: true })
export class Task {
  @Prop({ required: true })
  title!: string;

  @Prop({ required: true })
  description!: string;

  @Prop({ required: true })
  budget!: number;

  @Prop({ required: true })
  maxBudget!: number;

  @Prop({ required: true, enum: BudgetType })
  budgetType!: BudgetType;

  @Prop({ enum: TaskStatus, default: TaskStatus.OPEN })
  status!: TaskStatus;

  @Prop({ required: true, enum: ProjectType })
  projectType!: ProjectType;

  @Prop({ required: true })
  categoryId!: string;

  @Prop({ required: true })
  subCategoryId!: string;

  @Prop({ type: [String], default: [] })
  requiredSkills!: string[];

  @Prop({ required: true, enum: ExperienceLevel })
  experienceLevel!: ExperienceLevel;

  @Prop({ required: true })
  clientId!: string;

  @Prop()
  assignedFreelancer?: string;

  @Prop()
  completedBy?: string;
}

export const TaskSchema = SchemaFactory.createForClass(Task);
