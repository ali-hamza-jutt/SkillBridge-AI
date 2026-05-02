import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { Bid, BidDocument } from './schemas/bid.schema';
import { CreateBidDto } from './dto/create-bid.dto';
import { User, UserDocument } from '../users/schemas/user.schema';
import { Task, TaskDocument } from '../tasks/schemas/task.schema';
import { NotificationsService } from '../notifications/notifications.service';

type BidLean = Bid & { _id: Types.ObjectId };
type UserNameLean = { _id: Types.ObjectId; name: string };

@Injectable()
export class BidsService {
  constructor(
    @InjectModel(Bid.name)
    private bidModel: Model<BidDocument>,
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
    @InjectModel(Task.name)
    private taskModel: Model<TaskDocument>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(dto: CreateBidDto, freelancerId: string) {
    try {
      const bid = await this.bidModel.create({ ...dto, freelancerId });

      const [task, freelancer] = await Promise.all([
        this.taskModel
          .findById(dto.taskId)
          .select('clientId title')
          .lean<{ _id: Types.ObjectId; clientId: string; title: string }>(),
        this.userModel
          .findById(freelancerId)
          .select('name')
          .lean<UserNameLean>(),
      ]);

      if (task && freelancer) {
        this.notificationsService.emitEvent('notification.bid.received', {
          recipientId: task.clientId,
          freelancerName: freelancer.name,
          taskTitle: task.title,
          taskId: String(task._id),
        });
      }

      return bid;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new BadRequestException(`Failed to create bid: ${msg}`);
    }
  }

  async findByTask(taskId: string) {
    try {
      const bids = await this.bidModel
        .find({ taskId })
        .sort({ createdAt: -1 })
        .lean<BidLean[]>();

      if (!bids.length) {
        return [];
      }

      const freelancerIds = Array.from(
        new Set(bids.map((bid) => bid.freelancerId).filter(Boolean)),
      );

      const freelancers = await this.userModel
        .find({ _id: { $in: freelancerIds } })
        .select('_id name')
        .lean<UserNameLean[]>();

      const freelancerMap = new Map(
        freelancers.map((f) => [String(f._id), f.name]),
      );

      return bids.map((bid) => ({
        ...bid,
        freelancerName:
          freelancerMap.get(bid.freelancerId) ?? 'Unknown Freelancer',
      }));
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new BadRequestException(`Failed to fetch bids: ${msg}`);
    }
  }

  async delete(id: string) {
    try {
      const bid = await this.bidModel.findByIdAndDelete(id);

      if (!bid) {
        throw new NotFoundException('Bid not found');
      }

      return { message: 'Bid deleted' };
    } catch (error: unknown) {
      if (error instanceof NotFoundException) throw error;
      const msg = error instanceof Error ? error.message : String(error);
      throw new BadRequestException(`Failed to delete bid: ${msg}`);
    }
  }

  async findBidById(id: string) {
    try {
      const bid = await this.bidModel.findById(id);
      if (!bid) {
        throw new NotFoundException('Bid not found');
      }
      return bid;
    } catch (error: unknown) {
      if (error instanceof NotFoundException) throw error;
      const msg = error instanceof Error ? error.message : String(error);
      throw new BadRequestException(`Failed to fetch bid: ${msg}`);
    }
  }
}
