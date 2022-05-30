import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserRepository } from './user.repository';
import { UsersService } from './users.service';

/**
 * No controller since {@link AuthController} is used for these endpoints.
 */
@Module({
  imports: [TypeOrmModule.forFeature([UserRepository])],
  providers: [UsersService],
  exports: [UsersService, TypeOrmModule.forFeature([UserRepository])],
})
export class UsersModule {}