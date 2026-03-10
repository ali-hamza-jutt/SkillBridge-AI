import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import {JwtModule} from "@nestjs/jwt";
import {ThrottlerModule, ThrottlerGuard} from  "@nestjs/throttler";
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports:[
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 60000,
        limit: 10,
      },
    ]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'default_secret',
      signOptions: { expiresIn: '1h' },
    }),
  ],
  providers: [AuthService, {
    provide: APP_GUARD,
    useClass: ThrottlerGuard,
  }],
  controllers: [AuthController]
})
export class AuthModule {}
