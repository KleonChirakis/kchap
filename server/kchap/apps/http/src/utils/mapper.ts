import { LocalUser } from '../auth/provider/local/local.user.entity';
import { Group } from '../group/group.entity';
import { Transaction } from '../transaction/transaction.entity';
import { TansferDtoOut } from '../transfer/transfer.dto';
import { Transfer } from '../transfer/transfer.entity';
import { User } from '../user/user.entity';

export default class Mapper {
       static buildPersonalDetails(user: User & LocalUser) {
        return {
            name: user.name,
            email: user.email
        }
    }

    static group(group): Group {
        return new Group({
            id: group.id,
            name: group.name,
            inviteCode: group.invite_code,
            overwrite: group.overwrite,
            createdOn: group.created_on,
            version: group.version
        })
    }
}