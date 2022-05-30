import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from 'apps/http/src/user/user.module';
import { FaceBookLocalStrategy } from '../../facebook.local.strategy';
import { FacebookUserRepository } from './facebook.repository';
import { FacebookService } from './facebook.service';

@Module({
  imports: [UsersModule, TypeOrmModule.forFeature([FacebookUserRepository])],
  providers: [FacebookService, FaceBookLocalStrategy],
  exports: [FacebookService]
})
export class FacebookModule {}