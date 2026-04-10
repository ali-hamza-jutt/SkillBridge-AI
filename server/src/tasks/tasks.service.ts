import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { Task, TaskDocument, TaskStatus } from './schemas/task.schema';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { UpdateTaskStatusDto } from './dto/update-task-status.dto';
import { CacheService } from '../cache/cache.service';
import { BidsService } from 'src/bids/bids.service';
import { NotificationsService } from '../notifications/notifications.service';

const DEMO_USER_ID = 'DEMO_USER_1';

@Injectable()
export class TasksService {
  private readonly tasksCacheKey = 'tasks:all';

  constructor(
    @InjectModel(Task.name)
    private taskModel: Model<TaskDocument>,
    private readonly cacheService: CacheService,
    private bidsService: BidsService,
    private notificationsService: NotificationsService,
  ) {}

  async create(createTaskDto: CreateTaskDto, userId: string) {
    try {
      const task = new this.taskModel({
        ...createTaskDto,
        clientId: userId,
      });

      const savedTask = await task.save();
      await this.cacheService.del(this.tasksCacheKey);
      return savedTask;
    } catch (error:any) {
      throw new BadRequestException(`Failed to create task: ${error.message}`);
    }
  }

  async findAll() {
    try {
      const cachedTasks = await this.cacheService.get(this.tasksCacheKey);
      if (cachedTasks) {
        return JSON.parse(cachedTasks);
      }

      const tasks = await this.taskModel.find().lean().exec();
      await this.cacheService.set(
        this.tasksCacheKey,
        JSON.stringify(tasks),
        300,
      );
      return tasks;
    } catch (error:any) {
      throw new BadRequestException(`Failed to fetch tasks: ${error.message}`);
    }
  }

  async findOne(id: string) {
    try {
      const task = await this.taskModel.findById(id);

      if (!task) {
        throw new NotFoundException('Task not found');
      }
      return task;
    } catch (error:any) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException(`Failed to fetch task: ${error.message}`);
    }
  }

  async update(id: string, dto: UpdateTaskDto) {
    try {
      const task = await this.taskModel.findByIdAndUpdate(id, dto, {
        new: true,
      });

      if (!task) {
        throw new NotFoundException('Task not found');
      }

      await this.cacheService.del(this.tasksCacheKey);
      return task;
    } catch (error:any) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException(`Failed to update task: ${error.message}`);
    }
  }

  async delete(id: string) {
    try {
      const task = await this.taskModel.findByIdAndDelete(id);

      if (!task) {
        throw new NotFoundException('Task not found');
      }

      await this.cacheService.del(this.tasksCacheKey);
      return { message: 'Task deleted' };
    } catch (error:any) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException(`Failed to delete task: ${error.message}`);
    }
  }

  async assignTask(taskId: string, bidId: string) {
    try {
      const bid = await this.bidsService.findBidById(bidId);

      if (!bid) {
        throw new NotFoundException('Bid not found');
      }

      const task = await this.taskModel.findById(taskId);

      if (!task) {
        throw new NotFoundException('Task not found');
      }

      task.assignedFreelancer = bid.freelancerId;
      task.status = TaskStatus.ASSIGNED;

      await task.save();

      this.notificationsService.sendNotification('task.assigned', {
        taskId: task._id,
        freelancerId: DEMO_USER_ID,
        clientId: task.clientId,
      });

      return task;
    } catch (error:any) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException(`Failed to assign task: ${error.message}`);
    }
  }

  async updateTaskStatus(taskId: string, dto: UpdateTaskStatusDto) {
    try {
      const task = await this.taskModel.findById(taskId);

      if (!task) {
        throw new NotFoundException('Task not found');
      }

      task.status = dto.status;

      if (dto.status === TaskStatus.ASSIGNED && dto.developerId) {
        task.assignedFreelancer = dto.developerId;
        this.notificationsService.sendNotification('task.assigned', {
          taskId: task._id,
          freelancerId: dto.developerId,
          clientId: task.clientId,
        });
      } else if (dto.status === TaskStatus.COMPLETED && dto.developerId) {
        task.completedBy = dto.developerId;
        this.notificationsService.sendNotification('task.completed', {
          taskId: task._id,
          developerId: dto.developerId,
          clientId: task.clientId,
        });
      } else if (dto.status === TaskStatus.CLOSED) {
        this.notificationsService.sendNotification('task.closed', {
          taskId: task._id,
          clientId: task.clientId,
        });
      }

      await task.save();
      await this.cacheService.del(this.tasksCacheKey);
      return task;
    } catch (error:any) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException(
        `Failed to update task status: ${error.message}`,
      );
    }
  }

  async findByCategory(categoryId: string) {
    try {
      const tasks = await this.taskModel
        .find({ categoryId, status: TaskStatus.OPEN })
        .lean()
        .exec();
      return tasks;
    } catch (error:any) {
      throw new BadRequestException(
        `Failed to fetch tasks by category: ${error.message}`,
      );
    }
  }

  async findBySubCategory(subCategoryId: string) {
    try {
      const tasks = await this.taskModel
        .find({ subCategoryId, status: TaskStatus.OPEN })
        .lean()
        .exec();
      return tasks;
    } catch (error:any) {
      throw new BadRequestException(
        `Failed to fetch tasks by sub-category: ${error.message}`,
      );
    }
  }

  async findByCategoryAndSubCategory(
    categoryId: string,
    subCategoryId: string,
  ) {
    try {
      const tasks = await this.taskModel
        .find({ categoryId, subCategoryId, status: TaskStatus.OPEN })
        .lean()
        .exec();
      return tasks;
    } catch (error:any) {
      throw new BadRequestException(`Failed to fetch tasks: ${error.message}`);
    }
  }

  async getTaskAssignedToDeveloper(developerId: string) {
    try {
      const tasks = await this.taskModel
        .find({ assignedFreelancer: developerId, status: TaskStatus.ASSIGNED })
        .lean()
        .exec();
      return tasks;
    } catch (error:any) {
      throw new BadRequestException(
        `Failed to fetch assigned tasks: ${error.message}`,
      );
    }
  }

  async getTaskCompletedByDeveloper(developerId: string) {
    try {
      const tasks = await this.taskModel
        .find({ completedBy: developerId, status: TaskStatus.COMPLETED })
        .lean()
        .exec();
      return tasks;
    } catch (error:any) {
      throw new BadRequestException(
        `Failed to fetch completed tasks: ${error.message}`,
      );
    }
  }

  async matchTasksWithDeveloper(
    developerId: string,
    userCategory: string,
    userSubCategories: string[],
    userSkills: string[],
  ) {
    try {
      const tasks = await this.taskModel
        .find({
          $or: [
            { categoryId: userCategory },
            { subCategoryId: { $in: userSubCategories } },
            { requiredSkills: { $in: userSkills } },
          ],
          status: TaskStatus.OPEN,
        })
        .lean()
        .exec();

      return tasks;
    } catch (error:any) {
      throw new BadRequestException(`Failed to match tasks: ${error.message}`);
    }
  }
}
