import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Category,
  CategoryDocument,
  SubCategory,
  SubCategoryDocument,
} from './schemas/category.schema';
import { CreateCategoryDto, CreateSubCategoryDto } from './dto/category.dto';
import { UtilityService } from '../common/utility/utility.service';

@Injectable()
export class CategoryService {
  constructor(
    @InjectModel(Category.name)
    private categoryModel: Model<CategoryDocument>,
    @InjectModel(SubCategory.name)
    private subCategoryModel: Model<SubCategoryDocument>,
    private utilityService: UtilityService,
  ) {}

  async createCategory(dto: CreateCategoryDto) {
    try {
      const existing = await this.categoryModel.findOne({ name: dto.name });
      if (existing) {
        throw new ConflictException('Category already exists');
      }

      const category = new this.categoryModel(dto);
      return await category.save();
    } catch (error:any) {
      if (error instanceof ConflictException) throw error;
      throw new BadRequestException(
        `Failed to create category: ${error.message}`,
      );
    }
  }

  async getAllCategories() {
    try {
      return await this.categoryModel.find().lean().exec();
    } catch (error:any) {
      throw new BadRequestException(
        `Failed to fetch categories: ${error.message}`,
      );
    }
  }

  async getCategoryById(id: string) {
    try {
      const category = await this.categoryModel.findById(id);
      if (!category) {
        throw new NotFoundException('Category not found');
      }
      return category;
    } catch (error:any) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException(
        `Failed to fetch category: ${error.message}`,
      );
    }
  }

  async createSubCategory(dto: CreateSubCategoryDto) {
    try {
      const categoryId = this.utilityService.normalizeObjectId(
        dto.categoryId,
        'categoryId',
      );
      await this.ensureCategoryExists(categoryId);

      const subCategory = new this.subCategoryModel({
        ...dto,
        categoryId: new Types.ObjectId(categoryId),
      });
      return await subCategory.save();
    } catch (error:any) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException(
        `Failed to create sub-category: ${error.message}`,
      );
    }
  }

  async getSubCategoriesByCategory(categoryId: string) {
    try {
      const normalizedCategoryId = this.utilityService.normalizeObjectId(
        categoryId,
        'categoryId',
      );
      await this.ensureCategoryExists(normalizedCategoryId);

      return await this.subCategoryModel
        .aggregate([
          {
            $match: {
              $expr: {
                $eq: [{ $toString: '$categoryId' }, normalizedCategoryId],
              },
            },
          },
          { $sort: { name: 1 } },
        ])
        .exec();
    } catch (error:any) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException(
        `Failed to fetch sub-categories: ${error.message}`,
      );
    }
  }



  async updateSubCategoryName(id: string, name: string) {
    try {
      const subCategory = await this.subCategoryModel.findByIdAndUpdate(
        id,
        { name },
        { new: true },
      );

      if (!subCategory) {
        throw new NotFoundException('SubCategory not found');
      }

      return subCategory;
    } catch (error:any) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException(
        `Failed to update sub-category: ${error.message}`,
      );
    }
  }

  async ensureCategoryExists(categoryId: string) {
    const normalizedCategoryId = this.utilityService.normalizeObjectId(
      categoryId,
      'categoryId',
    );
    const category = await this.categoryModel
      .findById(normalizedCategoryId)
      .lean();
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    return category;
  }
}
