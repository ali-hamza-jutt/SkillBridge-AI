import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
  ClientProxy,
  ClientProxyFactory,
  Transport,
} from '@nestjs/microservices';
import { Model } from 'mongoose';
import {
  Notification,
  NotificationDocument,
} from './schema/notification.scehma';

@Injectable()
export class NotificationsService {
  private client: ClientProxy;

  constructor(
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<NotificationDocument>,
  ) {
    this.client = ClientProxyFactory.create({
      transport: Transport.RMQ,
      options: {
        urls: ['amqp://guest:guest@localhost:5672'],
        queue: 'marketplace_queue',
        queueOptions: { durable: true },
      },
    });
  }

  sendNotification(event: string, payload: any) {
    try {
      return this.client.emit(event, payload);
    } catch (error:any) {
      throw new BadRequestException(
        `Failed to send notification: ${error.message}`,
      );
    }
  }

  async findByUser(userId: string) {
    try {
      return await this.notificationModel
        .find({ userId })
        .sort({ createdAt: -1 })
        .lean()
        .exec();
    } catch (error:any) {
      throw new BadRequestException(
        `Failed to fetch notifications: ${error.message}`,
      );
    }
  }
  async markAsRead(id: string) {
    try {
      const notification = await this.notificationModel.findByIdAndUpdate(
        id,
        { isRead: true },
        { new: true },
      );
      if (!notification) {
        throw new NotFoundException('Notification not found');
      }
      return notification;
    } catch (error:any) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException(
        `Failed to mark notification as read: ${error.message}`,
      );
    }
  }
}
