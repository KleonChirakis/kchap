import { HttpException, HttpStatus, ValidationError } from "@nestjs/common";

export class ValidationBadRequestException extends HttpException {
    errors: ValidationError[]
    constructor(errors: ValidationError[]) {
      super('Validation error', HttpStatus.BAD_REQUEST);
      this.errors = errors;
    }
  }