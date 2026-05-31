import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export enum UserRole {
  FREELANCER = 'FREELANCER',
  HIRER = 'HIRER',
  ADMIN = 'ADMIN',
}

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true })
  name!: string;

  @Prop({ required: true, unique: true })
  email!: string;

  @Prop({ required: true })
  password!: string;

  @Prop()
  refreshTokenHash?: string;

  @Prop({ type: [String], default: [] })
  skills!: string[];

  @Prop()
  categoryId?: string;

  @Prop({ default: 0 })
  rating!: number;

  @Prop({ type: String, enum: UserRole, default: UserRole.FREELANCER })
  role!: UserRole;

  // ── Extended profile fields ──────────────────────────────────────────────
  @Prop()
  title?: string;

  @Prop()
  bio?: string;

  @Prop()
  avatarUrl?: string;

  @Prop()
  timezone?: string;

  @Prop()
  hourlyRate?: number;

  @Prop({
    type: [
      {
        company: String,
        jobTitle: String,
        startDate: String,
        endDate: String,
        current: Boolean,
        description: String,
      },
    ],
    default: [],
  })
  experience!: Array<{
    _id?: unknown;
    company: string;
    jobTitle: string;
    startDate: string;
    endDate?: string;
    current: boolean;
    description?: string;
  }>;

  @Prop({
    type: [
      {
        institution: String,
        degree: String,
        field: String,
        startDate: String,
        endDate: String,
        current: Boolean,
      },
    ],
    default: [],
  })
  education!: Array<{
    _id?: unknown;
    institution: string;
    degree: string;
    field: string;
    startDate: string;
    endDate?: string;
    current: boolean;
  }>;
}

export const UserSchema = SchemaFactory.createForClass(User);
