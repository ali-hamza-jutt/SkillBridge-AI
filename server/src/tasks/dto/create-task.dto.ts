import { IsString, IsNumber, IsEnum, IsOptional, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { BudgetType, ProjectType, ExperienceLevel } from '../schemas/task.schema';

export class CreateTaskDto {

  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiProperty()
  @IsNumber()
  budget: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  maxBudget?: number;

  @ApiProperty({ enum: BudgetType, enumName: 'BudgetType' })
  @IsEnum(BudgetType)
  budgetType: BudgetType;

  @ApiProperty({ enum: ProjectType, enumName: 'ProjectType' })
  @IsEnum(ProjectType)
  projectType: ProjectType;

  @ApiProperty()
  @IsString()
  categoryId: string;

  @ApiProperty()
  @IsString()
  subCategoryId: string;

  @ApiProperty({ type: [String], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requiredSkills?: string[];

  @ApiProperty({ enum: ExperienceLevel, enumName: 'ExperienceLevel' })
  @IsEnum(ExperienceLevel)
  experienceLevel: ExperienceLevel;

}