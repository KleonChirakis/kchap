import { PipeTransform, Injectable, ArgumentMetadata, ValidationError } from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { ValidationBadRequestException } from '../exception/validation.bad.request.exception';
import { UserameValidator } from '../auth/provider/local/username.validator';

@Injectable()
export class UsernamePipe implements PipeTransform<string> {
  async transform(value: string, metadata: ArgumentMetadata): Promise<string> {
    const usernameValidator = plainToClass(UserameValidator, { name: value });
    let errors = await validate(usernameValidator);
    if (errors.length > 0)
        throw new ValidationBadRequestException(errors as ValidationError[]);
    return usernameValidator.name;
  }
}