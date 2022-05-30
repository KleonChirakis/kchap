import { PassportSerializer } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';

/**
 * After PassportStrategy#validate(), the session is serialized and saved to
 * the SessionStore.
 * 
 * UserId-DeviceId combination should be unique.
 * 
 * DeviceId is prone to unique constraint violation, but that's an edge case since
 * its a 32 byte random string. Because it is difficult to control the session
 * persistence flow (we cannot try..catch..retry), we could create a new collection
 * and insert the deviceId there (to check uniqueness, while retrying if needed),
 * along with the session id, which can be retrieved from request
 */
@Injectable()
export class SessionSerializer extends PassportSerializer {
  serializeUser(user: any, done: (err: Error, user: any) => void): any {
    let { id, provider, device, loginDate, deviceId } = user;
    done(null, { id: id, provider, device, loginDate, deviceId});             // Mongo insertion is async, no callbacks
  }

  deserializeUser(payload: any, done: (err: Error, payload: string) => void): any {
    done(null, payload);
  }
}