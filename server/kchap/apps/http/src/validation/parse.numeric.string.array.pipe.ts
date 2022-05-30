import { PipeTransform, Injectable, ArgumentMetadata, BadRequestException } from '@nestjs/common';
import { isString } from 'class-validator';
import { bigIntSafeRegex } from './bigint.pipe';

@Injectable()
export class ParseNumericStringArrayPipe implements PipeTransform<string[]> {
    optional: boolean

    constructor(optional: boolean = false) {
        this.optional = optional;
    }

    async transform(value: string[], metadata: ArgumentMetadata): Promise<string[]> {
        if (value == null || 
            (Object.keys(value).length === 0 && value.constructor === Object) || 
            (Array.isArray(value) && value.length == 0)
        ) {
            if (this.optional)
                return value;
            else
                throw new BadRequestException('Array expected');
        }

        for (const elem of value) {
            if (!isString(elem) || !bigIntSafeRegex.test(elem)) {                               // Regex is faster than creating a BigInt from string and comparing
                throw new BadRequestException('Values must be numeric strings')
            }
        }
        return value;
    }
}