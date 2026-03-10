import { Module } from '@nestjs/common';
import { RedisModule } from '@nestjs-modules/ioredis';
import { CacheService } from './cache.service';

@Module({
  imports: [
    RedisModule.forRoot({
      type: 'single',
      url: 'redis://localhost:6379',
    }),
  ],
  providers: [CacheService],
  exports: [CacheService],
})
export class CacheModule {}
