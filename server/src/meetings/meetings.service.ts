import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
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

  async cancelScheduledMeeting(meetingId: string, userId: string) {
    if (!Types.ObjectId.isValid(meetingId)) {
      throw new NotFoundException('Meeting not found.');
    }

    const meeting = (await this.meetingModel.findById(meetingId).lean()) as MeetingLike | null;
    if (!meeting) {
      throw new NotFoundException('Meeting not found.');
    }

    await this.conversationsService.getParticipants(meeting.conversationId, userId);

    if (meeting.hostUserId !== userId) {
      throw new ForbiddenException('Only the meeting organizer can cancel this meeting.');
    }

    if (meeting.status === MeetingStatus.CANCELLED) {
      return this.toResponse(meeting, userId);
    }

    const startTime = new Date(meeting.startTimeUtc).getTime();
    if (meeting.status !== MeetingStatus.SCHEDULED || !Number.isFinite(startTime) || startTime <= Date.now()) {
      throw new BadRequestException('A meeting cannot be cancelled after it has started.');
    }

    await this.zoomService.deleteMeeting(meeting.zoomMeetingId);

    const cancelledMeeting = (await this.meetingModel
      .findOneAndUpdate(
        {
          _id: meeting._id,
          hostUserId: userId,
          status: MeetingStatus.SCHEDULED,
        },
        { $set: { status: MeetingStatus.CANCELLED } },
        { new: true },
      )
      .lean()) as MeetingLike | null;

    if (!cancelledMeeting) {
      const currentMeeting = (await this.meetingModel.findById(meeting._id).lean()) as MeetingLike | null;
      if (currentMeeting?.status === MeetingStatus.CANCELLED) {
        return this.toResponse(currentMeeting, userId);
      }
      throw new BadRequestException('This meeting has already started or is no longer available.');
    }

    this.gateway.emitToConversation(
      cancelledMeeting.conversationId,
      'meeting.cancelled',
      this.toPublicPayload(cancelledMeeting),
    );

    return this.toResponse(cancelledMeeting, userId);
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

  async markZoomMeetingEnded(zoomMeetingId: string) {
    if (!zoomMeetingId) return false;

    const endedAt = new Date();
    const meeting = (await this.meetingModel
      .findOneAndUpdate(
        {
          zoomMeetingId,
          status: { $in: [MeetingStatus.SCHEDULED, MeetingStatus.STARTED] },
        },
        { $set: { status: MeetingStatus.ENDED, endTimeUtc: endedAt } },
        { new: true },
      )
      .lean()) as MeetingLike | null;

    if (!meeting) return false;

    this.gateway.emitToConversation(
      meeting.conversationId,
      'meeting.ended',
      this.toPublicPayload(meeting),
    );
    return true;
  }

  async listUpcomingForConversation(conversationId: string, userId: string) {
    await this.conversationsService.getParticipants(conversationId, userId);

    const now = new Date();

    await this.meetingModel.updateMany(
      {
        conversationId,
        status: { $in: [MeetingStatus.SCHEDULED, MeetingStatus.STARTED] },
        endTimeUtc: { $lte: now },
      },
      { $set: { status: MeetingStatus.ENDED } },
    );

    const meetings = (await this.meetingModel
      .find({
        conversationId,
        status: { $in: [MeetingStatus.SCHEDULED, MeetingStatus.STARTED] },
        endTimeUtc: { $gt: now },
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
