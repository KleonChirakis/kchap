import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { UsersService } from '../user/users.service';
import { Group } from './group.entity';
import { GroupRepository } from './group.repository';
import { ResourceNotFoundException } from '../exception/resource.not.found.exception';
import { GroupUserRepository } from './group.user.repository';
import { Connection, EntityManager, In, Transaction, TransactionManager } from 'typeorm';
import { GroupUser } from './group.user.entity';
import { UnauthorizedRescourceAccessException } from '../exception/unauthorized.rescource.access.exception';
import { User } from '../user/user.entity';
import { _RemovedRepository } from '../removed.repository';
import { genRandString } from '../utils/utils';
import { Exception } from '../exception/exception';
import { Readable } from 'stream';
import * as JSONStream from 'JSONStream';
import * as MultiStream from 'multistream';
import { UserRepository } from '../user/user.repository';
import { TransactionRepository } from '../transaction/transaction.repository';
import { TransferRepository } from '../transfer/transfer.repository';
import { IsolationLevel } from "typeorm/driver/types/IsolationLevel";


@Injectable()
export default class GroupService {
  constructor(
    private usersService: UsersService,
    private groupRepository: GroupRepository,
    private groupUserRepository: GroupUserRepository,
    private userRepository: UserRepository,
    private connection: Connection) { }

  async getGroupsAndUsers(userId: string): Promise<any> {
    const [personalDetails, users, groupsBasic] =
      await this.connection.transaction("REPEATABLE READ READ ONLY" as IsolationLevel, async manager => {
        return await Promise.all([
          manager.getCustomRepository(UserRepository).findByIdLeftJoinUsers(userId),             // Only one provider is tied to a user, so their info is also their login info
          manager.getCustomRepository(GroupUserRepository).findGroupUsersByUserId(userId),
          manager.getCustomRepository(GroupUserRepository).findBasicGroupsByUserId(userId)
        ]);
      });
    return { user: personalDetails, users, groups: groupsBasic };
  }

  async streamSync(groupId: string, lid: string, eIds: string[], userId: string) {
    await this.isMemberOfGroupByGroupId(userId, groupId)      // Checks if user is part of the group
    if (lid == null) lid = '0';
    const pool = (this.connection.driver as any).master;
    const client = await pool.connect();
    let multistream;

    return await this.connection.transaction("REPEATABLE READ READ ONLY" as IsolationLevel, async manager => {

      /**
       * Gets the ids for the transactions and transfers. Ids of 
       * deleted entities are also included, but will not be included
       * in the response (since the queries retrieving these rows
       * won't retrieve any deleted entities). Distinct applies to
       * id and content entity types (transaction and transfer), as
       * they share similar ids and the only way to distinguish them
       * is the type field (gen_for).
       */
      try {
        const arr: any[] = await manager
          .getCustomRepository(_RemovedRepository)
          .findByDistinctContentId(lid, eIds, groupId);

        // Separate transaction from transfer ids
        const transactionIds = [], transferIds = [];      // Arrays with distinct content ids provided by the query
        for (let i = 0; i < arr.length; i++) {
          const elem = arr[i] as any;
          if (elem.genFor == Content.TRANSACTION) {
            transactionIds.push(elem.genForId);
          } else if (elem.genFor == Content.TRANSFER) {
            transferIds.push(elem.genForId);
          }
        }

        const stream = await manager.getCustomRepository(_RemovedRepository).stream(lid, eIds, groupId);

        /**
         * Sending an emty array in a WHERE IN statement will result
         * in failed query results (no exception), so check if array
         * is empty before getting the stream
         */
        let transactionStream;
        if (transactionIds.length > 0) {
          transactionStream = client.query(await manager.getCustomRepository(TransactionRepository).streamTransactions(transactionIds));
        }

        let transferStream;
        if (transferIds.length > 0) {
          transferStream = await manager.getCustomRepository(TransferRepository).streamTransfers(transferIds);
        }

        // 1. arr
        // 2. transactions
        // 3. transers

        const streams = [
          Readable.from('{\"arr\": '),                                     // ROOT_OBJECT_START
          stream.pipe(JSONStream.stringify()),
        ];

        /**
         * If array containing the ids is empty, then the
         * stream will be null. In that case just return
         * an empty array
         */
        streams.push(Readable.from(', \"transactions\": '));
        if (transactionStream != null) {
          streams.push(transactionStream.pipe(JSONStream.stringify()));
        } else {
          streams.push(Readable.from('[]'));
        }

        streams.push(Readable.from(', \"transfers\": '));
        if (transferStream != null) {
          streams.push(transferStream.pipe(JSONStream.stringify()));
        } else {
          streams.push(Readable.from('[]'));
        }

        streams.push(Readable.from('}'));                                      // ROOT_OBJECT_END

        multistream = new MultiStream(streams);
        return multistream;
      } catch (e) {
        throw e;
      } finally {
        client.release();
      }
    });
  }

  async getGroup(id: string): Promise<Group> {
    const group = await this.groupRepository.findById(id);
    if (group == null) throw new ResourceNotFoundException('GROUP', id);
    return group;
  }

  @Transaction()
  async getGroupUser(groupId: string, userId: string, @TransactionManager() manager: EntityManager): Promise<GroupUser> {
    const groupUser = await manager.getCustomRepository(GroupUserRepository).findOne({ group: { id: groupId }, user: { id: userId } });
    if (groupUser == null) throw new ResourceNotFoundException('GROUP_USER', groupId);
    return groupUser;
  }

