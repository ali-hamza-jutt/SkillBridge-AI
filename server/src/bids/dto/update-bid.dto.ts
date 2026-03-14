import { IsOptional, IsNumber } from 'class-validator';

export class UpdateBidDto {

  @IsOptional()
  @IsNumber()
  bidAmount?: number;

}