import { EntityRepository, Repository } from "typeorm";
import { FBUser } from "./facebook.user.entity";

@EntityRepository(FBUser)
export class FacebookUserRepository extends Repository<FBUser> {
    findById(id: string): Promise<FBUser> {
        return this.findOne({
            join: {
                alias: "kchapUser",
                leftJoinAndSelect: {
                    user: "kchapUser.user",
                }
            },
            where: { fbId: id }
        });
    }
}