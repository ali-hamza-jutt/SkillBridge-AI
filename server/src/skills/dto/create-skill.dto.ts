import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString } from 'class-validator';

export class CreateSkillDto {
  @ApiProperty()
  @IsString()
  categoryId!: string;

  @ApiProperty()
  @IsString()
  name!: string;
}

export class CreateSkillsBulkDto {
  @ApiProperty()
  @IsString()
  categoryId!: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  names!: string[];
}
