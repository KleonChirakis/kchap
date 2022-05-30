import { Controller, Request, Post, UseGuards, Get, Body, Session, HttpCode, Query, Res, DefaultValuePipe, ParseBoolPipe } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto } from './provider/local/create.user.dto';
import { AuthenticatedGuard } from './common/guard/authenticated.guard.ts';
import { LoginGuard } from './common/login.guard';
import { PasswordPipe } from '../validation/password.pipe';
import { EmailPipe } from '../validation/email.pipe';
import { UsernamePipe } from '../validation/username.pipe';
import { SessionSerializer } from './session.serializer';
import * as config from '../../../../config.json'
import { addSessionInfo } from './local.strategy';
import { DeviceIdPipe } from '../validation/deviceid.pipe';
import { DeviceIdEnum } from '../validation/deviceid.validator';

@Controller()
export class AuthController {
  constructor(private authService: AuthService, private sessionSerializer: SessionSerializer) { }

  /**
   * If credentials were wrong, Passport middleware will disrupt (throw) login 
   * procedure and the method will not run. Runs only after successful login.
   * 
   * Method accepts two different types of credentials, local (email, password)
   * and facebook (fbId, accessToken), so validate in strategy file, not before. 
   */
  @Post('auth/login')
  @HttpCode(200)
  @UseGuards(LoginGuard)
  async login(@Request() req, @Session() sess) {
    this.authService.successfulLogin(sess.passport.user.id, req.sessionID);
    return req.user;
  }

  @Post('auth/logout')
  @HttpCode(200)
  @UseGuards(AuthenticatedGuard)
  logout(@Request() req, @Res() res) {
    this.destroySession(req, res);
  }

  @Post('auth/checkEmail')
  @HttpCode(200)
  async checkEmail(
    @Request() req, @Session() sess, @Body('email', EmailPipe) email: string
  ): Promise<{ emailInUse: boolean }> {
    return { emailInUse: !await this.authService.isEmailAvailableForSignup(email) };
  }

  /**
   * Auto login after successful signup. Response would be the same as login.
   * 
   * Signup is done for local provider only.
   */
  @Post('signup')
  async signup(@Request() req, @Body() user: CreateUserDto) {
    const u = await this.authService.signup(user);
    const userInfo = addSessionInfo(
      Object.assign(u, { provider: u.mainProvider }),
      { device: req.body.device }
    )
    const session = await this.serialize(req, userInfo);                                        // Serialize session using Passport's default
    Object.assign(session, { name: u.name });
    return session;
  }

  async serialize(req, u) {
    return new Promise((resolve, reject) => {
      this.sessionSerializer.serializeUser(u, (err, loggedInUser) => {
        if (!err) {
          const a = this.autoLogin(req, loggedInUser);
          resolve(a)
        } else reject(err);
      })
    })
  }

  async autoLogin(req, loggedInUser) {
    return new Promise((resolve, reject) => {
      req.login(loggedInUser, err => {
        if (!err) resolve(loggedInUser); else reject(err);
      });
    });
  }

  @Get('activeSessions')
  @UseGuards(AuthenticatedGuard)
  async getActiveSessions(
    @Request() req,
    @Query('countOnly', new DefaultValuePipe(false), ParseBoolPipe) countOnly,
    @Query('all', new DefaultValuePipe(false), ParseBoolPipe) allSessions: boolean,
    @Session() sess
  ) {
    return await this.authService.getActiveUserSessions(sess.passport.user.id, countOnly, allSessions ? null : req.sessionID);
  }

  @Post('deleteUser')
  @UseGuards(AuthenticatedGuard)
  async deleteUser(@Request() req, @Res() res, @Session() sess) {
    await this.authService.deleteUser(sess.passport.user.id, req.sessionID);
    this.destroySession(req, res);
  }

  @Post('auth/invalidateSession')
  @UseGuards(AuthenticatedGuard)
  async invalidateSession(@Request() req, @Res() res, @Session() sess, @Query('deviceId', new DeviceIdPipe()) deviceId: string) {
    if (deviceId) {
      if (deviceId.toLocaleLowerCase() == DeviceIdEnum.OTHER)
        await this.authService.invalidateUserSessions(sess.passport.user.id, req.sessionID);
      else
        await this.authService.invalidateUser(sess.passport.user.id, deviceId, req.sessionID);
      res.sendStatus(200);
    } else {
      this.destroySession(req, res);
    }
  }

  destroySession(req: any, res: any) {
    req.session.destroy(function () {
      res.clearCookie(config.generic.session.name);                   // Avoid sending deleted cookie inside response
      res.sendStatus(200);
    });
  }

  @Post('profile/updateName')
  @HttpCode(200)
  @UseGuards(AuthenticatedGuard)
  async updateName(@Session() sess, @Body('name', UsernamePipe) name: string) {
    await this.authService.updateName(sess.passport.user.id, name);
  }

  @Post('profile/updateEmail')
  @HttpCode(200)
  @UseGuards(AuthenticatedGuard)
  async updateEmail(@Session() sess, @Body('email', EmailPipe) email: string) {
    await this.authService.updateLocalEmail(sess.passport.user.id, email);
  }

  @Post('profile/updatePassword')
  @HttpCode(200)
  @UseGuards(AuthenticatedGuard)
  async updatePassword(@Session() sess, @Body('password', PasswordPipe) password: string) {
    await this.authService.updatePassword(sess.passport.user.id, password);
  }
}