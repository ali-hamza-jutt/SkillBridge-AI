import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private usersService: UsersService,
  ) {}

  async login(user: any) {
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

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: userId,
        name: existingUser.name,
        email: existingUser.email,
        role: existingUser.role,
      },
    };
  }
}