import { EntityRepository, Repository } from "typeorm";
import { LocalUser } from "./local.user.entity";

@EntityRepository(LocalUser)
export class LocalUserRepository extends Repository<LocalUser> {
    findById(id: string): any {
        return this.findOne({ where: { mainUser: { id } }});
    }

    async findByLocalEmail(email: string) {
        return this.createQueryBuilder("user_kchap")
            .leftJoinAndSelect("user_kchap.mainUser", "mainUser")
            .where("LOWER(user_kchap.email) = LOWER(:email)", { email })
            .getOne();
    }

    async countEmail(email: string): Promise<number> {
        return await this.count({ email });
    }

    /**
     * Unique lower index will prevent queries from inserting an already existing
     * email without having to do any processing beforehand (like lower)
     */
    async updateEmailById(id: string, email: string): Promise<boolean> {            // In case of racing condition, internal database unique constraint will alert the user about failure
        return (await this.manager.query(`UPDATE users_kchap SET email = $1 WHERE user_id = $2`, [email, id]))[1] > 0;
    }

    async findPasswordById(id: string): Promise<string> {
        const res = (await this.manager.query(`SELECT password FROM users_kchap WHERE user_id = $1`, [id]))[0];
        return res != null ? res.password : null;
    }

    async updatePasswordById(id: string, password: string): Promise<boolean> {
        return (await this.manager.query(`UPDATE users_kchap SET password = $1 WHERE user_id = $2`, [password, id]))[1] > 0;
    }
}
