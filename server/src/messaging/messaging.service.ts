import { Injectable, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';

@Injectable()
export class MessagingService {
  constructor(
    @Inject('RABBITMQ_SERVICE') private readonly client: ClientProxy,
  ) {}

  async sendMessage(pattern: string, data: any) {
    return this.client.send(pattern, data);
  }

  emitMessage(pattern: string, data: any) {
    this.client.emit(pattern, data);
  }
}
