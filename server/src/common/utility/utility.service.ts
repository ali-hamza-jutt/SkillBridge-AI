import { BadRequestException, Injectable } from '@nestjs/common';
import { Types } from 'mongoose';

@Injectable()
export class UtilityService {
  ensureObjectId(value: string, fieldName: string) {
    if (!Types.ObjectId.isValid(value)) {
      throw new BadRequestException(`${fieldName} must be a valid ObjectId.`);
    }
  }

  normalizeObjectId(value: string, fieldName: string) {
    const normalizedValue = value.trim();
    this.ensureObjectId(normalizedValue, fieldName);
    return normalizedValue;
  }

  normalize(value: string) {
    return value.trim().replace(/\s+/g, ' ');
  }

  toISOString(value?: Date | string | null): string | null {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString();
  }
}
