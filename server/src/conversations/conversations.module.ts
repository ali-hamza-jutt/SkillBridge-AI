import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { ConversationsController } from './conversations.controller';
import { ConversationsGateway } from './conversations.gateway';
import { ConversationsService } from './conversations.service';
import { Conversation, ConversationSchema } from './schemas/conversation.schema';
import { ChatMessage, ChatMessageSchema } from './schemas/message.schema';
import { MessageMedia, MessageMediaSchema } from './schemas/message-media.schema';
import { Task, TaskSchema } from '../tasks/schemas/task.schema';
import { Bid, BidSchema } from '../bids/schemas/bid.schema';
import { UsersModule } from '../users/users.module';
import { UtilityModule } from '../common/utility/utility.module';
import { GCSModule } from '../gcs/gcs.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { CacheModule } from '../cache/cache.module';
import { ReadReceipt, ReadReceiptSchema } from './schemas/read-receipt.schema';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'default_secret',
    }),
    MongooseModule.forFeature([
      { name: Conversation.name, schema: ConversationSchema },
      { name: ChatMessage.name, schema: ChatMessageSchema },
      { name: MessageMedia.name, schema: MessageMediaSchema },
      { name: ReadReceipt.name, schema: ReadReceiptSchema },
      { name: Task.name, schema: TaskSchema },
      { name: Bid.name, schema: BidSchema },
    ]),
    UsersModule,
    UtilityModule,
    GCSModule,
    CacheModule,
    NotificationsModule,
  ],
  controllers: [ConversationsController],
  providers: [ConversationsService, ConversationsGateway],
  exports: [ConversationsService, ConversationsGateway],
})
export class ConversationsModule {}
