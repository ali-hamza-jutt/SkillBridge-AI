import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class MarkConversationReadDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  lastReadMessageId?: string;
}
