import {
  BadRequestException,
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

import { BidsService } from './bids.service';
import { CreateBidDto } from './dto/create-bid.dto';

import { ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

const MAX_BID_ATTACHMENT_COUNT = 10;
const MAX_BID_ATTACHMENT_SIZE_BYTES = 100 * 1024 * 1024;
const ALLOWED_BID_ATTACHMENT_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

@ApiTags('Bids')
@UseGuards(JwtAuthGuard)
@Controller('bids')
export class BidsController {
  constructor(private bidsService: BidsService) {}

  @Post('attachments/upload')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
        },
      },
    },
  })
  @UseInterceptors(
    FilesInterceptor('files', MAX_BID_ATTACHMENT_COUNT, {
      storage: memoryStorage(),
      limits: {
        fileSize: MAX_BID_ATTACHMENT_SIZE_BYTES,
      },
      fileFilter: (_req, file, callback) => {
        if (!ALLOWED_BID_ATTACHMENT_MIME_TYPES.has(file.mimetype)) {
          callback(
            new BadRequestException(
              `Unsupported file type: ${file.mimetype}. Allowed: photo, video, pdf, word.`,
            ),
            false,
          );
          return;
        }
        callback(null, true);
      },
    }),
  )
  uploadAttachments(@UploadedFiles() files: Express.Multer.File[]) {
    if (!files?.length) {
      throw new BadRequestException('At least one attachment file is required.');
    }
    return this.bidsService.uploadAttachments(files);
  }

  @Post()
  create(@Body() dto: CreateBidDto, @Req() req) {
    return this.bidsService.create(dto, req.user.userId);
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
