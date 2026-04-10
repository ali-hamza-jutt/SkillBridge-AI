import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { UserRole } from '../../users/schemas/user.schema';

export class SignupDto {
  @ApiProperty({ example: 'Jane Doe' })
  @IsString()
  name!: string;

  @ApiProperty({ example: 'jane@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'strongPassword123' })
  @IsString()
  @MinLength(6)
  password!: string;

  @ApiProperty({ type: [String], required: false, default: [] })
  @IsOptional()
  @IsArray()
  skills?: string[];

  @ApiProperty({ enum: UserRole, default: UserRole.FREELANCER })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
