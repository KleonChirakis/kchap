import { HttpException, HttpStatus } from "@nestjs/common";

export class SignupEmailUnavailableException extends HttpException {
    constructor(email: string) {
        super(`Email ${email} in use`, HttpStatus.BAD_REQUEST);
    }
}