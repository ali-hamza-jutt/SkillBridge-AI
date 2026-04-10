import { IsEmail, IsString, MinLength, IsArray, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../schemas/user.schema';

export class CreateUserDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty()
  @IsString()
  @MinLength(6)
  password!: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  skills!: string[];

  @ApiProperty({
    enum: UserRole,
    required: false,
    default: UserRole.FREELANCER,
  })
  @IsEnum(UserRole)
  role?: UserRole;
}
