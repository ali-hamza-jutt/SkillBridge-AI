import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientProxy, ClientProxyFactory, Transport } from '@nestjs/microservices';
import { Model } from 'mongoose';
import { Notification, NotificationDocument } from './schema/notification.scehma';

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
    return this.client.emit(event, payload);
  }

  async findByUser(userId: string) {
    return this.notificationModel
      .find({ userId })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
  }
  async markAsRead(id: string) {
  return this.notificationModel.findByIdAndUpdate(
    id,
    { isRead: true },
    { new: true }
  );
}

}