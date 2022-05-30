import { ExceptionFilter, Catch, ArgumentsHost, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import { ResourceNotFoundException } from '../resource.not.found.exception';
import { UnauthorizedRescourceAccessException } from '../unauthorized.rescource.access.exception';

@Catch(ResourceNotFoundException, UnauthorizedRescourceAccessException)
export class ResourceExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ResourceExceptionFilter.name);
  
  catch(exception: ResourceNotFoundException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = HttpStatus.BAD_REQUEST;                                                    // Generic error status code

    this.logger.error(exception.message);

    response
      .status(status)
      .json({
        message: 'You either do not have access to this resource or it does not exist',       // Hides original error message
        statusCode: status,
        timestamp: new Date().toISOString(),
      });
  }
}