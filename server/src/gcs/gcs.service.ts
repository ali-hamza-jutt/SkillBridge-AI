import { Injectable } from '@nestjs/common';
import { Storage } from '@google-cloud/storage';
import { randomUUID } from 'crypto';
import * as path from 'path';

@Injectable()
export class GCSService {
  private readonly storage: Storage;
  private readonly bucketName: string;

  constructor() {
    this.bucketName = process.env.GCS_BUCKET_NAME ?? '';
    const keyJson = process.env.GCS_SERVICE_ACCOUNT_JSON;
    this.storage = new Storage({
      projectId: process.env.GCS_PROJECT_ID,
      ...(keyJson ? { credentials: JSON.parse(keyJson) as object } : {}),
    });
  }

  async generateSignedUploadUrl(
    fileName: string,
    mimeType: string,
    folder = 'uploads',
  ): Promise<{ signedUrl: string; publicUrl: string; objectName: string }> {
    if (!this.bucketName) {
      throw new Error('GCS_BUCKET_NAME is not configured.');
    }

    const ext = path.extname(fileName);
    const objectName = `${folder}/${randomUUID()}${ext}`;

    const [signedUrl] = await this.storage
      .bucket(this.bucketName)
      .file(objectName)
      .getSignedUrl({
        version: 'v4',
        action: 'write',
        expires: Date.now() + 15 * 60 * 1000,
        contentType: mimeType,
      });

    const publicUrl = `https://storage.googleapis.com/${this.bucketName}/${objectName}`;
    return { signedUrl, publicUrl, objectName };
  }
}
