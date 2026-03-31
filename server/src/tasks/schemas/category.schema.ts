import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CategoryDocument = Category & Document;

@Schema({ timestamps: true })
export class Category {

  @Prop({ required: true, unique: true })
  name: string;

  @Prop()
  description?: string;

}

export const CategorySchema = SchemaFactory.createForClass(Category);

export type SubCategoryDocument = SubCategory & Document;

@Schema({ timestamps: true })
export class SubCategory {

  @Prop({ required: true })
  categoryId: string;

  @Prop({ required: true })
  name: string;

  @Prop()
  description?: string;

}

export const SubCategorySchema = SchemaFactory.createForClass(SubCategory);
