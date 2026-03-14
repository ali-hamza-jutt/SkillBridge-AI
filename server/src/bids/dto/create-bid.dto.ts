import { IsString, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateBidDto {

  @ApiProperty()
  @IsString()
  taskId: string;

  @ApiProperty()
  @IsNumber()
  bidAmount: number;

  @ApiProperty()
  @IsString()
  message: string;

}