import { ExceptionFilter, Catch, ArgumentsHost } from '@nestjs/common';
import { Request, Response } from 'express';
import { SignupEmailUnavailableException } from '../signup.email.unavailable.exception';

/**
 * NestJS' default validator (class-validator) does not play well with framework's
 * default DI system. Although it can work with a new third party DI system (typedi).
 * 
 * It is difficult to manually instantiate and throw class-validator's ConstraintError,
 * so instead of that we mimmick this object's structure here. It has a minor drawback of
 * firstly validating password and name and once inside the service, the email's uniqueness
 * is validated.
 */

@Catch(SignupEmailUnavailableException)
export class SignupEmailUnavailableExceptionFilter implements ExceptionFilter {
  catch(exception: SignupEmailUnavailableException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();

    let errors = [
      {
        property: 'email',
        constraints: [
          exception.message
        ]
      }
    ] 

    response
      .status(status)
      .json({
        errors: errors,
        statusCode: status,
        timestamp: new Date().toISOString(),
        message: "Validation errors"
      });
  }
}