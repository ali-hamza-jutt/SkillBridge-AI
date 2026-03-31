import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Category, CategoryDocument, SubCategory, SubCategoryDocument } from './schemas/category.schema';
import { CreateCategoryDto, CreateSubCategoryDto } from './dto/category.dto';

@Injectable()
export class CategoryService {

  constructor(
    @InjectModel(Category.name)
    private categoryModel: Model<CategoryDocument>,
    @InjectModel(SubCategory.name)
    private subCategoryModel: Model<SubCategoryDocument>,
  ) {}

  async createCategory(dto: CreateCategoryDto) {
    const existing = await this.categoryModel.findOne({ name: dto.name });
    if (existing) {
      throw new ConflictException('Category already exists');
    }

    const category = new this.categoryModel(dto);
    return await category.save();
  }

  async getAllCategories() {
    return await this.categoryModel.find().lean().exec();
  }

  async getCategoryById(id: string) {
    const category = await this.categoryModel.findById(id);
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    return category;
  }

  async createSubCategory(dto: CreateSubCategoryDto) {
    const category = await this.categoryModel.findById(dto.categoryId);
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    const subCategory = new this.subCategoryModel(dto);
    return await subCategory.save();
  }

  async getSubCategoriesByCategory(categoryId: string) {
    return await this.subCategoryModel.find({ categoryId }).lean().exec();
  }

  async getSubCategoryById(id: string) {
    const subCategory = await this.subCategoryModel.findById(id);
    if (!subCategory) {
      throw new NotFoundException('SubCategory not found');
    }
    return subCategory;
  }

}
