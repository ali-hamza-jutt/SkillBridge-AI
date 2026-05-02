import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server } from 'socket.io';

@WebSocketGateway({ cors: { origin: '*' } })
export class NotificationsGateway {
  private readonly logger = new Logger(NotificationsGateway.name);

  @WebSocketServer()
  server!: Server;

  // ConversationsGateway owns auth + room setup on the shared socket server.
  // This gateway only emits to pre-built user rooms — no handleConnection needed.

  isUserOnline(userId: string): boolean {
    const room = this.server.sockets.adapter.rooms.get(`user:${userId}`);
    return !!(room && room.size > 0);
  }

  sendToUser(userId: string, notification: unknown) {
    this.server.to(`user:${userId}`).emit('notification', notification);
    this.logger.debug(`Notified user ${userId}`);
  }
}
