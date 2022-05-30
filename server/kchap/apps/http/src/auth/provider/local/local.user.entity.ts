import { User } from '../../../user/user.entity';
import { Entity, Column, JoinColumn, OneToOne, Index } from 'typeorm';

@Entity({ name: "users_kchap" })
@Index("users_kchap_lower_email_idx", { synchronize: false })      // TypeORM does not support some index expressions (lower index for  case-insensitive comparison). Create index manually and prevent TypeORM for altering it during synchronization
export class LocalUser {
  @Column({ length: 254 })         // Unique constraint provided by custom index
  email: string;                   // PostgreSQL supports ILIKE operator for case-insesitive text search, but is primarily used for fuzzy string pattern matching or when the pattern is not left-anchored. We only need to search for one word (email), so using a plain index is easier and slightly better in performance

  @Column({ length: 60 })
  password: string;

  @OneToOne(() => User, {  primary: true, cascade: true, onDelete: 'CASCADE', eager: true })     // Eager loading does not seem to work
  @JoinColumn({ name: 'user_id' })
  mainUser: User;

  constructor(mainUser: User, password: string, email: string) {
    this.mainUser = mainUser;
    this.password = password;
    this.email = email;
  }
}