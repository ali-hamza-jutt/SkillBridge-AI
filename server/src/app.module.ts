import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { TasksModule } from './tasks/tasks.module';
import { UsersModule } from './users/users.module';
import { BidsModule } from './bids/bids.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ConversationsModule } from './conversations/conversations.module';
import { SkillsModule } from './skills/skills.module';
import { GCSModule } from './gcs/gcs.module';
import { PortfolioModule } from './portfolio/portfolio.module';
import { MeetingsModule } from './meetings/meetings.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
MongooseModule.forRootAsync({
  useFactory: () => {
    console.log('MONGODB_URI:', process.env.MONGODB_URI);

    return {
      uri: process.env.MONGODB_URI,
    };
  },
}),
    AuthModule,
    TasksModule,
    UsersModule,
    SkillsModule,
    BidsModule,
    NotificationsModule,
    ConversationsModule,
    GCSModule,
    PortfolioModule,
    MeetingsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
