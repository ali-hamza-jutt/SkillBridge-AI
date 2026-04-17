import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { Bid, BidDocument } from './schemas/bid.schema';
import { CreateBidDto } from './dto/create-bid.dto';
import { User, UserDocument } from '../users/schemas/user.schema';

@Injectable()
export class BidsService {
  constructor(
    @InjectModel(Bid.name)
    private bidModel: Model<BidDocument>,
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
  ) {}

  async create(dto: CreateBidDto, freelancerId: string) {
    try {
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
      const bids = await this.bidModel.find({ taskId }).sort({ createdAt: -1 }).lean();

      if (!bids.length) {
        return [];
      }

      const freelancerIds = Array.from(
        new Set(
          bids
            .map((bid: any) => bid.freelancerId)
            .filter((freelancerId: string | undefined) => !!freelancerId),
        ),
      );

      const freelancers = await this.userModel
        .find({ _id: { $in: freelancerIds } })
        .select('_id name')
        .lean();

      const freelancerMap = new Map(
        freelancers.map((freelancer: any) => [String(freelancer._id), freelancer]),
      );

      return bids.map((bid: any) => ({
        ...bid,
        freelancerName:
          freelancerMap.get(String(bid.freelancerId))?.name ?? 'Unknown Freelancer',
      }));
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
