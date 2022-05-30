import { ExceptionFilter, Catch, ArgumentsHost } from '@nestjs/common';
import { Request, Response } from 'express';
import { ValidationBadRequestException } from '../validation.bad.request.exception';

@Catch(ValidationBadRequestException)
export class ValidationBadRequestExceptionFilter implements ExceptionFilter {
  catch(exception: ValidationBadRequestException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();

    // Custom validationError parser. Nested errors are acquired via recursion
    let errors = []
    exception.errors.map(err => {
      console.log(err)
      this.parseAllValErrors(errors, err);
    })

    response
      .status(status)
      .json({
        errors: errors,
        statusCode: status,
        timestamp: new Date().toISOString(),
        message: exception.message
      });
  }

  parseAllValErrors(arr, err, property = err.property) {
    if (err.children != null) {
      for (let nestedError of err.children)
        this.parseAllValErrors(arr, nestedError, property + "." + nestedError.property);
    }

    if (err.constraints == null) return;
    
    const constraints = []
    for (const [key, value] of Object.entries(err.constraints)) {
      constraints.push(value);
    }
    arr.push({
      property: property,
      constraints: constraints
    })
  }
}