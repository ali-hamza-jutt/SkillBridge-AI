import { Controller, Get, Param, Patch, Req, UseGuards } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Notification, NotificationDocument } from './schema/notification.scehma';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { NotificationsService } from './notifications.service';
import { NotificationsGateway } from './notifications.gateway';

const DEMO_USER_ID = 'DEMO_USER_1';

@Controller()
export class NotificationsController {
  constructor(@InjectModel(Notification.name) private notificationModel: Model<NotificationDocument>,
private notificationsService: NotificationsService,
  private gateway: NotificationsGateway

) {}

  @EventPattern('task.assigned')
  async handleTaskAssigned(@Payload() data: any) {

    const notification = await this.notificationModel.create({
      userId: DEMO_USER_ID,
      message: "You have been assigned a new task",
    });

    this.gateway.sendNotification(DEMO_USER_ID, notification);

    console.log('✅ Task Assigned Event Received:', data);

    // future:
    // send email
    // save notification in DB
    // push notification
  }

  @EventPattern('bid.placed')
  handleBidPlaced(@Payload() data: any) {
    console.log('📢 Bid Placed Event:', data);
  }

  @EventPattern('task.completed')
  handleTaskCompleted(@Payload() data: any) {
    console.log('🎉 Task Completed:', data);
  }

  @Get()
@UseGuards(JwtAuthGuard)
getUserNotifications(@Req() req) {
  return this.notificationsService.findByUser(req.user.userId);
}
@Patch(':id/read')
markAsRead(@Param('id') id: string) {
  return this.notificationsService.markAsRead(id);
}
}