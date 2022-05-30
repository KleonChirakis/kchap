import { Transform, TransformFnParams } from "class-transformer";
import { IsNotEmpty, IsNumberString, IsString } from 'class-validator';
import { LoginInfoDto } from '../../common/login.info.dto';
import { trim } from "apps/http/src/utils/utils";

/* For Passport validation */

export class LoginFBUserDto extends LoginInfoDto {
  @IsNumberString()
  @IsNotEmpty()
  @Transform(({ value }: TransformFnParams) => trim(value))      // Santitize
  fbId: string;

  /* Password policies change, do not enforce policy on login, only signup */
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }: TransformFnParams) => trim(value))      // Santitize
  accessToken: string;

  constructor(device: string, deviceId: string, fbId: string, accessToken: string) {
    super(device, deviceId);
    this.fbId = fbId;
    this.accessToken = accessToken;
  }
}