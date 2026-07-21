import { createHmac, timingSafeEqual } from 'node:crypto';
import {
  Body,
  Controller,
  Headers,
  HttpCode,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';

import { MeetingsService } from './meetings.service';

const ZOOM_SIGNATURE_TOLERANCE_MS = 5 * 60 * 1000;

type ZoomWebhookPayload = {
  event?: string;
  payload?: {
    plainToken?: string;
    object?: {
      id?: string | number;
    };
  };
};

@Controller('meetings/webhooks')
export class MeetingsWebhookController {
  constructor(private readonly meetingsService: MeetingsService) {}

  @Post('zoom')
  @HttpCode(200)
  async handleZoomWebhook(
    @Req() request: RawBodyRequest<Request>,
    @Body() body: ZoomWebhookPayload,
    @Headers('x-zm-request-timestamp') timestamp?: string,
    @Headers('x-zm-signature') signature?: string,
  ) {
    const secret = process.env.ZOOM_WEBHOOK_SECRET_TOKEN?.trim();
    if (!secret) {
      throw new UnauthorizedException('Zoom webhook is not configured');
    }

    if (body.event === 'endpoint.url_validation') {
      const plainToken = body.payload?.plainToken;
      if (!plainToken) {
        throw new UnauthorizedException('Invalid Zoom validation request');
      }

      return {
        plainToken,
        encryptedToken: createHmac('sha256', secret).update(plainToken).digest('hex'),
      };
    }

    this.assertValidSignature(request.rawBody, timestamp, signature, secret);

    if (body.event === 'meeting.ended') {
      const meetingId = body.payload?.object?.id;
      if (meetingId !== undefined && meetingId !== null) {
        await this.meetingsService.markZoomMeetingEnded(String(meetingId));
      }
    }

    return { ok: true };
  }

  private assertValidSignature(
    rawBody: Buffer | undefined,
    timestamp: string | undefined,
    signature: string | undefined,
    secret: string,
  ) {
    const timestampSeconds = Number(timestamp);
    const timestampMilliseconds = timestampSeconds * 1000;

    if (
      !rawBody ||
      !signature ||
      !Number.isFinite(timestampSeconds) ||
      Math.abs(Date.now() - timestampMilliseconds) > ZOOM_SIGNATURE_TOLERANCE_MS
    ) {
      throw new UnauthorizedException('Invalid Zoom webhook signature');
    }

    const message = `v0:${timestamp}:${rawBody.toString('utf8')}`;
    const expectedSignature = `v0=${createHmac('sha256', secret).update(message).digest('hex')}`;
    const supplied = Buffer.from(signature);
    const expected = Buffer.from(expectedSignature);

    if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
      throw new UnauthorizedException('Invalid Zoom webhook signature');
    }
  }
}
