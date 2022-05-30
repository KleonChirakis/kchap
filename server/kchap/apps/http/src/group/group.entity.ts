import { Transaction } from '../transaction/transaction.entity';
import { Entity, Column, PrimaryGeneratedColumn, VersionColumn, OneToMany } from 'typeorm';
import { GroupUser } from './group.user.entity';
import { Transfer } from '../transfer/transfer.entity';

@Entity({ name: "groups" })
export class Group {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ length: 70 })          // nullable: false by default
  name: string;

  @Column({ name: "invite_code", length: 10, nullable: true, unique: true })
  inviteCode: string;

  @Column({ default: false })
  overwrite: boolean;

  @Column({ name: 'created_on', type: "timestamp with time zone", default: () => `now()` })
  createdOn: Date;

  @VersionColumn({ default: 1 })
  version: number;                  // Does not return column

  
  @OneToMany(() => GroupUser, groupUsers => groupUsers.group)
  public groupUsers: GroupUser[];

  @OneToMany(() => Transaction, transaction => transaction.group)
  transactions: Transaction[];

  @OneToMany(() => Transfer, transfer => transfer.group)
  transfers: Transfer[];

  public constructor(init?: Partial<Group>) {
    Object.assign(this, init);
  }
}