import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { ConversationsController } from './conversations.controller';
import { ConversationsGateway } from './conversations.gateway';
import { ConversationsService } from './conversations.service';
import { Conversation, ConversationSchema } from './schemas/conversation.schema';
import { ChatMessage, ChatMessageSchema } from './schemas/message.schema';
import { Task, TaskSchema } from '../tasks/schemas/task.schema';
import { Bid, BidSchema } from '../bids/schemas/bid.schema';
import { UsersModule } from '../users/users.module';
import { UtilityModule } from '../common/utility/utility.module';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'default_secret',
    }),
    MongooseModule.forFeature([
      { name: Conversation.name, schema: ConversationSchema },
      { name: ChatMessage.name, schema: ChatMessageSchema },
      { name: Task.name, schema: TaskSchema },
      { name: Bid.name, schema: BidSchema },
    ]),
    UsersModule,
    UtilityModule,
  ],
  controllers: [ConversationsController],
  providers: [ConversationsService, ConversationsGateway],
  exports: [ConversationsService, ConversationsGateway],
})
export class ConversationsModule {}
