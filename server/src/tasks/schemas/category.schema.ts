import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CategoryDocument = Category & Document;

@Schema({ timestamps: true })
export class Category {
  @Prop({ required: true, unique: true })
  name!: string;
}

export const CategorySchema = SchemaFactory.createForClass(Category);

export type SubCategoryDocument = SubCategory & Document;

@Schema({ timestamps: true })
export class SubCategory {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Category' })
  categoryId!: Types.ObjectId;

  @Prop({ required: true })
  name!: string;
}

export const SubCategorySchema = SchemaFactory.createForClass(SubCategory);
