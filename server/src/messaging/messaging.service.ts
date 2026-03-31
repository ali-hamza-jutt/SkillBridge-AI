import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';

@Injectable()
export class MessagingService {
  constructor(
    @Inject('RABBITMQ_SERVICE') private readonly client: ClientProxy,
  ) {}

  async sendMessage(pattern: string, data: any) {
    try {
      return await this.client.send(pattern, data).toPromise();
    } catch (error) {
      throw new BadRequestException(`Failed to send message: ${error.message}`);
    }
  }

  emitMessage(pattern: string, data: any) {
    try {
      return this.client.emit(pattern, data);
    } catch (error) {
      throw new BadRequestException(`Failed to emit message: ${error.message}`);
    }
  }
}
