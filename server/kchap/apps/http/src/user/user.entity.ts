import { GroupUser } from '../group/group.user.entity';
import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { TransactionUser } from '../transaction/transaction.user.entity';
import { Transfer } from '../transfer/transfer.entity';

export enum Provider {
  LOCAL = "local",
  FACEBOOK = "fb",
  GOOGLE = "google"
}

@Entity({ name: "users" })
export class User {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ length: 40 })
  name: string;

  @Column({ type: "enum", enum: Provider, name: "main_provider" })
  mainProvider: Provider;                                               // Provider of login. string is also supported, using enum for TS support

  @Column({ name: "is_deleted", default: false, select: false })
  isDeleted: boolean;


  @OneToMany(() => GroupUser, groupUsers => groupUsers.user)
  groupUsers: GroupUser[];

  @OneToMany(() => Transfer, transfer => transfer.fromUser)
  transferFromUser: Transfer;

  @OneToMany(() => Transfer, transfer => transfer.toUser)
  transferToUser: Transfer;

  @OneToMany(() => Transfer, transfer => transfer.createdBy)
  transferCreatedBy: Transfer;

  @OneToMany(() => TransactionUser, user => user.transaction)
  transactions: TransactionUser[];
}