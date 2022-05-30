import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from '../user/user.module';
import { GroupController } from './group.controller';
import { GroupRepository } from './group.repository';
import GroupService from './group.service';
import { GroupUserRepository } from './group.user.repository';

@Module({
  imports: [UsersModule, TypeOrmModule.forFeature([GroupRepository, GroupUserRepository])],
  providers: [GroupService],
  controllers: [GroupController],
  exports: [GroupService]
})
export class GroupModule {}
