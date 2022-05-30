import { Injectable } from '@nestjs/common';
import UserSession from '../auth/common/user.session';
import { MongoDBProvider } from './mongo.connection.provider';

@Injectable()
export class MongoRepository {
    db;
    sessionCollection;

    constructor(private readonly mongodbClient: MongoDBProvider) { 
        this.db = mongodbClient.connection.db('kchap');
        this.sessionCollection = this.db.collection('sessions');
    }

    /**
     * Retrieves active user sessions. Meant to be used in front end.
     * 
     * @param userId                    User id, whose sessions are retrieved
     * @param countOnly                 Only returns the number of sessions based on the filtered results
     * @param currentSessIdToExclude    Include current session id in order to exclude it from the results
     * @returns                         List of user sessions, which contain limited session info
     */
    async getActiveUserSessions(userId: string, countOnly: boolean, currentSessIdToExclude?: string): Promise<number | UserSession[]> {
        // let query = { $and: [ { "session.passport.user.id": userId } ] }
        // if (currentSessIdToExclude != null)
        //     (query.$and as any[]).push( { "_id": { $ne: currentSessIdToExclude } } )

        let query = { "session.passport.user.id": userId };
        if (currentSessIdToExclude != null) query["_id"] = { $ne: currentSessIdToExclude };

        let res;

        if (countOnly)
            res = await this.sessionCollection.countDocuments(query);
        else {
            const data = await this.sessionCollection.find(query)
            .project( { _id: 0, expires: 1, "session.passport.user.provider": 1, "session.passport.user.device": 1, 
                        "session.passport.user.loginDate": 1, "session.passport.user.deviceId": 1 
            } )
            .toArray();
        
            // Map Session object to UserSession
            res = data.map(elem => {
                return { 
                    expires: elem.expires,
                    provider: elem.session.passport.user.provider,
                    device: elem.session.passport.user.device,
                    loginDate: elem.session.passport.user.loginDate,
                    deviceId: elem.session.passport.user.deviceId,
                }
            });
        }

        return res;
    }

    async deleteAll() {
        this.sessionCollection.deleteMany({})
    }

    async getByDeviceId(deviceId: string) {
        return this.sessionCollection.findOne({ "session.passport.user.deviceId": deviceId });
    }

    async deleteById(sessionId: string) {
        return this.sessionCollection.deleteOne({ "_id": sessionId });
    }

    async deleteByDeviceId(deviceId: string) {
        return this.sessionCollection.deleteOne({ "session.passport.user.deviceId": deviceId });
    }

    async deleteByUserIdAndDeviceId(userId: string, deviceId: string) {
        return this.sessionCollection.deleteOne({ $and: [ { "session.passport.user.id": userId }, { "session.passport.user.deviceId": deviceId } ] });
    }

    async deleteSessionsByUserId(userId: string, currentSessionId: string) {
        return this.sessionCollection.deleteMany({ $and: [ { "session.passport.user.id": userId }, { "_id": { $ne: currentSessionId } } ] });
    }

    /**
     * Every request restarts expires field, so the current won't be the first, unless it is the only active session.
     */
    async getFirstExpiringSession(userId: string, currentSessionId: string) {
        const res = await this.sessionCollection.find({ "session.passport.user.id": userId, "_id": { $ne: currentSessionId } })
            .sort("expires", 1)
            .limit(1).toArray();
        return (res.length > 0) ? res[0] : null;
    }
}