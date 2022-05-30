import { PipeTransform, Injectable, ArgumentMetadata, ValidationError } from '@nestjs/common';
import { IsNotEmpty, IsString, MaxLength, validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { ValidationBadRequestException } from '../exception/validation.bad.request.exception';
import { trim } from '../utils/utils';

@Injectable()
export class ParseGroupNamePipe implements PipeTransform<string> {
  async transform(value: string, metadata: ArgumentMetadata): Promise<string> {     
    let errors = await validate(plainToClass(NameValidator, { name: trim(value) }));
    if (errors.length > 0)
        throw new ValidationBadRequestException(errors as ValidationError[]);
    return trim(value);
  }
}

class NameValidator {
  @IsString()
  @IsNotEmpty()
  @MaxLength(70)
  name: string;
}