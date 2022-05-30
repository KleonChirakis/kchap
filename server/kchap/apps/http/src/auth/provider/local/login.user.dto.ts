import { Transform, TransformFnParams } from "class-transformer";
import { IsEmail } from 'class-validator';
import { LoginInfoDto } from '../../common/login.info.dto';
import { errorMessage as emailErrorMessage } from './email.validator';
import { trim } from "apps/http/src/utils/utils";

/* For Passport validation */
export class LoginUserDto extends LoginInfoDto {
  @IsEmail({}, { message: emailErrorMessage })
  @Transform(({ value }: TransformFnParams) => trim(value))      // Santitize
  email: string;

  /* Password policies change, do not enforce policy on login, only signup */
  password: string;

  constructor(device: string, deviceId: string, email: string, password: string) {
    super(device, deviceId);
    this.email = email;
    this.password = password;
  }
}