import { PipeTransform, Injectable, ArgumentMetadata } from '@nestjs/common';
import { plainToClass } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import { DeviceIdValidator } from './deviceid.validator';
import { ValidationBadRequestException } from '../exception/validation.bad.request.exception';

@Injectable()
export class DeviceIdPipe implements PipeTransform<string> {
  async transform(value: string, metadata: ArgumentMetadata): Promise<string> {
    let errors = await validate(plainToClass(DeviceIdValidator, { deviceId: value }));
    if (errors.length > 0)
        throw new ValidationBadRequestException(errors as ValidationError[]);
    return value;
  }
}