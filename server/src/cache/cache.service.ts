import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';

function formatCacheError(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

@Injectable()
export class CacheService {
  constructor(@InjectRedis() private readonly redis: Redis) {}

  async get(key: string): Promise<string | null> {
    try {
      return await this.redis.get(key);
    } catch (error) {
      throw new BadRequestException(`Failed to get cache: ${formatCacheError(error)}`);
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
      throw new BadRequestException(`Failed to set cache: ${formatCacheError(error)}`);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (error) {
      throw new BadRequestException(`Failed to delete cache: ${formatCacheError(error)}`);
    }
  }

  async hGet(key: string, field: string): Promise<string | null> {
    try {
      return await this.redis.hget(key, field);
    } catch (error) {
      throw new BadRequestException(`Failed to get hash field: ${formatCacheError(error)}`);
    }
  }

  async hGetAll(key: string): Promise<Record<string, string>> {
    try {
      return await this.redis.hgetall(key);
    } catch (error) {
      throw new BadRequestException(`Failed to get hash: ${formatCacheError(error)}`);
    }
  }

  async hSet(key: string, field: string, value: string | number): Promise<number> {
    try {
      return await this.redis.hset(key, field, String(value));
    } catch (error) {
      throw new BadRequestException(`Failed to set hash field: ${formatCacheError(error)}`);
    }
  }

  async hIncrBy(key: string, field: string, increment = 1): Promise<number> {
    try {
      return await this.redis.hincrby(key, field, increment);
    } catch (error) {
      throw new BadRequestException(`Failed to increment hash field: ${formatCacheError(error)}`);
    }
  }

  async expire(key: string, ttlSeconds: number): Promise<number> {
    try {
      return await this.redis.expire(key, ttlSeconds);
    } catch (error) {
      throw new BadRequestException(`Failed to expire cache key: ${formatCacheError(error)}`);
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      return (await this.redis.exists(key)) > 0;
    } catch (error) {
      throw new BadRequestException(`Failed to check cache existence: ${formatCacheError(error)}`);
    }
  }
}
