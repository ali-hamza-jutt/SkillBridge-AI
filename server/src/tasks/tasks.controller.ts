import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { UpdateTaskStatusDto } from './dto/update-task-status.dto';

import { ApiTags } from '@nestjs/swagger';
import { AssignTaskDto } from './dto/assign-task.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Tasks')
@Controller('tasks')
export class TasksController {
  constructor(private tasksService: TasksService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() dto: CreateTaskDto, @Req() req) {
    return this.tasksService.create(dto, req.user.userId);
  }

  @Get()
  findAll() {
    return this.tasksService.findAll();
  }

  @Get('category/:categoryId')
  findByCategory(@Param('categoryId') categoryId: string) {
    return this.tasksService.findByCategory(categoryId);
  }

  @Get('sub-category/:subCategoryId')
  findBySubCategory(@Param('subCategoryId') subCategoryId: string) {
    return this.tasksService.findBySubCategory(subCategoryId);
  }

  @Get('category/:categoryId/sub-category/:subCategoryId')
  findByCategoryAndSubCategory(
    @Param('categoryId') categoryId: string,
    @Param('subCategoryId') subCategoryId: string,
  ) {
    return this.tasksService.findByCategoryAndSubCategory(
      categoryId,
      subCategoryId,
    );
  }

  @Get('developer/:developerId/assigned')
  getTaskAssignedToDeveloper(@Param('developerId') developerId: string) {
    return this.tasksService.getTaskAssignedToDeveloper(developerId);
  }

  @Get('developer/:developerId/completed')
  getTaskCompletedByDeveloper(@Param('developerId') developerId: string) {
    return this.tasksService.getTaskCompletedByDeveloper(developerId);
  }

  @Get('developer/:developerId/matches')
  matchTasksWithDeveloper(
    @Param('developerId') developerId: string,
    @Query('category') category: string,
    @Query('subCategories') subCategories: string,
    @Query('skills') skills: string,
  ) {
    const subCategoriesArray = subCategories ? subCategories.split(',') : [];
    const skillsArray = skills ? skills.split(',') : [];
    return this.tasksService.matchTasksWithDeveloper(
      developerId,
      category,
      subCategoriesArray,
      skillsArray,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('my-open')
  getMyOpenTasks(@Req() req) {
    return this.tasksService.getOpenTasksByClient(req.user.userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tasksService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTaskDto) {
    return this.tasksService.update(id, dto);
  }

  @Patch(':id/status')
  updateTaskStatus(@Param('id') id: string, @Body() dto: UpdateTaskStatusDto) {
    return this.tasksService.updateTaskStatus(id, dto);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.tasksService.delete(id);
  }

  @Post(':taskId/assign')
  assignTask(@Param('taskId') taskId: string, @Body() dto: AssignTaskDto) {
    return this.tasksService.assignTask(taskId, dto.bidId);
  }
}
