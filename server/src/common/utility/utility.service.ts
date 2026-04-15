import { BadRequestException, Injectable } from '@nestjs/common';
import { Types } from 'mongoose';

@Injectable()
export class UtilityService {
  ensureObjectId(value: string, fieldName: string) {
    if (!Types.ObjectId.isValid(value)) {
      throw new BadRequestException(`${fieldName} must be a valid ObjectId.`);
    }
  }

  normalize(value: string) {
    return value.trim().replace(/\s+/g, ' ');
  }
}
