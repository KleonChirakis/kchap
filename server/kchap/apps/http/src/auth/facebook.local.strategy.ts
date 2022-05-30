import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException, ValidationError } from '@nestjs/common';
import { FacebookService } from './provider/fb/facebook.service';
import { ValidationBadRequestException } from '../exception/validation.bad.request.exception';
import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';
import { addSessionInfo } from './local.strategy';
import { LoginFBUserDto } from './provider/fb/login.fb.user.dto';

@Injectable()
export class FaceBookLocalStrategy extends PassportStrategy(Strategy, 'facebook-local') {
  constructor(private facebookService: FacebookService) {
    super({ usernameField: "fbId", passwordField: "accessToken", passReqToCallback: true })
  }

  async validate(req: any, fbId: string, accessToken: string): Promise<any> {
    const loginPayload: LoginFBUserDto = plainToClass(LoginFBUserDto, req.body);
    await this.inputValidation(loginPayload);        // Validate
    const user = await this.facebookService.validateFBUser(loginPayload.fbId, loginPayload.accessToken);
    if (!user) {
      throw new UnauthorizedException();
    }
    addSessionInfo(user, { device: req.body.device })
    return user;
  }

    async inputValidation(loginPayload: LoginFBUserDto): Promise<boolean> {
    let errors = await validate(loginPayload);
    if (errors.length > 0)
      throw new ValidationBadRequestException(errors as ValidationError[])
    return true;
  }
}