import {
  IsOptional,
  IsString,
  IsNumber,
  IsEnum,
  IsArray,
} from 'class-validator';
import {
  BudgetType,
  ProjectType,
  ExperienceLevel,
} from '../schemas/task.schema';

export class UpdateTaskDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  budget?: number;

  @IsOptional()
  @IsNumber()
  maxBudget?: number;

  @IsOptional()
  @IsEnum(BudgetType)
  budgetType?: BudgetType;

  @IsOptional()
  @IsEnum(ProjectType)
  projectType?: ProjectType;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  subCategoryId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requiredSkills?: string[];

  @IsOptional()
  @IsEnum(ExperienceLevel)
  experienceLevel?: ExperienceLevel;
}
