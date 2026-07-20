import { ConflictException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Meeting, MeetingDocument, MeetingStatus, MeetingType } from './schemas/meeting.schema';
import { ZoomService } from '../zoom/zoom.service';
import { ConversationsService } from '../conversations/conversations.service';
import { ConversationsGateway } from '../conversations/conversations.gateway';
import { ScheduleMeetingDto } from './dto/schedule-meeting.dto';
import { DEFAULT_MEETING_TOPIC, INSTANT_MEETING_DURATION_MINUTES } from '../common/constants';

type MeetingLike = Meeting & { _id: Types.ObjectId };

@Injectable()
export class MeetingsService {
  constructor(
    @InjectModel(Meeting.name) private readonly meetingModel: Model<MeetingDocument>,
    private readonly zoomService: ZoomService,
    private readonly conversationsService: ConversationsService,
    private readonly gateway: ConversationsGateway,
  ) {}

  async createInstant(conversationId: string, userId: string, topic?: string) {
    const { clientId, freelancerId } = await this.conversationsService.getParticipants(conversationId, userId);
    const resolvedTopic = topic || DEFAULT_MEETING_TOPIC;

    const zoomMeeting = await this.zoomService.createMeeting({
      topic: resolvedTopic,
      type: 1,
      durationMinutes: INSTANT_MEETING_DURATION_MINUTES,
    });

    const startTimeUtc = new Date();
    const endTimeUtc = new Date(startTimeUtc.getTime() + INSTANT_MEETING_DURATION_MINUTES * 60 * 1000);

    const meeting = (await this.meetingModel.create({
      conversationId,
      hostUserId: userId,
      participantIds: [clientId, freelancerId],
      type: MeetingType.INSTANT,
      status: MeetingStatus.STARTED,
      topic: resolvedTopic,
      startTimeUtc,
      endTimeUtc,
      durationMinutes: INSTANT_MEETING_DURATION_MINUTES,
      timezone: 'UTC',
      zoomMeetingId: String(zoomMeeting.id),
      joinUrl: zoomMeeting.joinUrl,
      startUrl: zoomMeeting.startUrl,
    })) as unknown as MeetingLike;

    this.notifyMeetingCreated(meeting);
    return this.toResponse(meeting, userId);
  }

  async schedule(conversationId: string, userId: string, dto: ScheduleMeetingDto) {
    const { clientId, freelancerId } = await this.conversationsService.getParticipants(conversationId, userId);
    const resolvedTopic = dto.topic || DEFAULT_MEETING_TOPIC;

    const startTimeUtc = new Date(dto.startTimeUtc);
    const endTimeUtc = new Date(startTimeUtc.getTime() + dto.durationMinutes * 60 * 1000);

    await this.assertNoConflict([clientId, freelancerId], startTimeUtc, endTimeUtc);

    const zoomMeeting = await this.zoomService.createMeeting({
      topic: resolvedTopic,
      type: 2,
      durationMinutes: dto.durationMinutes,
      startTimeUtc,
    });

    const meeting = (await this.meetingModel.create({
      conversationId,
      hostUserId: userId,
      participantIds: [clientId, freelancerId],
      type: MeetingType.SCHEDULED,
      status: MeetingStatus.SCHEDULED,
      topic: resolvedTopic,
      startTimeUtc,
      endTimeUtc,
      durationMinutes: dto.durationMinutes,
      timezone: dto.timezone,
      zoomMeetingId: String(zoomMeeting.id),
      joinUrl: zoomMeeting.joinUrl,
      startUrl: zoomMeeting.startUrl,
    })) as unknown as MeetingLike;

    this.notifyMeetingCreated(meeting);
    return this.toResponse(meeting, userId);
  }

  async checkConflicts(conversationId: string, userId: string, startTimeUtc: Date, durationMinutes: number) {
    const { clientId, freelancerId } = await this.conversationsService.getParticipants(conversationId, userId);
    const endTimeUtc = new Date(startTimeUtc.getTime() + durationMinutes * 60 * 1000);

    const conflict = await this.findOverlap([clientId, freelancerId], startTimeUtc, endTimeUtc);
    if (!conflict) return { conflict: false as const };

    return {
      conflict: true as const,
      startTimeUtc: conflict.startTimeUtc,
      endTimeUtc: conflict.endTimeUtc,
    };
  }

  async listUpcomingForConversation(conversationId: string, userId: string) {
    await this.conversationsService.getParticipants(conversationId, userId);

    const meetings = (await this.meetingModel
      .find({
        conversationId,
        status: { $in: [MeetingStatus.SCHEDULED, MeetingStatus.STARTED] },
        endTimeUtc: { $gt: new Date() },
      })
      .sort({ startTimeUtc: 1 })
      .limit(5)
      .lean()) as MeetingLike[];

    return meetings.map((meeting) => this.toResponse(meeting, userId));
  }

  private async findOverlap(participantIds: string[], startTimeUtc: Date, endTimeUtc: Date) {
    return this.meetingModel
      .findOne({
        participantIds: { $in: participantIds },
        status: { $ne: MeetingStatus.CANCELLED },
        startTimeUtc: { $lt: endTimeUtc },
        endTimeUtc: { $gt: startTimeUtc },
      })
      .lean();
  }

  private async assertNoConflict(participantIds: string[], startTimeUtc: Date, endTimeUtc: Date) {
    const conflict = await this.findOverlap(participantIds, startTimeUtc, endTimeUtc);
    if (conflict) {
      throw new ConflictException({
        message: 'One of the participants already has a meeting during this time.',
        conflictingMeeting: { startTimeUtc: conflict.startTimeUtc, endTimeUtc: conflict.endTimeUtc },
      });
    }
  }

  private notifyMeetingCreated(meeting: MeetingLike) {
    this.gateway.emitToConversation(meeting.conversationId, 'meeting.created', this.toPublicPayload(meeting));
  }

  // Never includes startUrl — it's a host-only secret. The socket broadcast reaches
  // both participants' sockets in the conversation room via the same payload, so it
  // must stay generic; startUrl is only ever added in toResponse() for the REST caller.
  private toPublicPayload(meeting: MeetingLike) {
    return {
      id: String(meeting._id),
      conversationId: meeting.conversationId,
      hostUserId: meeting.hostUserId,
      type: meeting.type,
      status: meeting.status,
      topic: meeting.topic,
      startTimeUtc: meeting.startTimeUtc,
      endTimeUtc: meeting.endTimeUtc,
      durationMinutes: meeting.durationMinutes,
      timezone: meeting.timezone,
      joinUrl: meeting.joinUrl,
    };
  }

  private toResponse(meeting: MeetingLike, viewerUserId: string) {
    const payload = this.toPublicPayload(meeting);
    return viewerUserId === meeting.hostUserId ? { ...payload, startUrl: meeting.startUrl } : payload;
  }
}
