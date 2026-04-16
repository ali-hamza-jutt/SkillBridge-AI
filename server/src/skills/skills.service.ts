import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { Skill, SkillDocument } from './schemas/skill.schema';
import { CreateSkillDto, CreateSkillsBulkDto } from './dto/create-skill.dto';
import { UtilityService } from '../common/utility/utility.service';
import { CategoryService } from '../tasks/category.service';

@Injectable()
export class SkillsService {
  constructor(
    @InjectModel(Skill.name)
    private skillModel: Model<SkillDocument>,
    private utilityService: UtilityService,
    private categoryService: CategoryService,
  ) {}

  async getAll() {
    return this.skillModel.find().sort({ name: 1 }).lean().exec();
  }

  async getByCategory(categoryId: string) {
    this.utilityService.ensureObjectId(categoryId, 'categoryId');
    return this.skillModel.find({ categoryId }).sort({ name: 1 }).lean().exec();
  }

  async create(dto: CreateSkillDto) {
    this.utilityService.ensureObjectId(dto.categoryId, 'categoryId');
    const name = this.utilityService.normalize(dto.name);

    await this.categoryService.ensureCategoryExists(dto.categoryId);

    const exists = await this.skillModel.findOne({ categoryId: dto.categoryId, name });
    if (exists) {
      return exists;
    }

    const created = new this.skillModel({ categoryId: dto.categoryId, name });
    return created.save();
  }

  async createBulk(dto: CreateSkillsBulkDto) {
    this.utilityService.ensureObjectId(dto.categoryId, 'categoryId');
    await this.categoryService.ensureCategoryExists(dto.categoryId);

    const names = [
      ...new Set(
        dto.names
          .map((name) => this.utilityService.normalize(name))
          .filter(Boolean),
      ),
    ];

    if (names.length === 0) {
      throw new BadRequestException('At least one skill name is required.');
    }

    const operations = names.map((name) => ({
      updateOne: {
        filter: { categoryId: new Types.ObjectId(dto.categoryId), name },
        update: { $setOnInsert: { categoryId: new Types.ObjectId(dto.categoryId), name } },
        upsert: true,
      },
    }));

    await this.skillModel.bulkWrite(operations);

    return this.getByCategory(dto.categoryId);
  }

  async validateSkillsForCategory(categoryId: string, requestedSkills: string[] = []) {
    await this.categoryService.ensureCategoryExists(categoryId);

    const normalizedRequested = [
      ...new Set(
        requestedSkills
          .map((s) => this.utilityService.normalize(s))
          .filter(Boolean),
      ),
    ];

    if (normalizedRequested.length === 0) {
      return [] as string[];
    }

    // Keep skill input flexible for task/profile flows by storing normalized values
    // without enforcing category-bound skill membership.
    return normalizedRequested;
  }
}
