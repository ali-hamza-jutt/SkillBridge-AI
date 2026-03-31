import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';

import { User, UserDocument } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update.dto.user';

@Injectable()
export class UsersService {

  constructor(
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
  ) {}

  async create(createUserDto: CreateUserDto) {
    try {
      const hashedPassword = await bcrypt.hash(
        createUserDto.password,
        10,
      );

      const user = new this.userModel({
        ...createUserDto,
        password: hashedPassword,
      });

      return await user.save();
    } catch (error) {
      if (error.code === 11000) {
        throw new ConflictException('User email already exists');
      }
      throw new BadRequestException(`Failed to create user: ${error.message}`);
    }
  }

  async findAll() {
    try {
      return await this.userModel.find().select('-password');
    } catch (error) {
      throw new BadRequestException(`Failed to fetch users: ${error.message}`);
    }
  }

  async findById(id: string) {
    try {
      const user = await this.userModel
        .findById(id)
        .select('-password');

      if (!user) {
        throw new NotFoundException('User not found');
      }

      return user;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException(`Failed to fetch user: ${error.message}`);
    }
  }

  async findByEmail(email: string) {
    try {
      return await this.userModel.findOne({ email });
    } catch (error) {
      throw new BadRequestException(`Failed to find user by email: ${error.message}`);
    }
  }

  async findAuthById(id: string) {
    try {
      return await this.userModel.findById(id);
    } catch (error) {
      throw new BadRequestException(`Failed to fetch user: ${error.message}`);
    }
  }

  async updateRefreshTokenHash(id: string, refreshTokenHash: string | null) {
    try {
      await this.userModel.findByIdAndUpdate(id, { refreshTokenHash });
    } catch (error) {
      throw new BadRequestException(`Failed to update refresh token: ${error.message}`);
    }
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    try {
      const user = await this.userModel.findByIdAndUpdate(
        id,
        updateUserDto,
        { new: true },
      );

      if (!user) {
        throw new NotFoundException('User not found');
      }

      return user;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException(`Failed to update user: ${error.message}`);
    }
  }

  async delete(id: string) {
    try {
      const user = await this.userModel.findByIdAndDelete(id);

      if (!user) {
        throw new NotFoundException('User not found');
      }

      return { message: 'User deleted successfully' };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException(`Failed to delete user: ${error.message}`);
    }
  }

}