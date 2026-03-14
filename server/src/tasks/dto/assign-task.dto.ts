import { IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class AssignTaskDto {

  @ApiProperty()
  @IsString()
  bidId: string;

}