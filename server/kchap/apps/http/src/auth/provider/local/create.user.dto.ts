import { Transform, TransformFnParams } from "class-transformer";
import { IsEmail } from 'class-validator';
import { IsPassword } from './password.validator';
import { errorMessage as emailErrorMessage } from './email.validator';
import { IsUsername } from './username.validator';
import { trim } from "apps/http/src/utils/utils";

export class CreateUserDto {
  @IsEmail({}, { message: emailErrorMessage })
  @Transform(({ value }: TransformFnParams) => trim(value))      // Santitize
  email: string;

  @IsPassword()
  password: string;

  @IsUsername()
  @Transform(({ value }: TransformFnParams) => trim(value) )
  name: string;
}