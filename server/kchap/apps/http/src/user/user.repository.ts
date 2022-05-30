import { EntityRepository, Repository } from "typeorm";
import { User } from "./user.entity";
import { Connection } from 'typeorm';
import { LocalUser } from "../auth/provider/local/local.user.entity";
import Mapper from "../utils/mapper";

@EntityRepository(User)
export class UserRepository extends Repository<User> {
    constructor(private connection: Connection) {
        super()
    }

    async findById(id: string): Promise<User> {
        return this.findOne({ id: id });
    }

    async findByMainEmail(email: string) {  
        return this.createQueryBuilder("user")
            .where("LOWER(user.email) = LOWER(:email)", { email })
            .getOne();
    }

    /**
     * Unique lower index will prevent queries from inserting an already existing
     * email without having to do any processing beforehand (like lower)
     */
    async updateEmailById(id: string, email: string): Promise<boolean> {            // In case of racing condition, internal database unique constraint will alert the user about failure
        return (await this.manager.query(`UPDATE users SET email = $1 WHERE id = $2`, [email, id]))[1] > 0;
    }

    async findByIdLeftJoinUsers(id: string) {
        const res = await this.createQueryBuilder("user")
            .leftJoinAndMapOne("user.localUser", LocalUser, 'lu', 'user.id = lu.user_id')       // Select only necessary field, either automatically using decorators or manually selecting
            .select(['user.name', 'lu.email'])   
            .where({ id })  
            .getOne()

        if (res['localUser'] != null) {
            res['email'] = res['localUser'].email
            delete(res['localUser'])
        }

        return Mapper.buildPersonalDetails(res as User & LocalUser);
    }
}
