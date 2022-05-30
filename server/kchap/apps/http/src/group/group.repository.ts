import { EntityRepository, Repository } from "typeorm";
import Mapper from "../utils/mapper";
import { Group } from "./group.entity";

@EntityRepository(Group)
export class GroupRepository extends Repository<Group> {

    async lockGroup(groupId: string): Promise<Group> {
        return (await this.manager.query(`SELECT * FROM groups WHERE id = $1 FOR UPDATE;`, [groupId]))[0];
    }

    async findById(id: string): Promise<Group> {
        return this.findOne({ id });
    }

    async updateGroupNameById(id: string, name: string) {
        const res = (await this.manager
            .createQueryBuilder()
            .update(Group)
            .set({ name })
            .where("id = :id", { id })
            .returning("*")
            .updateEntity(true)
            .execute()).raw[0]
        return Mapper.group(res);
    }
}