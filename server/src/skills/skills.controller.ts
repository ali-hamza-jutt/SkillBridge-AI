import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SkillsService } from './skills.service';
import { CreateSkillDto, CreateSkillsBulkDto } from './dto/create-skill.dto';

@ApiTags('Skills')
@Controller('skills')
export class SkillsController {
  constructor(private readonly skillsService: SkillsService) {}

  @Get()
  getAll() {
    return this.skillsService.getAll();
  }

  @Get('category/:categoryId')
  getByCategory(@Param('categoryId') categoryId: string) {
    return this.skillsService.getByCategory(categoryId);
  }

  @Post()
  create(@Body() dto: CreateSkillDto) {
    return this.skillsService.create(dto);
  }

  @Post('bulk')
  createBulk(@Body() dto: CreateSkillsBulkDto) {
    return this.skillsService.createBulk(dto);
  }
}
