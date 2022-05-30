import { PipeTransform, Injectable, ArgumentMetadata, BadRequestException } from '@nestjs/common';

@Injectable()
export class Base62Pipe implements PipeTransform<string> {
  transform(value: string, metadata: ArgumentMetadata): string {
    let containsLettersAndNumbersOnly = /^[a-zA-Z0-9]+$/.test(value);
    if (!containsLettersAndNumbersOnly) {
      console.error(`Base62Pipe validation failed for value ${value}`)
      throw new BadRequestException('Validation failed');
    }
    return value;
  }
}