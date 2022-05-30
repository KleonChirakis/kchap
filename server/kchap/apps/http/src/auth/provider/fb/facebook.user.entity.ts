import { User } from '../../../user/user.entity';
import { Entity, PrimaryColumn, ManyToOne, JoinColumn } from 'typeorm';

@Entity({ name: "users_fb" })
export class FBUser {
  @PrimaryColumn({ name: 'fb_id', length: 128 })
  fbId: string;                                     // facebook id is numeric string, so use string type

  @ManyToOne(() => User, { cascade: true, onDelete: 'CASCADE', eager: true })
  @JoinColumn({ name: 'user_id' })
  user: User;

  constructor(fbId: string, user: User) {
    this.fbId = fbId;
    this.user = user;
  }
}