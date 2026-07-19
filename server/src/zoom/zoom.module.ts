import { Module } from '@nestjs/common';
import { ZoomService } from './zoom.service';
import { CacheModule } from '../cache/cache.module';

@Module({
  imports: [CacheModule],
  providers: [ZoomService],
  exports: [ZoomService],
})
export class ZoomModule {}
