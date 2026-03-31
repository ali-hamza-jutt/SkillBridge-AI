import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';

@Injectable()
export class CacheService {
  constructor(@InjectRedis() private readonly redis: Redis) {}

  async get(key: string): Promise<string | null> {
    try {
      return await this.redis.get(key);
    } catch (error) {
      throw new BadRequestException(`Failed to get cache: ${error.message}`);
    }
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    try {
      if (ttlSeconds) {
        await this.redis.set(key, value, 'EX', ttlSeconds);
        return;
      }

      await this.redis.set(key, value);
    } catch (error) {
      throw new BadRequestException(`Failed to set cache: ${error.message}`);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (error) {
      throw new BadRequestException(`Failed to delete cache: ${error.message}`);
    }
  }
}
