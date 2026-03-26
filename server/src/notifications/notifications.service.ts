import { Injectable } from '@nestjs/common';
import { ClientProxy, ClientProxyFactory, Transport } from '@nestjs/microservices';

@Injectable()
export class NotificationsService {

  private client: ClientProxy;

  constructor() {
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

}