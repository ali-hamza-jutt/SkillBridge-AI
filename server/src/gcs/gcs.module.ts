import { Module } from '@nestjs/common';
import { GCSController } from './gcs.controller';
import { GCSService } from './gcs.service';

@Module({
  controllers: [GCSController],
  providers: [GCSService],
  exports: [GCSService],
})
export class GCSModule {}
