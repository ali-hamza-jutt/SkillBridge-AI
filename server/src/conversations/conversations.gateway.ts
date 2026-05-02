import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Inject, Injectable, Logger, forwardRef } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { ConversationsService } from './conversations.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
@Injectable()
export class ConversationsGateway
  implements OnGatewayConnection<Socket>, OnGatewayDisconnect<Socket>
{
  private readonly logger = new Logger(ConversationsGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwtService: JwtService,
    @Inject(forwardRef(() => ConversationsService))
    private readonly conversationsService: ConversationsService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const rawToken: unknown = client.handshake.auth?.token;
      const token: string | undefined =
        typeof rawToken === 'string'
          ? rawToken
          : client.handshake.headers.authorization?.startsWith('Bearer ')
            ? client.handshake.headers.authorization.slice(7)
            : undefined;

      if (!token) {
        throw new Error('Missing socket token');
      }

      const payload = this.jwtService.verify<{ sub: string }>(token, {
        secret: process.env.JWT_SECRET ?? 'default_secret',
      });

      (client.data as { userId: string }).userId = payload.sub;
      await client.join(`user:${payload.sub}`);
      this.logger.log(`Client connected: ${client.id} as user ${payload.sub}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Socket connection rejected [${client.id}]: ${message}`);
      client.emit('exception', { message: 'Unauthorized' });
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('conversation.join')
  async handleJoinConversation(
    @MessageBody() conversationId: string,
    @ConnectedSocket() client: Socket,
  ) {
    const userId = (client.data as { userId?: string }).userId;
    if (!userId) {
      return { ok: false };
    }

    const canAccess = await this.conversationsService.canAccessConversation(
      conversationId,
      userId,
    );

    if (!canAccess) {
      return { ok: false };
    }

    await client.join(`conversation:${conversationId}`);
    return { ok: true };
  }

  @SubscribeMessage('conversation.leave')
  async handleLeaveConversation(
    @MessageBody() conversationId: string,
    @ConnectedSocket() client: Socket,
  ) {
    await client.leave(`conversation:${conversationId}`);
    return { ok: true };
  }

  emitToConversation(conversationId: string, event: string, payload: any) {
    this.server.to(`conversation:${conversationId}`).emit(event, payload);
  }

  emitToUser(userId: string, event: string, payload: any) {
    this.server.to(`user:${userId}`).emit(event, payload);
  }
}
