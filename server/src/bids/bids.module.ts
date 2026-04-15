import { Module } from '@nestjs/common';
import { BidsService } from './bids.service';
import { BidsController } from './bids.controller';
import { BidAttachmentsStorageService } from './bid-attachments.storage';

import { MongooseModule } from '@nestjs/mongoose';
import { Bid, BidSchema } from './schemas/bid.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: Bid.name, schema: BidSchema }])],
  controllers: [BidsController],
  providers: [BidsService, BidAttachmentsStorageService],
  exports: [BidsService],
})
export class BidsModule {}
