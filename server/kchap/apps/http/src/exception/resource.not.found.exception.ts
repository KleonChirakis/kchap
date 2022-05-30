import { HttpException, HttpStatus } from "@nestjs/common";

export class ResourceNotFoundException extends HttpException {
    constructor(type: string, id: number | string, who: string = 'unknown') {
        super(`Resource ${type} with id ${id} does not exists, searched by user id ${who}`, HttpStatus.BAD_REQUEST);
    }
}