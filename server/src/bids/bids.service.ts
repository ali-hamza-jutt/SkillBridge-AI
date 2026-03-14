import { Injectable, NotFoundException } from '@nestjs/common';
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

    const bid = new this.bidModel({
      ...dto,
      freelancerId,
    });

    return bid.save();
  }

  async findByTask(taskId: string) {
    return this.bidModel.find({ taskId });
  }

  async delete(id: string) {

    const bid = await this.bidModel.findByIdAndDelete(id);

    if (!bid) {
      throw new NotFoundException("Bid not found");
    }

    return { message: "Bid deleted" };
  }

}