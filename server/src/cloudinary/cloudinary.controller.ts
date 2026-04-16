import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CloudinaryService } from './cloudinary.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Cloudinary')
@UseGuards(JwtAuthGuard)
@Controller('cloudinary')
export class CloudinaryController {
  constructor(private cloudinaryService: CloudinaryService) {}

  @Post('signature')
  @ApiOperation({
    summary: 'Generate Cloudinary upload signature for client-side uploads',
    description:
      'Generates a signed upload token for secure direct browser uploads to Cloudinary.',
  })
  generateUploadSignature(
    @Body()
    body: {
      timestamp: number;
      folder?: string;
    },
  ) {
    const params = {
      timestamp: body.timestamp,
      ...(body.folder && { folder: body.folder }),
    };

    const signature = this.cloudinaryService.generateSignature(params);

    return {
      signature,
      timestamp: body.timestamp,
      api_key: process.env.CLOUDINARY_API_KEY,
    };
  }
}
