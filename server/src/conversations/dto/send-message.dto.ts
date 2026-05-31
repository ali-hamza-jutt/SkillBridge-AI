import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  MinLength,
  IsOptional,
  IsArray,
  ValidateNested,
  IsEnum,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';

export class AttachmentDto {
  @ApiProperty()
  @IsString()
  url!: string;

  @ApiProperty()
  @IsString()
  publicId!: string;

  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty()
  @IsString()
  mimeType!: string;

  @ApiProperty({ enum: ['IMAGE', 'VIDEO', 'DOCUMENT'] })
  @IsEnum(['IMAGE', 'VIDEO', 'DOCUMENT'])
  type!: 'IMAGE' | 'VIDEO' | 'DOCUMENT';

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  size?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  thumbnailUrl?: string;
}

export class SendMessageDto {
  @ApiProperty({ required: false })
  @IsString()
  @MinLength(1)
  @IsOptional()
  body?: string;

  @ApiProperty({ required: false, type: [AttachmentDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttachmentDto)
  attachments?: AttachmentDto[];
}
