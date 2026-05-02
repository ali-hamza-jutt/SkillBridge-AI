import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
  ClientProxy,
  ClientProxyFactory,
  Transport,
} from '@nestjs/microservices';
import { Model, Types } from 'mongoose';
import {
  Notification,
  NotificationDocument,
  NotificationType,
} from './schema/notification.scehma';
import {
  PushSubscription,
  PushSubscriptionDocument,
} from './schema/push-subscription.schema';
import { WebPushService } from './web-push.service';

export type NotificationPayload = {
  type: 'BID_RECEIVED' | 'MESSAGE_NEW' | 'HIRED';
  title: string;
  message: string;
  url?: string;
};

@Injectable()
export class NotificationsService implements OnModuleInit {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly client: ClientProxy;

  constructor(
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<NotificationDocument>,
    @InjectModel(PushSubscription.name)
    private readonly pushSubModel: Model<PushSubscriptionDocument>,
    private readonly webPushService: WebPushService,
  ) {
    this.client = ClientProxyFactory.create({
      transport: Transport.RMQ,
      options: {
        urls: [
          process.env.RABBITMQ_URL ?? 'amqp://guest:guest@localhost:5672',
        ],
        queue: 'marketplace_queue',
        queueOptions: { durable: true },
      },
    });
  }

  async onModuleInit() {
    try {
      await this.client.connect();
    } catch {
      this.logger.warn(
        'RabbitMQ not reachable on startup — will retry on first emit',
      );
    }
  }

  // Called by producers (BidsService, ConversationsService) to publish via RabbitMQ.
  emitEvent(event: string, payload: unknown) {
    this.client.emit(event, payload).subscribe({
      error: (err: Error) =>
        this.logger.error(`Failed to emit "${event}": ${err?.message}`),
    });
  }

  // Called by NotificationsController RabbitMQ consumer handlers.
  async saveAndDeliver(userId: string, data: NotificationPayload) {
    const notification = await this.notificationModel.create({
      userId,
      type: data.type,
      title: data.title,
      message: data.message,
      url: data.url,
    });

    const plain = notification.toObject<Notification & { _id: Types.ObjectId }>();

    await this.deliverPush(userId, data);

    return plain;
  }

  private async deliverPush(userId: string, data: NotificationPayload) {
    const subs = await this.pushSubModel.find({ userId }).lean();
    if (!subs.length) return;

    const expired: string[] = [];

    await Promise.allSettled(
      subs.map(async (sub) => {
        const result = await this.webPushService.send(
          { endpoint: sub.endpoint, keys: sub.keys },
          { title: data.title, body: data.message, url: data.url },
        );
        if (result === 'expired') expired.push(String(sub._id));
      }),
    );

    if (expired.length) {
      await this.pushSubModel.deleteMany({ _id: { $in: expired } });
    }
  }

  async savePushSubscription(
    userId: string,
    sub: { endpoint: string; keys: { p256dh: string; auth: string } },
  ) {
    await this.pushSubModel.findOneAndUpdate(
      { userId, endpoint: sub.endpoint },
      { userId, endpoint: sub.endpoint, keys: sub.keys },
      { upsert: true, new: true },
    );
  }

  async removePushSubscription(userId: string, endpoint: string) {
    await this.pushSubModel.deleteOne({ userId, endpoint });
  }

  async findByUser(userId: string) {
    return this.notificationModel
      .find({ userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean()
      .exec();
  }

  async markAsRead(id: string) {
    const notification = await this.notificationModel.findByIdAndUpdate(
      id,
      { isRead: true },
      { new: true },
    );
    if (!notification) throw new NotFoundException('Notification not found');
    return notification;
  }

  async markAllRead(userId: string) {
    await this.notificationModel.updateMany(
      { userId, isRead: false },
      { isRead: true },
    );
    return { ok: true };
  }
}
