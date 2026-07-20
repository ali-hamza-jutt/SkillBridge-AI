import { ApiProperty } from '@nestjs/swagger';
import { IsISO8601, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class ScheduleMeetingDto {
  @ApiProperty()
  @IsString()
  conversationId!: string;

  @ApiProperty({ description: 'Meeting start time as a UTC ISO-8601 string' })
  @IsISO8601()
  startTimeUtc!: string;

  @ApiProperty()
  @IsInt()
  @Min(15)
  durationMinutes!: number;

  @ApiProperty({ description: 'IANA timezone of the scheduling user, for display only' })
  @IsString()
  timezone!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MinLength(1)
  topic?: string;
}
