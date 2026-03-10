import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import {MongooseModule} from "@nestjs/mongoose";
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    MongooseModule.forRoot('mongodb://mongodb:27017/marketplace'),
    AuthModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
