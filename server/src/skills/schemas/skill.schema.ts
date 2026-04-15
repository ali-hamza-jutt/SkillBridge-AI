import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SkillDocument = Skill & Document;

@Schema({ timestamps: true })
export class Skill {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Category' })
  categoryId!: Types.ObjectId;

  @Prop({ required: true })
  name!: string;
}

export const SkillSchema = SchemaFactory.createForClass(Skill);
SkillSchema.index({ categoryId: 1, name: 1 }, { unique: true });
