import { IsNumber, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GenerateUploadSignatureDto {
  @ApiProperty({
    description: 'Unix timestamp in seconds',
    example: 1681234567,
  })
  @IsNumber()
  timestamp!: number;

  @ApiPropertyOptional({
    description: 'Optional folder path in Cloudinary',
    example: 'skill-bridge/bid-attachments',
  })
  @IsOptional()
  @IsString()
  folder?: string;
}
