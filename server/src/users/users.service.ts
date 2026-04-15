import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';

import { User, UserDocument } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update.dto.user';
import { SkillsService } from '../skills/skills.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
    private readonly skillsService: SkillsService,
  ) {}

  async create(createUserDto: CreateUserDto) {
    try {
      const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

      const role = createUserDto.role;
      const isFreelancer = role === 'FREELANCER';

      let validatedSkills: string[] = [];
      let categoryId = createUserDto.categoryId;

      if (isFreelancer) {
        if (!categoryId) {
          throw new BadRequestException('Freelancer category is required.');
        }

        validatedSkills = await this.skillsService.validateSkillsForCategory(
          categoryId,
          createUserDto.skills ?? [],
        );
      } else {
        categoryId = undefined;
      }

      const user = new this.userModel({
        ...createUserDto,
        role,
        categoryId,
        skills: validatedSkills,
        password: hashedPassword,
      });

      return await user.save();
    } catch (error:any) {
      if (error.code === 11000) {
        throw new ConflictException('User email already exists');
      }
      throw new BadRequestException(`Failed to create user: ${error.message}`);
    }
  }

  async findAll() {
    try {
      return await this.userModel.find().select('-password');
    } catch (error:any) {
      throw new BadRequestException(`Failed to fetch users: ${error.message}`);
    }
  }

  async findById(id: string) {
    try {
      const user = await this.userModel.findById(id).select('-password');

      if (!user) {
        throw new NotFoundException('User not found');
      }

      return user;
    } catch (error:any) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException(`Failed to fetch user: ${error.message}`);
    }
  }

  async findByEmail(email: string) {
    try {
      return await this.userModel.findOne({ email });
    } catch (error:any) {
      throw new BadRequestException(
        `Failed to find user by email: ${error.message}`,
      );
    }
  }

  async findAuthById(id: string) {
    try {
      return await this.userModel.findById(id);
    } catch (error:any) {
      throw new BadRequestException(`Failed to fetch user: ${error.message}`);
    }
  }

  async updateRefreshTokenHash(id: string, refreshTokenHash: string | null) {
    try {
      await this.userModel.findByIdAndUpdate(id, { refreshTokenHash });
    } catch (error:any) {
      throw new BadRequestException(
        `Failed to update refresh token: ${error.message}`,
      );
    }
  }

  async updateMyProfile(id: string, dto: UpdateUserDto) {
    try {
      const user = await this.userModel.findById(id);

      if (!user) {
        throw new NotFoundException('User not found');
      }

      if (typeof dto.name !== 'undefined') {
        user.name = dto.name;
      }

      if (user.role !== 'FREELANCER') {
        if (typeof dto.categoryId !== 'undefined' || typeof dto.skills !== 'undefined') {
          throw new BadRequestException(
            'Only freelancers can update category and skills.',
          );
        }
      } else {
        if (typeof dto.categoryId !== 'undefined') {
          user.categoryId = dto.categoryId;
        }

        if (typeof dto.skills !== 'undefined') {
          if (!user.categoryId) {
            throw new BadRequestException(
              'Freelancer category is required before updating skills.',
            );
          }

          user.skills = await this.skillsService.validateSkillsForCategory(
            user.categoryId,
            dto.skills,
          );
        }
      }

      const updated = await user.save();
      const userObject = updated.toObject() as unknown as {
        password?: string;
        refreshTokenHash?: string;
        [key: string]: unknown;
      };
      const { password: _password, refreshTokenHash: _refreshTokenHash, ...safeUser } =
        userObject;
      return safeUser;
    } catch (error:any) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException(`Failed to update profile: ${error.message}`);
    }
  }

  async delete(id: string) {
    try {
      const user = await this.userModel.findByIdAndDelete(id);

      if (!user) {
        throw new NotFoundException('User not found');
      }

      return { message: 'User deleted successfully' };
    } catch (error:any) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException(`Failed to delete user: ${error.message}`);
    }
  }
}
