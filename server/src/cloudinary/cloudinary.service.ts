import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class CloudinaryService {
  private cloudinaryApiSecret = process.env.CLOUDINARY_API_SECRET;

  generateSignature(params: Record<string, string | number>) {
    if (!this.cloudinaryApiSecret) {
      throw new Error(
        'CLOUDINARY_API_SECRET is not configured. Cannot generate upload signatures.',
      );
    }

    const sortedParams = Object.keys(params)
      .sort()
      .reduce(
        (acc, key) => {
          acc[key] = params[key];
          return acc;
        },
        {} as Record<string, string | number>,
      );

    const queryString = Object.entries(sortedParams)
      .map(([key, value]) => `${key}=${value}`)
      .join('&');

    const signature = crypto
      .createHash('sha1')
      .update(queryString + this.cloudinaryApiSecret)
      .digest('hex');

    return signature;
  }
}
