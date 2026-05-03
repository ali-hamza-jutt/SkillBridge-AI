import {
  IsString,
  IsOptional,
  IsArray,
  IsUrl,
  IsNumber,
  IsIn,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProjectMediaDto {
  @ApiProperty() @IsString() url!: string;
  @ApiProperty() @IsString() publicId!: string;
  @ApiProperty() @IsString() name!: string;
  @ApiProperty() @IsString() mimeType!: string;
  @ApiProperty() @IsIn(['IMAGE', 'VIDEO', 'DOCUMENT']) type!: 'IMAGE' | 'VIDEO' | 'DOCUMENT';
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) size?: number;
}

export class CreatePortfolioProjectDto {
  @ApiProperty() @IsString() title!: string;
  @ApiProperty() @IsString() description!: string;
  @ApiProperty() @IsString() role!: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  techStack?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  projectUrl?: string;

  @ApiPropertyOptional({ type: [ProjectMediaDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProjectMediaDto)
  media?: ProjectMediaDto[];
}

export class UpdatePortfolioProjectDto {
  @ApiPropertyOptional() @IsOptional() @IsString() title?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() role?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  techStack?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  projectUrl?: string;

  @ApiPropertyOptional({ type: [ProjectMediaDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProjectMediaDto)
  media?: ProjectMediaDto[];
}
