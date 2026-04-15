import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import {
  BidAttachmentDto,
  BidAttachmentType,
} from './dto/create-bid.dto';

const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024;

const ALLOWED_MIME_TO_TYPE: Record<string, BidAttachmentType> = {
  'image/jpeg': BidAttachmentType.PHOTO,
  'image/jpg': BidAttachmentType.PHOTO,
  'image/png': BidAttachmentType.PHOTO,
  'image/webp': BidAttachmentType.PHOTO,
  'image/gif': BidAttachmentType.PHOTO,
  'video/mp4': BidAttachmentType.VIDEO,
  'video/webm': BidAttachmentType.VIDEO,
  'video/quicktime': BidAttachmentType.VIDEO,
  'application/pdf': BidAttachmentType.PDF,
  'application/msword': BidAttachmentType.WORD,
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    BidAttachmentType.WORD,
};

@Injectable()
export class BidAttachmentsStorageService {
  constructor() {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      return;
    }

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });
  }

  async uploadMany(files: Express.Multer.File[]): Promise<BidAttachmentDto[]> {
    const uploadPromises = files.map((file) => this.uploadOne(file));
    return Promise.all(uploadPromises);
  }

  private async uploadOne(file: Express.Multer.File): Promise<BidAttachmentDto> {
    if (!this.isCloudinaryConfigured()) {
      throw new ServiceUnavailableException(
        'File storage is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET.',
      );
    }

    const attachmentType = ALLOWED_MIME_TO_TYPE[file.mimetype];

    if (!attachmentType) {
      throw new BadRequestException(
        `Unsupported attachment type: ${file.mimetype}. Allowed: photos, videos, pdf, word.`,
      );
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw new BadRequestException(
        `Attachment ${file.originalname} exceeds 100 MB size limit.`,
      );
    }

    const resourceType =
      attachmentType === BidAttachmentType.PHOTO
        ? 'image'
        : attachmentType === BidAttachmentType.VIDEO
          ? 'video'
          : 'raw';

    const folder = process.env.CLOUDINARY_BID_ATTACHMENTS_FOLDER || 'skill-bridge/bid-attachments';

    const uploaded = await new Promise<{
      secure_url: string;
    }>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: resourceType,
          use_filename: true,
          unique_filename: true,
          overwrite: false,
        },
        (error, result) => {
          if (error || !result) {
            reject(
              error ||
                new Error('Failed to upload attachment to cloud storage.'),
            );
            return;
          }
          resolve({ secure_url: result.secure_url });
        },
      );

      stream.end(file.buffer);
    });

    return {
      fileName: file.originalname,
      type: attachmentType,
      url: uploaded.secure_url,
      sizeMb: Number((file.size / (1024 * 1024)).toFixed(2)),
    };
  }

  private isCloudinaryConfigured(): boolean {
    return Boolean(
      process.env.CLOUDINARY_CLOUD_NAME &&
        process.env.CLOUDINARY_API_KEY &&
        process.env.CLOUDINARY_API_SECRET,
    );
  }
}
