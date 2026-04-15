import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCategoryDto {
  @ApiProperty()
  @IsString()
  name!: string;
}

export class CreateSubCategoryDto {
  @ApiProperty()
  @IsString()
  categoryId!: string;

  @ApiProperty()
  @IsString()
  name!: string;
}

export class UpdateSubCategoryNameDto {
  @ApiProperty()
  @IsString()
  name!: string;
}
