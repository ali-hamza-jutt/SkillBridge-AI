import { IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GenerateUploadUrlDto {
  @ApiProperty({
    description: 'Original file name including extension',
    example: 'document.pdf',
  })
  @IsString()
  fileName!: string;

  @ApiProperty({
    description: 'MIME type of the file',
    example: 'application/pdf',
  })
  @IsString()
  mimeType!: string;

  @ApiPropertyOptional({
    description: 'Folder prefix inside the bucket',
    example: 'chat-attachments',
  })
  @IsOptional()
  @IsString()
  folder?: string;
}
