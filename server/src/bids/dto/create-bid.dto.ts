import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum BidAttachmentType {
  PHOTO = 'photo',
  VIDEO = 'video',
  PDF = 'pdf',
  WORD = 'word',
}

export enum BidPayoutType {
  WHOLE = 'whole',
  MODULE_BASED = 'module_based',
}

export class BidAttachmentDto {
  @ApiProperty({ example: 'portfolio-landing-page.jpg' })
  @IsString()
  fileName!: string;

  @ApiProperty({ enum: BidAttachmentType, enumName: 'BidAttachmentType' })
  @IsEnum(BidAttachmentType)
  type!: BidAttachmentType;

  @ApiProperty({
    example: 'https://cdn.example.com/uploads/portfolio-landing-page.jpg',
  })
  @IsUrl()
  url!: string;

  @ApiProperty({
    description: 'Attachment size in MB. Maximum allowed is 100 MB per file.',
    example: 12.5,
  })
  @IsNumber()
  @Min(0.01)
  @Max(100)
  sizeMb!: number;
}

export class BidMilestoneDto {
  @ApiProperty({ example: 'Module 1 - Authentication Setup' })
  @IsString()
  title!: string;

  @ApiProperty({
    example: 'Implement signup, login, JWT flow, and role-based guards.',
  })
  @IsString()
  details!: string;

  @ApiProperty({ example: 300 })
  @IsNumber()
  @Min(0.01)
  amount!: number;
}

export class CreateBidDto {
  @ApiProperty()
  @IsString()
  taskId!: string;

  @ApiProperty()
  @IsNumber()
  @Min(0.01)
  bidAmount!: number;

  @ApiProperty({
    description: 'Freelancer cover letter for this bid.',
    example: 'I can deliver this task in 10 days with clean, tested code.',
  })
  @IsString()
  coverLetter!: string;

  @ApiPropertyOptional({
    type: [BidAttachmentDto],
    description:
      'Optional supporting files. Max 10 attachments, each up to 100 MB.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => BidAttachmentDto)
  attachments?: BidAttachmentDto[];

  @ApiProperty({ enum: BidPayoutType, enumName: 'BidPayoutType' })
  @IsEnum(BidPayoutType)
  payoutType!: BidPayoutType;

  @ApiPropertyOptional({
    type: [BidMilestoneDto],
    description:
      'Required when payoutType is module_based. Include each module detail and payment amount.',
  })
  @ValidateIf((obj: CreateBidDto) => obj.payoutType === BidPayoutType.MODULE_BASED)
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => BidMilestoneDto)
  modules?: BidMilestoneDto[];
}
