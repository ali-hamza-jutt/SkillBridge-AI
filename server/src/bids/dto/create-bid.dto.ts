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
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum BidPayoutType {
  WHOLE = 'whole',
  MODULE_BASED = 'module_based',
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
    type: [String],
    description: 'Optional supporting file URLs. Max 10 attachment URLs.',
    example: ['https://res.cloudinary.com/demo/auto/upload/v1/skill-bridge/bid-attachments/sample.pdf'],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsUrl({}, { each: true })
  attachments?: string[];

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
