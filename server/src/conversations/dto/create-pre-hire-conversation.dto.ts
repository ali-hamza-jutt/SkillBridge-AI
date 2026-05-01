import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CreatePreHireConversationDto {
  @ApiProperty()
  @IsString()
  taskId!: string;

  @ApiProperty()
  @IsString()
  bidId!: string;
}
