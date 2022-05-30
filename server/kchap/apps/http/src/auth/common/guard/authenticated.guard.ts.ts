import { ExecutionContext, Injectable, CanActivate, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class AuthenticatedGuard implements CanActivate {
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();

    // An unpersisted/expired session seems to be active for unauthenticated users. 
    // This makes the framework think that users have logged in, but do not have
    // perimmision, so it returns 403, instead of 401. Manually override this behavior.
    if (!request.session.passport || request.headers.cookie == null) {
      throw new UnauthorizedException()
    }

    return request.isAuthenticated();
  }
}