import { Module } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { CategoryService } from './category.service';
import { CategoryController } from './category.controller';

import { MongooseModule } from '@nestjs/mongoose';
import { Task, TaskSchema } from './schemas/task.schema';
import { Category, CategorySchema, SubCategory, SubCategorySchema } from './schemas/category.schema';
import { CacheModule } from '../cache/cache.module';
import { BidsModule } from 'src/bids/bids.module';
import { NotificationsModule } from 'src/notifications/notifications.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Task.name, schema: TaskSchema },
      { name: Category.name, schema: CategorySchema },
      { name: SubCategory.name, schema: SubCategorySchema },
    ]),
    CacheModule,
    BidsModule,
    NotificationsModule,
  ],
  controllers: [TasksController, CategoryController],
  providers: [TasksService, CategoryService],
  exports: [TasksService, CategoryService],
})
export class TasksModule {}