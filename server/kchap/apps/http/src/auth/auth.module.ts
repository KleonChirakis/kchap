import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersModule } from '../user/user.module';
import { PassportModule } from '@nestjs/passport';
import { LocalStrategy } from './local.strategy';
import { SessionSerializer } from './session.serializer';
import { FacebookModule } from './provider/fb/facebook.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LocalUserRepository } from './provider/local/local.user.repository';
import { AuthController } from './auth.controller';
import { MongoModule } from '../db/mongo.module';

@Module({
  imports: [UsersModule, PassportModule, FacebookModule, TypeOrmModule.forFeature([LocalUserRepository]), MongoModule],
  providers: [AuthService, SessionSerializer, LocalStrategy],
  controllers: [AuthController],
  exports: [AuthService]
})
export class AuthModule {}
