import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { Bid, BidDocument } from './schemas/bid.schema';
import { CreateBidDto } from './dto/create-bid.dto';

@Injectable()
export class BidsService {

  constructor(
    @InjectModel(Bid.name)
    private bidModel: Model<BidDocument>,
  ) {}

  async create(dto: CreateBidDto, freelancerId: string) {
    try {
      const bid = new this.bidModel({
        ...dto,
        freelancerId,
      });

      return await bid.save();
    } catch (error) {
      throw new BadRequestException(`Failed to create bid: ${error.message}`);
    }
  }

  async findByTask(taskId: string) {
    try {
      return await this.bidModel.find({ taskId });
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException(`Failed to fetch bid: ${error.message}`);
    }
  }

}