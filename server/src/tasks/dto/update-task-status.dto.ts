import { IsEnum, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TaskStatus } from '../schemas/task.schema';

export class UpdateTaskStatusDto {
  @ApiProperty({ enum: TaskStatus, enumName: 'TaskStatus' })
  @IsEnum(TaskStatus)
  status!: TaskStatus;

  @ApiProperty({ required: false })
  @IsString()
  developerId?: string;
}
