import { PipeTransform, Injectable, ArgumentMetadata, ValidationError } from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { PasswordValidator } from '../auth/provider/local/password.validator';
import { ValidationBadRequestException } from '../exception/validation.bad.request.exception';

@Injectable()
export class PasswordPipe implements PipeTransform<string> {
  async transform(value: string, metadata: ArgumentMetadata): Promise<string> {
    let errors = await validate(plainToClass(PasswordValidator, { password: value }));
    if (errors.length > 0)
        throw new ValidationBadRequestException(errors as ValidationError[]);
    return value;
  }
}