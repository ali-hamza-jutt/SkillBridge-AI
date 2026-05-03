import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PortfolioProjectDocument = PortfolioProject & Document;

@Schema({ timestamps: true })
export class PortfolioProject {
  @Prop({ required: true })
  userId!: string;

  @Prop({ required: true })
  title!: string;

  @Prop({ required: true })
  description!: string;

  @Prop({ required: true })
  role!: string;

  @Prop({ type: [String], default: [] })
  techStack!: string[];

  @Prop()
  projectUrl?: string;

  @Prop({
    type: [
      {
        url: String,
        publicId: String,
        name: String,
        mimeType: String,
        type: { type: String, enum: ['IMAGE', 'VIDEO', 'DOCUMENT'] },
        size: Number,
      },
    ],
    default: [],
  })
  media!: Array<{
    _id?: unknown;
    url: string;
    publicId: string;
    name: string;
    mimeType: string;
    type: 'IMAGE' | 'VIDEO' | 'DOCUMENT';
    size?: number;
  }>;
}

export const PortfolioProjectSchema =
  SchemaFactory.createForClass(PortfolioProject);
