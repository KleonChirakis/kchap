import { Injectable } from '@nestjs/common';
import { ResourceNotFoundException } from '../exception/resource.not.found.exception';
import { User } from './user.entity';
import { UserRepository } from './user.repository';

@Injectable()
export class UsersService {

  constructor(private userRepository: UserRepository) {}
  

  async findById(id: string): Promise<User> {
    const user = await this.userRepository.findById(id);
    if (user == null) throw new ResourceNotFoundException('USER', id);
    return user;
  }

  async findByMainEmail(email: string): Promise<User | undefined> {
    return this.userRepository.findByMainEmail(email);
  }
}