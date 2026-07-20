import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { CacheService } from '../cache/cache.service';

const ZOOM_OAUTH_URL = 'https://zoom.us/oauth/token';
const ZOOM_API_BASE = 'https://api.zoom.us/v2';
const ACCESS_TOKEN_CACHE_KEY = 'zoom:access_token';

export interface ZoomMeeting {
  id: number;
  joinUrl: string;
  startUrl: string;
}

interface CreateMeetingParams {
  topic: string;
  type: 1 | 2;
  durationMinutes: number;
  startTimeUtc?: Date;
}

@Injectable()
export class ZoomService {
  private readonly accountId: string;
  private readonly clientId: string;
  private readonly clientSecret: string;

  constructor(private readonly cacheService: CacheService) {
    this.accountId = process.env.ZOOM_ACCOUNT_ID ?? '';
    this.clientId = process.env.ZOOM_CLIENT_ID ?? '';
    this.clientSecret = process.env.ZOOM_CLIENT_SECRET ?? '';
  }

  private async getAccessToken(): Promise<string> {
    const cached = await this.cacheService.get(ACCESS_TOKEN_CACHE_KEY);
    if (cached) return cached;

    const basicAuth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
    const response = await fetch(
      `${ZOOM_OAUTH_URL}?grant_type=account_credentials&account_id=${this.accountId}`,
      { method: 'POST', headers: { Authorization: `Basic ${basicAuth}` } },
    );

    if (!response.ok) {
      throw new InternalServerErrorException(`Zoom OAuth failed: ${response.status} ${await response.text()}`);
    }

    const data = (await response.json()) as { access_token: string; expires_in: number };
    await this.cacheService.set(ACCESS_TOKEN_CACHE_KEY, data.access_token, Math.max(data.expires_in - 60, 60));
    return data.access_token;
  }

  async createMeeting(params: CreateMeetingParams): Promise<ZoomMeeting> {
    const accessToken = await this.getAccessToken();

    const body: Record<string, unknown> = {
      topic: params.topic,
      type: params.type,
      duration: params.durationMinutes,
      settings: {
        join_before_host: true,
        waiting_room: false,
        host_video: true,
        participant_video: true,
      },
    };

    // Always hand Zoom a UTC instant — the app never needs to translate to a
    // participant's local timezone for the Zoom API call itself, only for display.
    if (params.type === 2 && params.startTimeUtc) {
      body.start_time = params.startTimeUtc.toISOString();
      body.timezone = 'UTC';
    }

    const response = await fetch(`${ZOOM_API_BASE}/users/me/meetings`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new InternalServerErrorException(`Zoom create meeting failed: ${response.status} ${await response.text()}`);
    }

    const data = (await response.json()) as { id: number; join_url: string; start_url: string };
    return { id: data.id, joinUrl: data.join_url, startUrl: data.start_url };
  }
}
