import { BadRequestException, HttpException, HttpStatus, Injectable, InternalServerErrorException, Logger, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../user/users.service';
import { UserRepository } from '../user/user.repository';
import { User, Provider } from '../user/user.entity';
import * as bcrypt from 'bcrypt';
import { LocalUser } from './provider/local/local.user.entity';
import { LocalUserRepository } from './provider/local/local.user.repository';
import { CreateUserDto } from './provider/local/create.user.dto';
import LoggedInUser from './common/logged.in.user';
import { SignupEmailUnavailableException } from '../exception/signup.email.unavailable.exception';
import { MongoRepository } from '../db/mongo.repository';
import { Connection, EntityManager, Transaction, TransactionManager } from 'typeorm';
import { GroupUserRepository } from '../group/group.user.repository';
import { FBUser } from './provider/fb/facebook.user.entity';
import * as config from '../../../../config.json'
import UserSession from './common/user.session';


@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);
    constructor(
        private usersService: UsersService,
        private userRepository: UserRepository,
        private localUserRepository: LocalUserRepository,
        private mongoRepository: MongoRepository,
        private connection: Connection) { }

    async validateUser(email: string, pass: string): Promise<any> {
        const localUser: LocalUser = await this.localUserRepository.findByLocalEmail(email);
        console.log('local');

        if (localUser == null) throw new HttpException(`Email ${email} does not belong to an account`, HttpStatus.BAD_REQUEST);      // Email available for new account, end of login

        let user: User = localUser.mainUser;
        if (await this.matchPasswordHash(user.id, pass)) {
            const loggedInUser: LoggedInUser = { id: user.id, name: user.name, email: localUser.email, provider: Provider.LOCAL }    // Keep login provider for session 
            return loggedInUser;
        }
    }

    async successfulLogin(userId: string, currentSessionId: string) {
        return new Promise<any>(async (resolve, reject) => {
            try {
                const count = await this.mongoRepository.getActiveUserSessions(userId, true);
                if (count < config.generic.session.maxAllowed) return;                                              // Async session persistence means that runnning this method, most probably does not include the just logged in session, so the condition becomes true after maxAllowed limit has been reached (<=)
                const sessToDel = await this.mongoRepository.getFirstExpiringSession(userId, currentSessionId);
                if (sessToDel != null) await this.mongoRepository.deleteById(sessToDel['_id']);
                console.log('Auto deleted a session, because of more than allowed.');
            } catch(e) {
                console.error(e);
            }
        })
      }

    async signup(userDto: CreateUserDto) {
        if (!await this.isEmailAvailableForSignup(userDto.email))
            throw new SignupEmailUnavailableException(userDto.email);

        const user = new User();
        Object.assign(user, {
            name: userDto.name,
            email: userDto.email,                                   // Login email is auto filled as contact email
            mainProvider: Provider.LOCAL
        });
        const localUser = new LocalUser(user, await this.hashPassword(userDto.password), userDto.email);
        const savedUser = await this.localUserRepository.save(localUser);

        console.log('new local user created');
        return user;
    }

    /**
     * Deletes user from groups without locking the groups.
     * 
     * A user could join a group while is being removed. In that case we could
     * lock the user resource, but since the user resource is a dependency for
     * another resource (GroupUser), the database will raise an exception in 
     * case it does not exist.
     */
    async deleteUser(userId: string, currentSessionId: string) {
        try {
            await this.connection.transaction("REPEATABLE READ", async manager => {                 // Resources/balances could have been changed by the time we actually delete, use repeatable read transaction
                const groupUserRepository = manager.getCustomRepository(GroupUserRepository);
                const groupUsers = await groupUserRepository.find({ relations: ["group"], where: { user: { id: userId } } });

                // If not a member of any group, delete user and return
                if (groupUsers.length == 0) {
                    await this.invalidateSessionsAndDeleteUser(userId, currentSessionId, manager);
                    return;
                }

                // If GroupUser entry gets deleted and committed here, then the other functions modifying balances will detect the failure from validating affected rows

                // Only (committed) rows with balance 0 will be deleted
                const deletedRes = await groupUserRepository
                    .createQueryBuilder("groupUser")
                    .delete()
                    .where("user_id = :userId AND balance = :balance", { userId: userId, balance: '0' })
                    .execute();
                if (deletedRes.affected != groupUsers.length)                                       // List has fixed size due to explicit locking (join group for user disabed)
                    throw new BadRequestException('Please settle before leaving');

                // From now on any changes to the original GroupUser entries from other transaction will be paused (repeatable read) and then failed, since entries will not exist

                await this.invalidateSessionsAndDeleteUser(userId, currentSessionId, manager);

            });
        } catch (error) {
            if (error.code == '40001')          // serialization failure, entry was modified during transaction
                throw new BadRequestException('Your balance was modified, please make sure that your balance is zero across groups and try again');
            if (error.code == '23503')          // foreign key violation, in case user joins group and has non zero balance during account deletion
                throw new BadRequestException('An operation prevented account deletion, please try again later');
            else throw error;                   // else rethrow
        }
    }

    @Transaction()
    async invalidateSessionsAndDeleteUser(userId: string, currentSessionId: string, @TransactionManager() manager: EntityManager) {
        // Get all sessions and delete them apart from current session
        await this.mongoRepository.deleteSessionsByUserId(userId, currentSessionId);

        const user = await manager.getRepository(User).findOne(userId);
        await this.deleteUserLoginProvider(user, manager);

        await manager.getRepository(User).update(userId, { name: "", isDeleted: true });                                // Removing personal information, setting deleted flag
    }

    async invalidateUser(userId: string, deviceId: string, currentSessionId: string) {
        // Search session store and delete by deviceId (indexed field)
        const sessionRes = await this.mongoRepository.getByDeviceId(deviceId);
        if (sessionRes == null) {
            this.logger.verbose('User tried to delete session with invalid deviceId');
            return;
        }
        if (sessionRes._id === currentSessionId) throw new BadRequestException("Cannot delete current session");        // Current session requires more operations to be deleted and has its own service
        if (sessionRes.session.passport.user.id == userId)
            await this.mongoRepository.deleteByDeviceId(deviceId);
        else
            this.logger.warn('User tried to delete session that is not theirs');
    }

    async invalidateUserSessions(userId: string, currentSessionId: string) {
        // Get all sessions and delete them apart from current session
        await this.mongoRepository.deleteSessionsByUserId(userId, currentSessionId);
    }

    @Transaction()
    async deleteUserLoginProvider(user: User, @TransactionManager() manager: EntityManager) {
        switch (user.mainProvider) {
            case Provider.FACEBOOK:
                await manager.getRepository(FBUser).delete({user: {id: user.id} as User});
                break;
            default:                    // Local
                await manager.getRepository(LocalUser).delete({mainUser: {id: user.id} as User});
        }
    }

    /** 
     * Used firstly when we check user email availability and then when we sign up the user.
     */
    async isEmailAvailableForSignup(email: string): Promise<boolean> {
        const localUser: LocalUser = await this.localUserRepository.findByLocalEmail(email);      // Main email could origin from secondary provider
        return localUser == null;
    }

    async matchPasswordHash(userId: string, inputPassword: string): Promise<boolean> {
        const password = await this.localUserRepository.findPasswordById(userId)
        if (password == null) throw new UnauthorizedException();
        return bcrypt.compare(inputPassword, password);
    }

    async updateName(userId: string, name: string) {
        if (!await this.userRepository.update(userId, { name }))
            throw new InternalServerErrorException('Name change failed');
    }

    async updateLocalEmail(userId: string, email: string) {
        // If user send the same email just return
        let localUser = await this.localUserRepository.findById(userId);
        if (localUser.email === email) return;

        // Check that email is not used as main Email from any other user
        if (await this.localUserRepository.countEmail(email) != 0)
            throw new BadRequestException('Email cannot be used');

        // Validation is already done. If update fails, something is wrong with the server or a racing condition happened
        if (!await this.localUserRepository.updateEmailById(userId, email))
            throw new InternalServerErrorException('Email change failed. Please try again');
    }

    // TDF: old password should not be the same as old. A password policy could be implemented (3 last passwords - historic table)
    async updatePassword(userId: string, password: string) {
        if (!await this.localUserRepository.updatePasswordById(userId, await this.hashPassword(password)))
            throw new InternalServerErrorException('Password change failed');
    }

    async hashPassword(password: string): Promise<string> {
        return bcrypt.hash(password, 10);
    }

    async getActiveUserSessions(userId: string, countOnly: boolean = false, currentIdToExclude?: string): Promise<UserSession[] | number> {
        const activeSessions = await this.mongoRepository.getActiveUserSessions(userId, countOnly, currentIdToExclude);
        return activeSessions;
    }
}