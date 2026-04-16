import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody } from '@nestjs/swagger';
import { CloudinaryService } from './cloudinary.service';
import { GenerateUploadSignatureDto } from './dto/generate-upload-signature.dto';
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
  @ApiBody({ type: GenerateUploadSignatureDto })
  generateUploadSignature(@Body() dto: GenerateUploadSignatureDto) {
    const params = {
      timestamp: dto.timestamp,
      ...(dto.folder && { folder: dto.folder }),
    };

    const signature = this.cloudinaryService.generateSignature(params);

    return {
      signature,
      timestamp: dto.timestamp,
      api_key: process.env.CLOUDINARY_API_KEY,
    };
  }
}
