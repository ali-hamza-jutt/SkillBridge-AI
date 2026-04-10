import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';

import { BidsService } from './bids.service';
import { CreateBidDto } from './dto/create-bid.dto';

import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@ApiTags('Bids')
@UseGuards(JwtAuthGuard)
@Controller('bids')
export class BidsController {
  constructor(private bidsService: BidsService) {}

  @Post()
  create(@Body() dto: CreateBidDto) {
    return this.bidsService.create(dto, 'FREELANCER_ID');
  }

  @Get('task/:taskId')
  findByTask(@Param('taskId') taskId: string) {
    return this.bidsService.findByTask(taskId);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.bidsService.delete(id);
  }
}
