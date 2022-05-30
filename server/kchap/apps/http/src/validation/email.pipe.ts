import { PipeTransform, Injectable, ArgumentMetadata, ValidationError } from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { ValidationBadRequestException } from '../exception/validation.bad.request.exception';
import { EmailValidator } from '../auth/provider/local/email.validator';
import { trim } from '../utils/utils';

@Injectable()
export class EmailPipe implements PipeTransform<string> {
  async transform(value: string, metadata: ArgumentMetadata): Promise<string> {
    console.log(`EmailPipe: ${value}`)
    let errors = await validate(plainToClass(EmailValidator, { email: value }));
    if (errors.length > 0)
        throw new ValidationBadRequestException(errors as ValidationError[]);
    return trim(value);
  }
}