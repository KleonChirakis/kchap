import { IsEmail } from "class-validator";
import { Transform, TransformFnParams } from "class-transformer";
import { trim } from "apps/http/src/utils/utils";

export const errorMessage = 'Please check your email';

export class EmailValidator {
    @IsEmail({}, { message: errorMessage })
    @Transform(({ value }: TransformFnParams) => trim(value))
    email: string;

    constructor(email: string) {
        this.email = email
    }
}