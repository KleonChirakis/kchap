import { trim } from 'apps/http/src/utils/utils';
import { Transform, TransformFnParams } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { IsDeviceId } from '../../validation/deviceid.validator';

/* For Passport validation */

export class LoginInfoDto {
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }: TransformFnParams) => trim(value))
  device: string;

  @IsDeviceId()
  @IsOptional()
  @Transform(({ value }: TransformFnParams) => trim(value))
  deviceId: string;

  constructor(device: string, deviceId: string) {
    this.device = device;
    this.deviceId = deviceId;
  }
}