import { IsOptional, IsString, IsArray } from 'class-validator';

export class UpdateUserDto {

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsArray()
  skills?: string[];

}