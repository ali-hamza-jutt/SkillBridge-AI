import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { NotificationsService, NotificationPayload } from './notifications.service';
import { PushSubscribeDto, PushUnsubscribeDto } from './dto/push-subscribe.dto';

type BidReceivedPayload = {
  recipientId: string;
  freelancerName: string;
  taskTitle: string;
  taskId: string;
};

type MessageNewPayload = {
  recipientId: string;
  senderName: string;
  preview: string;
  conversationId: string;
};

type HiredPayload = {
  recipientId: string;
  clientName: string;
  taskTitle: string;
  conversationId: string;
};

@Controller('notifications')
export class NotificationsController {
  private readonly logger = new Logger(NotificationsController.name);

  constructor(private readonly notificationsService: NotificationsService) {}

  // ---- RabbitMQ consumers ---------------------------------------------------

  @EventPattern('notification.bid.received')
  async handleBidReceived(@Payload() data: BidReceivedPayload) {
    try {
      await this.notificationsService.saveAndDeliver(data.recipientId, {
        type: 'BID_RECEIVED' as NotificationPayload['type'],
        title: 'New bid received',
        message: `${data.freelancerName} submitted a bid on "${data.taskTitle}"`,
        url: `/dashboard/jobs/${data.taskId}`,
      });
    } catch (err) {
      this.logger.error('handleBidReceived failed', err);
    }
  }

  @EventPattern('notification.message.new')
  async handleMessageNew(@Payload() data: MessageNewPayload) {
    try {
      await this.notificationsService.saveAndDeliver(data.recipientId, {
        type: 'MESSAGE_NEW' as NotificationPayload['type'],
        title: `New message from ${data.senderName}`,
        message: data.preview,
        url: `/dashboard/messages/${data.conversationId}`,
      });
    } catch (err) {
      this.logger.error('handleMessageNew failed', err);
    }
  }

  @EventPattern('notification.hired')
  async handleHired(@Payload() data: HiredPayload) {
    try {
      await this.notificationsService.saveAndDeliver(data.recipientId, {
        type: 'HIRED' as NotificationPayload['type'],
        title: "You've been hired!",
        message: `${data.clientName} hired you for "${data.taskTitle}"`,
        url: `/dashboard/messages/${data.conversationId}`,
      });
    } catch (err) {
      this.logger.error('handleHired failed', err);
    }
  }

  // ---- HTTP endpoints -------------------------------------------------------

  @Get()
  @UseGuards(JwtAuthGuard)
  getNotifications(@Req() req: { user: { userId: string } }) {
    return this.notificationsService.findByUser(req.user.userId);
  }

  @Patch('read-all')
  @UseGuards(JwtAuthGuard)
  markAllRead(@Req() req: { user: { userId: string } }) {
    return this.notificationsService.markAllRead(req.user.userId);
  }

  @Patch(':id/read')
  @UseGuards(JwtAuthGuard)
  markAsRead(@Param('id') id: string) {
    return this.notificationsService.markAsRead(id);
  }

  @Post('subscribe')
  @UseGuards(JwtAuthGuard)
  subscribe(
    @Req() req: { user: { userId: string } },
    @Body() dto: PushSubscribeDto,
  ) {
    return this.notificationsService.savePushSubscription(req.user.userId, dto);
  }

  @Delete('subscribe')
  @UseGuards(JwtAuthGuard)
  unsubscribe(
    @Req() req: { user: { userId: string } },
    @Body() dto: PushUnsubscribeDto,
  ) {
    return this.notificationsService.removePushSubscription(
      req.user.userId,
      dto.endpoint,
    );
  }
}
