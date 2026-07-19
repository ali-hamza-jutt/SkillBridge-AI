import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class InstantMeetingDto {
  @ApiProperty()
  @IsString()
  conversationId!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MinLength(1)
  topic?: string;
}
