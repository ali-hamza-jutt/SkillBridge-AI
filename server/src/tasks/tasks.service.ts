import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { Task, TaskDocument } from './schemas/task.schema';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@Injectable()
export class TasksService {

  constructor(
    @InjectModel(Task.name)
    private taskModel: Model<TaskDocument>,
  ) {}

  async create(createTaskDto: CreateTaskDto, userId: string) {

    const task = new this.taskModel({
      ...createTaskDto,
      clientId: userId,
    });

    return task.save();
  }

  async findAll() {
    return this.taskModel.find();
  }

  async findOne(id: string) {

    const task = await this.taskModel.findById(id);

    if (!task) {
      throw new NotFoundException("Task not found");
    }

    return task;
  }

  async update(id: string, dto: UpdateTaskDto) {

    const task = await this.taskModel.findByIdAndUpdate(
      id,
      dto,
      { new: true },
    );

    if (!task) {
      throw new NotFoundException("Task not found");
    }

    return task;
  }

  async delete(id: string) {

    const task = await this.taskModel.findByIdAndDelete(id);

    if (!task) {
      throw new NotFoundException("Task not found");
    }

    return { message: "Task deleted" };
  }

}