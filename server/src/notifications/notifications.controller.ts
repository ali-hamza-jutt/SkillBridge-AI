import { Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';

@Controller()
export class NotificationsController {

  @EventPattern('task.assigned')
  handleTaskAssigned(@Payload() data: any) {
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

}