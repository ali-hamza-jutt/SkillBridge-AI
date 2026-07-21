import { createHmac } from 'node:crypto';
import { UnauthorizedException } from '@nestjs/common';

import { MeetingsWebhookController } from './meetings-webhook.controller';

jest.mock('./meetings.service', () => ({
  MeetingsService: class MeetingsService {},
}));

describe('MeetingsWebhookController', () => {
  const webhookSecret = 'test-webhook-secret';
  const originalSecret = process.env.ZOOM_WEBHOOK_SECRET_TOKEN;

  beforeEach(() => {
    process.env.ZOOM_WEBHOOK_SECRET_TOKEN = webhookSecret;
    jest.clearAllMocks();
  });

  afterAll(() => {
    if (originalSecret === undefined) {
      delete process.env.ZOOM_WEBHOOK_SECRET_TOKEN;
    } else {
      process.env.ZOOM_WEBHOOK_SECRET_TOKEN = originalSecret;
    }
  });

  it('answers the Zoom endpoint validation challenge', async () => {
    const meetingsService = { markZoomMeetingEnded: jest.fn() };
    const controller = new MeetingsWebhookController(meetingsService as never);
    const body = {
      event: 'endpoint.url_validation',
      payload: { plainToken: 'plain-token' },
    };

    const response = await controller.handleZoomWebhook(
      { rawBody: Buffer.from(JSON.stringify(body)) } as never,
      body,
    );

    expect(response).toEqual({
      plainToken: 'plain-token',
      encryptedToken: createHmac('sha256', webhookSecret).update('plain-token').digest('hex'),
    });
  });

  it('marks a meeting ended when Zoom sends a valid signed event', async () => {
    const meetingsService = {
      markZoomMeetingEnded: jest.fn().mockResolvedValue(true),
    };
    const controller = new MeetingsWebhookController(meetingsService as never);
    const body = {
      event: 'meeting.ended',
      payload: { object: { id: 123456789 } },
    };
    const rawBody = Buffer.from(JSON.stringify(body));
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const message = `v0:${timestamp}:${rawBody.toString('utf8')}`;
    const signature = `v0=${createHmac('sha256', webhookSecret).update(message).digest('hex')}`;

    await controller.handleZoomWebhook(
      { rawBody } as never,
      body,
      timestamp,
      signature,
    );

    expect(meetingsService.markZoomMeetingEnded).toHaveBeenCalledWith('123456789');
  });

  it('rejects a meeting event with an invalid signature', async () => {
    const meetingsService = { markZoomMeetingEnded: jest.fn() };
    const controller = new MeetingsWebhookController(meetingsService as never);
    const body = {
      event: 'meeting.ended',
      payload: { object: { id: 123456789 } },
    };

    await expect(
      controller.handleZoomWebhook(
        { rawBody: Buffer.from(JSON.stringify(body)) } as never,
        body,
        Math.floor(Date.now() / 1000).toString(),
        'v0=invalid',
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(meetingsService.markZoomMeetingEnded).not.toHaveBeenCalled();
  });
});
