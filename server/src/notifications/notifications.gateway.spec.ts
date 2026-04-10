import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class NotificationsGateway {
  @WebSocketServer()
  server!: Server;

  // Store userId -> socket mapping
  private users = new Map<string, string>();

  handleConnection(client: Socket) {
    console.log('Client connected:', client.id);
  }

  handleDisconnect(client: Socket) {
    console.log('Client disconnected:', client.id);

    // remove user mapping
    for (const [userId, socketId] of this.users.entries()) {
      if (socketId === client.id) {
        this.users.delete(userId);
      }
    }
  }

  @SubscribeMessage('register')
  handleRegister(
    @MessageBody() userId: string,
    @ConnectedSocket() client: Socket,
  ) {
    this.users.set(userId, client.id);
    console.log(`User ${userId} registered with socket ${client.id}`);
  }

  sendNotification(userId: string, message: any) {
    const socketId = this.users.get(userId);

    if (socketId) {
      this.server.to(socketId).emit('notification', message);
    }
  }
}
