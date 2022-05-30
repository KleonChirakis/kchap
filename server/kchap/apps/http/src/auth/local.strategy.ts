import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException, ValidationError } from '@nestjs/common';
import { AuthService } from './auth.service';
import { validate } from 'class-validator';
import { ValidationBadRequestException } from '../exception/validation.bad.request.exception';
import { plainToClass } from 'class-transformer';
import { LoginUserDto } from './provider/local/login.user.dto';
import * as crypto from 'crypto';
import { MongoRepository } from '../db/mongo.repository';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService, private mongoRepository: MongoRepository) {
    super({ usernameField: "email", passReqToCallback: true })      // Passes request object, which contains custom fields (eg. device name), to the validate method (callback)
  }

  async validate(req: any, email: string, password: string, done: any): Promise<any> {
    const loginPayload: LoginUserDto = plainToClass(LoginUserDto, req.body);
    await this.inputValidation(loginPayload);         // Validate
    const user = await this.authService.validateUser(loginPayload.email, loginPayload.password);
    if (!user) {
      throw new UnauthorizedException();
    }

    if (req.body.deviceId != null)
      await this.mongoRepository.deleteByUserIdAndDeviceId(user.id, req.body.deviceId);

    addSessionInfo(user, { device: req.body.device, deviceId: req.body.deviceId })

    console.log(req.session)

    return user;
  }

  async inputValidation(loginPayload: LoginUserDto): Promise<boolean> {
    let errors = await validate(loginPayload);
    if (errors.length > 0)
      throw new ValidationBadRequestException(errors as ValidationError[])
    return true;
  }
}

export function addSessionInfo(obj: any, data: { device, deviceId? }) {
  obj['loginDate'] = new Date().toISOString();                                               // Log timestamp on login and not in SessionSerializer since modifying the session would change the timestamp
  obj['device'] = data.device;
  obj['deviceId'] = data.deviceId || crypto.randomBytes(32).toString('hex');
  return obj;
}