import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import webpush from 'web-push';

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
};

export type PushSub = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

@Injectable()
export class WebPushService implements OnModuleInit {
  private readonly logger = new Logger(WebPushService.name);
  private enabled = false;

  onModuleInit() {
    const subject = process.env.VAPID_SUBJECT ?? '';
    const publicKey = process.env.VAPID_PUBLIC_KEY ?? '';
    const privateKey = process.env.VAPID_PRIVATE_KEY ?? '';

    if (!subject || !publicKey || !privateKey) {
      this.logger.warn('VAPID keys not configured — web push disabled');
      return;
    }

    webpush.setVapidDetails(subject, publicKey, privateKey);
    this.enabled = true;
    this.logger.log('Web push initialized');
  }

  async send(sub: PushSub, payload: PushPayload): Promise<'ok' | 'expired'> {
    if (!this.enabled) return 'ok';

    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: sub.keys },
        JSON.stringify(payload),
      );
      return 'ok';
    } catch (err: unknown) {
      const status = (err as { statusCode?: number })?.statusCode;
      if (status === 410 || status === 404) {
        return 'expired';
      }
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Push failed for ${sub.endpoint}: ${msg}`);
      return 'ok';
    }
  }
}
