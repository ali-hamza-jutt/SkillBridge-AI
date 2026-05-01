import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class HireConversationDto {
  @ApiProperty()
  @IsString()
  taskId!: string;

  @ApiProperty()
  @IsString()
  bidId!: string;
}
