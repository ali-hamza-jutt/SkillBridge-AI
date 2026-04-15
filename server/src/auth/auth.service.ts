import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { SignupDto } from './dto/signup.dto';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private usersService: UsersService,
  ) {}

  private async generateTokens(payload: { email: string; sub: string }) {
    try {
      const accessTokenTtl = Number(
        process.env.JWT_ACCESS_EXPIRES_SECONDS ?? 900,
      );
      const refreshTokenTtl = Number(
        process.env.JWT_REFRESH_EXPIRES_SECONDS ?? 604800,
      );

      const accessToken = this.jwtService.sign(payload, {
        secret: process.env.JWT_SECRET || 'default_secret',
        expiresIn: accessTokenTtl,
      });

      const refreshToken = this.jwtService.sign(payload, {
        secret: process.env.JWT_REFRESH_SECRET || 'default_refresh_secret',
        expiresIn: refreshTokenTtl,
      });

      return { accessToken, refreshToken };
    } catch (error) {
      throw new BadRequestException(
        `Failed to generate tokens: ${error.message}`,
      );
    }
  }

  async signup(signupDto: SignupDto) {
    try {
      const createdUser = await this.usersService.create({
        name: signupDto.name,
        email: signupDto.email,
        password: signupDto.password,
        skills: signupDto.skills ?? [],
        categoryId: signupDto.categoryId,
        role: signupDto.role,
      });

      const userId = createdUser._id?.toString() ?? createdUser.id;
      const payload = { email: createdUser.email, sub: userId };
      const { accessToken, refreshToken } = await this.generateTokens(payload);
      const refreshTokenHash = await bcrypt.hash(refreshToken, 10);

      await this.usersService.updateRefreshTokenHash(userId, refreshTokenHash);

      return {
        access_token: accessToken,
        refresh_token: refreshToken,
        user: {
          id: userId,
          name: createdUser.name,
          email: createdUser.email,
          role: createdUser.role,
          categoryId: createdUser.categoryId,
          skills: createdUser.skills,
        },
      };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }
      throw new BadRequestException(`Signup failed: ${error.message}`);
    }
  }

  async login(user: LoginDto) {
    try {
      const existingUser = await this.usersService.findByEmail(user.email);

      if (!existingUser) {
        throw new UnauthorizedException('Invalid credentials');
      }

      const isValidPassword = await bcrypt.compare(
        user.password ?? '',
        existingUser.password,
      );

      if (!isValidPassword) {
        throw new UnauthorizedException('Invalid credentials');
      }

      const userId = existingUser._id?.toString() ?? existingUser.id;
      const payload = { email: existingUser.email, sub: userId };
      const { accessToken, refreshToken } = await this.generateTokens(payload);
      const refreshTokenHash = await bcrypt.hash(refreshToken, 10);

      await this.usersService.updateRefreshTokenHash(userId, refreshTokenHash);

      return {
        access_token: accessToken,
        refresh_token: refreshToken,
        user: {
          id: userId,
          name: existingUser.name,
          email: existingUser.email,
          role: existingUser.role,
          categoryId: existingUser.categoryId,
          skills: existingUser.skills,
        },
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new BadRequestException(`Login failed: ${error.message}`);
    }
  }

  async refresh(refreshTokenDto: RefreshTokenDto) {
    try {
      const { refreshToken } = refreshTokenDto;

      let payload: { sub: string; email: string };

      try {
        payload = this.jwtService.verify(refreshToken, {
          secret: process.env.JWT_REFRESH_SECRET || 'default_refresh_secret',
        });
      } catch (jwtError) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const user = await this.usersService.findAuthById(payload.sub);

      if (!user?.refreshTokenHash) {
        throw new UnauthorizedException('Refresh token not found');
      }

      const isRefreshTokenValid = await bcrypt.compare(
        refreshToken,
        user.refreshTokenHash,
      );

      if (!isRefreshTokenValid) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const userId = user._id?.toString() ?? user.id;
      const tokens = await this.generateTokens({
        email: user.email,
        sub: userId,
      });
      const refreshTokenHash = await bcrypt.hash(tokens.refreshToken, 10);

      await this.usersService.updateRefreshTokenHash(userId, refreshTokenHash);

      return {
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        user: {
          id: userId,
          name: user.name,
          email: user.email,
          role: user.role,
          categoryId: user.categoryId,
          skills: user.skills,
        },
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new BadRequestException(`Token refresh failed: ${error.message}`);
    }
  }
}
