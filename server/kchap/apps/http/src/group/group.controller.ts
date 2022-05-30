import { Controller, Post, UseGuards, Get, Body, Session, HttpException, HttpCode, Put, Query, Param, ParseBoolPipe, Res, InternalServerErrorException } from '@nestjs/common';
import { posBigIntPipe } from '../validation/bigint.pipe';
import { AuthenticatedGuard } from '../auth/common/guard/authenticated.guard.ts';
import { Group } from './group.entity';
import GroupService from './group.service';
import { ParseGroupNamePipe } from '../validation/parse.group.name.pipe';
import { Base62Pipe } from '../validation/base62.pipe';
import { ParseNumericStringArrayPipe } from '../validation/parse.numeric.string.array.pipe';


@Controller('/groups')
@UseGuards(AuthenticatedGuard)
export class GroupController {
  constructor(private groupService: GroupService) { }

  /**
   * No paginated results. Will be used in synchronization.
   * Phone can find deleted groups based on its previous 
   * group data and this response.
   */
  @Get()
  async getGroups(
    @Session() sess
  ): Promise<any> {
    return await this.groupService.getGroupsAndUsers(sess.passport.user.id);
  }

  @Post()
  async addGroup(                                         
    @Body('name', ParseGroupNamePipe) name: string,                     // Only modifyable property is name
    @Session() sess
  ): Promise<Group> {
    return await this.groupService.addGroup(name, sess.passport.user.id);
  }

  //@Delete()                   // Group will be deleted when there are no members

  @Put(':id/updateName')
  async updateGroupName(
    @Param('id', posBigIntPipe) groupId: string,
    @Body('name', ParseGroupNamePipe) name: string,
    @Session() sess
  ): Promise<Group> {
    return await this.groupService.updateGroupName(groupId, name, sess.passport.user.id);
  }

  @Post(':groupId/sync')
  @HttpCode(200)
  async streamSync(
    @Param('groupId', posBigIntPipe) groupId: string,
    @Query('lid', posBigIntPipe) lid,
    @Body(new ParseNumericStringArrayPipe(true)) eIds: string[],
    @Session() sess, @Res() res
  ) {
    console.log(eIds)
    try {
      const mutlistream = await this.groupService.streamSync(groupId, lid, eIds, sess.passport.user.id);
      mutlistream.pipe(res);                          // Streams will res.end() once they are all consumed
    } catch (e) {
      if (e instanceof HttpException)                 // Handled by default error handlers
        throw e
      throw new InternalServerErrorException('Syncing is unavailable');
    }
  }

  /**
   * Leaving a group and being part of other members' balances
   * means that their balance should also change, so better
   * settle with others before having the right to leave.
   * 
   * Based on that, leaving the whole app also means settling
   * with every member of every group. User could set communication
   * settings and how they would like to be reached (eg. future
   * features of reminders).
   */
  @Post('leave/:groupId')
  @HttpCode(200)
  async leaveGroup(@Param('groupId', posBigIntPipe) groupId: string, @Session() sess) {
    console.log(sess.passport.user.id)
    await this.groupService.leaveGroup(groupId, sess.passport.user.id);
  }

  @Post('/join')
  async joinGroup(
    @Query('inviteCode', Base62Pipe) inviteCode: string,
    @Session() sess
  ) {
    return await this.groupService.joinGroup(inviteCode, sess.passport.user.id);
  }

  @Post(':groupId/genCode')
  @HttpCode(200)
  async generateInviteCode(
    @Param('groupId', posBigIntPipe) groupId: string,
    @Session() sess
  ) {
    return await this.groupService.enableInviteCode(groupId, sess.passport.user.id);
  }

  @Post(':groupId/disCode')
  @HttpCode(200)
  async disableInviteCode(
    @Param('groupId', posBigIntPipe) groupId: string,
    @Session() sess
  ) {
    return await this.groupService.disableInviteCode(groupId, sess.passport.user.id);
  }

  @Post(':groupId/overwrite')
  @HttpCode(200)
  async setOverwrite(
    @Param('groupId', posBigIntPipe) groupId: string,
    @Query('enable', ParseBoolPipe) overwrite: boolean,
    @Session() sess
  ) {
    return await this.groupService.setOverwrite(groupId, overwrite, sess.passport.user.id);
  }
}
