import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateNotificationDto {
  @ApiProperty()
  @IsString()
  event: string;

  @ApiProperty()
  @IsString()
  payload: string; // Can store JSON as string
}