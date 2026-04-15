import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { Bid, BidDocument } from './schemas/bid.schema';
import { BidPayoutType, CreateBidDto } from './dto/create-bid.dto';
import { BidAttachmentsStorageService } from './bid-attachments.storage';

@Injectable()
export class BidsService {
  constructor(
    @InjectModel(Bid.name)
    private bidModel: Model<BidDocument>,
    private bidAttachmentsStorageService: BidAttachmentsStorageService,
  ) {}

  async uploadAttachments(files: Express.Multer.File[]) {
    try {
      return this.bidAttachmentsStorageService.uploadMany(files);
    } catch (error: any) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Failed to upload attachments: ${error.message}`);
    }
  }

  async create(dto: CreateBidDto, freelancerId: string) {
    try {
      if (dto.payoutType === BidPayoutType.WHOLE && dto.modules?.length) {
        throw new BadRequestException(
          'Modules should not be provided when payoutType is whole.',
        );
      }

      if (
        dto.payoutType === BidPayoutType.MODULE_BASED &&
        (!dto.modules || dto.modules.length === 0)
      ) {
        throw new BadRequestException(
          'At least one module is required when payoutType is module_based.',
        );
      }

      const bid = new this.bidModel({
        ...dto,
        freelancerId,
      });

      return await bid.save();
    } catch (error:any) {
      throw new BadRequestException(`Failed to create bid: ${error.message}`);
    }
  }

  async findByTask(taskId: string) {
    try {
      return await this.bidModel.find({ taskId });
    } catch (error:any) {
      throw new BadRequestException(`Failed to fetch bids: ${error.message}`);
    }
  }

  async delete(id: string) {
    try {
      const bid = await this.bidModel.findByIdAndDelete(id);

      if (!bid) {
        throw new NotFoundException('Bid not found');
      }

      return { message: 'Bid deleted' };
    } catch (error:any) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException(`Failed to delete bid: ${error.message}`);
    }
  }
  async findBidById(id: string) {
    try {
      const bid = await this.bidModel.findById(id);
      if (!bid) {
        throw new NotFoundException('Bid not found');
      }
      return bid;
    } catch (error:any) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException(`Failed to fetch bid: ${error.message}`);
    }
  }
}
