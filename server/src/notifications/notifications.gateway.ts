import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class NotificationsGateway {
  private readonly logger = new Logger(NotificationsGateway.name);

  @WebSocketServer()
  server!: Server;

  // Store userId -> socket mapping
  private users = new Map<string, string>();

  handleConnection(client: Socket) {
    try {
      this.logger.log(`Client connected: ${client.id}`);
    } catch (error) {
      this.logger.error('Error handling connection:', error);
    }
  }

  handleDisconnect(client: Socket) {
    try {
      this.logger.log(`Client disconnected: ${client.id}`);

      // remove user mapping
      for (const [userId, socketId] of this.users.entries()) {
        if (socketId === client.id) {
          this.users.delete(userId);
        }
      }
    } catch (error) {
      this.logger.error('Error handling disconnection:', error);
    }
  }

  @SubscribeMessage('register')
  handleRegister(
    @MessageBody() userId: string,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      this.users.set(userId, client.id);
      this.logger.log(`User ${userId} registered with socket ${client.id}`);
    } catch (error) {
      this.logger.error('Error registering user:', error);
    }
  }

  sendNotification(userId: string, message: any) {
    try {
      const socketId = this.users.get(userId);

      if (socketId) {
        this.server.to(socketId).emit('notification', message);
      }
    } catch (error) {
      this.logger.error('Error sending notification:', error);
    }
  }
}
