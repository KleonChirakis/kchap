import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';


@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    let status = (exception instanceof HttpException) ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    let message = exception instanceof HttpException ? exception.message : "Error";

    this.logger.error("Global error handler - " + request.url)
    console.error(exception)

    if (exception.code === "ENOENT") {                // Generated by ServeStaticModule
      status = HttpStatus.NOT_FOUND;
      message = "Not Found"
    }

    /**
     * Custom errors that are supposed to be shown to users have
     * their own exceptions and filters. Hide server errors.
     */
    response
      .status(status)
      .json({
        statusCode: status,
        timestamp: new Date().toISOString(),
        message
      });
  }

  /**
   * Parses common errors across services to avoid 
   * code duplication of error handling
   */
  parseException(error) {
    switch(error.constructor) {
      case QueryFailedError: {
        switch(error.code) {
          case '22003':
            return "Max limit exceeded";
          default:  
            return error.message
        }
      }
      default:
        return error.message
    }
  }
}