  async addGroup(name: string, userId: string): Promise<Group> {
    let group: Group;
    await this.connection.transaction(async manager => {                    // Init transaction
      group = new Group();                                                  // Create group
      group.name = name;
      group = await manager.save(group);

      const user = await this.usersService.findById(userId);
      let groupUser: GroupUser = new GroupUser();                           // Assign creator to group
      groupUser.user = user;
      groupUser.group = group;
      await manager.save(groupUser);
    });

    return group;
  }

  async updateGroupName(groupId: string, name: string, userId: string): Promise<Group> {
    await this.isMemberOfGroupByGroupId(userId, groupId);                   // Check if member belongs to group or throw
    return await this.groupRepository.updateGroupNameById(groupId, name);
  }

  /**
   * Leave group is internet-bound.
   *
   * REPEATABLE READ ensures that no modification of the read entities will take place. It
   * is a requirement for comparing balances. The only downside with this solution is that 
   * if a balance change occurs, even if it makes the balance of the member to equal zero,
   * it will make the transaction fail and the user should request the action again. This 
   * seems improbable and that is why this solution was preferred over group locking. Group
   * locking would solve the above problem, but it would delay all content changes of group
   * over checking the balances of only one member. Another, more simplistic solution would 
   * be to count groupUsers entries, then delete them and at the end to compare if deleted
   * rows equal the retrieved count. Finally, deadlocks seem unlikely.
   */
  async leaveGroup(groupId: string, memberId: string) {
    try {
      await this.connection.transaction("REPEATABLE READ", async manager => {
        const groupUserRepository = manager.getCustomRepository(GroupUserRepository);
        const groupUser = await this.getGroupUser(groupId, memberId, manager);                                          // Resource could have been changed by the time we actually delete, but repeatable read takes care of that

        if (groupUser.balance == '0')                                                                                   // Check that balance is 0, select and compare in one db transaction
          groupUserRepository.delete({ group: { id: groupId }, user: { id: memberId } });
        else
          throw new BadRequestException('Please settle before leaving');

        // Group without members is not visible to anyone. Could be archived/deleted to free up db space
        if (await groupUserRepository.countByGroupId(groupId) == 0) {
          console.log('Group does not have any members, deleting group');
          await manager.getRepository(Group).delete({ id: groupId })
        }
      });
    } catch (error) {
      if (error.code == '40001')          // serialization failure, entry was modified during transaction
        throw new BadRequestException('Your balance was modified, please make sure that your balance is zero and try again');
      else throw error;                   // else rethrow
    }
  }

  async isMemberOfGroupByGroupId(userId: string, groupId: string, resourceType = 'GROUP', manager?: EntityManager) {
    if (manager == null) manager = this.connection.manager;
    if (!await manager.getCustomRepository(GroupUserRepository).isMemberOfGroup(userId, groupId))
      throw new UnauthorizedRescourceAccessException(resourceType, groupId, userId);
  }

  isMemberOfGroup(userId: string, group: Group) {
    if (!group.groupUsers.find(groupUser => groupUser.user.id == userId))
      throw new UnauthorizedRescourceAccessException('GROUP', group.id, userId);
  }

  /**
   * Keeping the member count below a threshold is a racing condition.
   * We could use serializable to prevent racing conditions, but then
   * every group join would be executed serially. By locking the group, 
   * joining is parallel for different groups and serial for the same group.
   * 
   * A trigger is used for checking max users of group (15)
   * 
   * @param inviteCode    Group invite code provided by a member
   * @param userId        User id trying to join group
   * @returns             first group sync data
   */
  async joinGroup(inviteCode: string, userId: string) {
    let group;
    await this.connection.transaction(async manager => {
      group = (await manager.getRepository(Group).findOne({ select: ["id"], where: { inviteCode } }));    // Find group by inviteCode
      if (group == null) throw new NotFoundException('Invalid invite code');                              // No group using inviteCode found
      group = await manager.getCustomRepository(GroupRepository).lockGroup(group.id);                     // Read method documentation

      let groupUser: GroupUser = new GroupUser();
      groupUser.user = { id: userId } as User;
      groupUser.group = group;

      try {
        await manager.insert(GroupUser, groupUser);
      } catch (error) {
        if (error.code == '23505')          // unique constraint violation, GroupUser exists
          throw new BadRequestException('You are already a member of this group');
        else throw error                    // else rethrow
      }
    });

    // If reached here, group exists and join was successful
    return await this.getGroupDetails(group.id, userId);
  }

  /**
   * Default is disabled, user can enable it at profile settings.
   * Tries 3 times to generate a random string which can be manually
   * filled to an appropriare field or shared via link/qr code.
   * Retry is required in order not to violate unique constraint.
   */
  async enableInviteCode(groupId: string, userId: string, retry = 3): Promise<{ inviteCode: String }> {
    await this.isMemberOfGroupByGroupId(userId, groupId);

    let randStr = genRandString(10);
    retry--;
    try {
      await this.groupRepository.update(groupId, { inviteCode: randStr });
      return { inviteCode: randStr };
    } catch (error) {
      if (retry <= 0 || error.code != '23505')         // Retries echausted or error is not unique constraint violation
        throw new Exception('Invitation code generation failed', { groupId });
      return await this.enableInviteCode(groupId, userId, retry);
    }
  }

  async disableInviteCode(groupId: string, userId: string) {
    await this.isMemberOfGroupByGroupId(userId, groupId);
    await this.groupRepository.update(groupId, { inviteCode: null });
  }

  async setOverwrite(groupId: string, overwrite: boolean, userId: string) {
    await this.isMemberOfGroupByGroupId(userId, groupId);
    await this.connection.getRepository(Group).update(groupId, { overwrite });
  }
}