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
import { BidsService } from '../bids/bids.service';
import { NotificationsService } from '../notifications/notifications.service';
import { UsersService } from '../users/users.service';
import { SkillsService } from '../skills/skills.service';

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
    private usersService: UsersService,
    private skillsService: SkillsService,
  ) {}

  async create(createTaskDto: CreateTaskDto, userId: string) {
    try {
      const validatedSkills = await this.skillsService.validateSkillsForCategory(
        createTaskDto.categoryId,
        createTaskDto.requiredSkills ?? [],
      );

      const task = new this.taskModel({
        ...createTaskDto,
        requiredSkills: validatedSkills,
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
      if (dto.requiredSkills) {
        const existingTask = await this.taskModel.findById(id).lean().exec();

        if (!existingTask) {
          throw new NotFoundException('Task not found');
        }

        const categoryForValidation = dto.categoryId ?? existingTask.categoryId;
        dto.requiredSkills = await this.skillsService.validateSkillsForCategory(
          categoryForValidation,
          dto.requiredSkills,
        );
      }

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

  async getOpenTasksByClient(clientId: string) {
    try {
      const tasks = await this.taskModel
        .find({ clientId, status: TaskStatus.OPEN })
        .sort({ createdAt: -1 })
        .lean()
        .exec();
      return tasks;
    } catch (error:any) {
      throw new BadRequestException(
        `Failed to fetch open tasks for client: ${error.message}`,
      );
    }
  }

  async matchTasksForUser(
    userId: string,
    overrideCriteria?: {
      categoryId?: string;
      subCategoryIds?: string[];
      skills?: string[];
    },
  ) {
    try {
      const user = await this.usersService.findAuthById(userId);

      if (!user) {
        throw new NotFoundException('User not found');
      }

      const categoryId = overrideCriteria?.categoryId ?? user.categoryId;
      const subCategoryIds = overrideCriteria?.subCategoryIds ?? [];
      const skills = overrideCriteria?.skills ?? user.skills ?? [];

      if (!categoryId) {
        return [];
      }

      const query: Record<string, unknown> = {
        status: TaskStatus.OPEN,
      };

      query.categoryId = categoryId;

      if (subCategoryIds.length > 0) {
        query.subCategoryId = { $in: subCategoryIds };
      }

      if (skills.length > 0) {
        query.requiredSkills = { $in: skills };
      }

      return await this.taskModel.find(query).sort({ createdAt: -1 }).lean().exec();
    } catch (error:any) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException(`Failed to match tasks for user: ${error.message}`);
    }
  }
}
