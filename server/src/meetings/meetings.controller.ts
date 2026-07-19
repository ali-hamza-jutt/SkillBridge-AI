import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MeetingsService } from './meetings.service';
import { InstantMeetingDto } from './dto/instant-meeting.dto';
import { ScheduleMeetingDto } from './dto/schedule-meeting.dto';

@ApiTags('Meetings')
@UseGuards(JwtAuthGuard)
@Controller('meetings')
export class MeetingsController {
  constructor(private readonly meetingsService: MeetingsService) {}

  @Post('instant')
  createInstant(@Body() dto: InstantMeetingDto, @Req() req) {
    return this.meetingsService.createInstant(dto.conversationId, req.user.userId, dto.topic);
  }

  @Post('schedule')
  schedule(@Body() dto: ScheduleMeetingDto, @Req() req) {
    return this.meetingsService.schedule(dto.conversationId, req.user.userId, dto);
  }

  @Get('conflicts')
  checkConflicts(
    @Query('conversationId') conversationId: string,
    @Query('startTimeUtc') startTimeUtc: string,
    @Query('durationMinutes') durationMinutes: string,
    @Req() req,
  ) {
    return this.meetingsService.checkConflicts(
      conversationId,
      req.user.userId,
      new Date(startTimeUtc),
      Number(durationMinutes),
    );
  }

  @Get()
  listUpcoming(@Query('conversationId') conversationId: string, @Req() req) {
    return this.meetingsService.listUpcomingForConversation(conversationId, req.user.userId);
  }
}
