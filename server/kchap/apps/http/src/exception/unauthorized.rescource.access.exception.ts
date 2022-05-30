import { HttpException, HttpStatus } from "@nestjs/common";

export class UnauthorizedRescourceAccessException extends HttpException {
    constructor(type: string, id: number | string, who: string = 'uknown') {
        super(`Unauthorized access for resource ${type} with it ${id}, searched by user id ${who}`, HttpStatus.UNAUTHORIZED);
    }
}