import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody } from '@nestjs/swagger';
import { GCSService } from './gcs.service';
import { GenerateUploadUrlDto } from './dto/generate-upload-url.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Storage')
@UseGuards(JwtAuthGuard)
@Controller('storage')
export class GCSController {
  constructor(private readonly gcsService: GCSService) {}

  @Post('signed-url')
  @ApiOperation({
    summary: 'Generate a signed URL for direct browser upload to GCS',
    description:
      'Returns a V4 signed PUT URL (valid 15 min) and the public URL of the uploaded object.',
  })
  @ApiBody({ type: GenerateUploadUrlDto })
  generateSignedUrl(@Body() dto: GenerateUploadUrlDto) {
    return this.gcsService.generateSignedUploadUrl(
      dto.fileName,
      dto.mimeType,
      dto.folder,
    );
  }
}
