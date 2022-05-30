import { PipeTransform, Injectable, ArgumentMetadata, BadRequestException, Optional } from '@nestjs/common';

/**
 * Being an injectable class, the framework treats is as a singleton,
 * no matter how many controller endpoints are using it.
 * Each new instance (new Pipe()) of that class is also treated as a singleton,
 * meaning that applying a new pipe at a controller endpoint, results in 
 * calling the constructor once while the application is starting up.
 * Eg. we could make dynamically change value of ${max} by instatiating
 * it in a controller endpoint.
 */
@Injectable()
export class BigIntPipe implements PipeTransform<string> {
  static max: bigint = BigInt("9223372036854775807");
  static min: bigint = BigInt("-9223372036854775808");

  protected positiveOnly: boolean;

  constructor(@Optional() options?: { positiveOnly?: boolean }) {
    options = options || {};
    const { positiveOnly } = options;

    this.positiveOnly = positiveOnly || false;
  }

  /**
   * BigInt maximum can be checked with regex, but it is slower and 
   * more difficult to set ranges.
   * 
   * Decouple error message (method error), because #check method
   * is also used in {@link GroupIdPipe}.
   */
  transform(value: string, metadata: ArgumentMetadata): string {
    if (!BigIntPipe.check(value, !this.positiveOnly)) {
      this.error(value);
    }

    return value;
  }

  static check(value: string, checkNeg: boolean = false): boolean {
    const regex = (checkNeg) ? bigIntRegexAndNeg : bigIntRegex;
    const containsNumbersOnly = regex.test(value);

    if (!containsNumbersOnly) return false;

    if (BigIntPipe.max != null) {
      if (BigInt(value) > BigIntPipe.max) return false;
    }

    if (checkNeg) {
      if (BigInt(value) < BigIntPipe.min) return false;
    }

    return true;
  }

  error(value: string) {
    console.error(`BigIntPipe validation failed for value ${value}`)
    throw new BadRequestException('Validation failed');
  }
}

// Mostly used for retrieval by id along with a max length restriction of 19 digits
// export const bigIntRegex = /^\d+$/;
const bigIntRegexBase = "\\d+";
export const bigIntRegex = new RegExp("^" + bigIntRegexBase + "$");
const bigIntRegexAndNeg =  new RegExp("^-?" + bigIntRegexBase + "$");

// Used in amounts where accuracy is needed to the last digit
export const bigIntSafeRegex = /\b(?:[0-9]{1,18}|[1-8][0-9]{18}|9(?:[01][0-9]{17}|2(?:[01][0-9]{16}|2(?:[0-2][0-9]{15}|3(?:[0-2][0-9]{14}|3(?:[0-6][0-9]{13}|7(?:[01][0-9]{12}|20(?:[0-2][0-9]{10}|3(?:[0-5][0-9]{9}|6(?:[0-7][0-9]{8}|8(?:[0-4][0-9]{7}|5(?:[0-3][0-9]{6}|4(?:[0-6][0-9]{5}|7(?:[0-6][0-9]{4}|7(?:[0-4][0-9]{3}|5(?:[0-7][0-9]{2}|80[0-7]))))))))))))))))\b/;          // positive number
export const bigIntAndNegSafeRegex = /(^-?((?:[0-9]{1,18}|[1-8][0-9]{18}|9(?:[01][0-9]{17}|2(?:[01][0-9]{16}|2(?:[0-2][0-9]{15}|3(?:[0-2][0-9]{14}|3(?:[0-6][0-9]{13}|7(?:[01][0-9]{12}|20(?:[0-2][0-9]{10}|3(?:[0-5][0-9]{9}|6(?:[0-7][0-9]{8}|8(?:[0-4][0-9]{7}|5(?:[0-3][0-9]{6}|4(?:[0-6][0-9]{5}|7(?:[0-6][0-9]{4}|7(?:[0-4][0-9]{3}|5(?:[0-7][0-9]{2}|80[0-7])))))))))))))))))$)|-9223372036854775808/;

export const posBigIntPipe = new BigIntPipe({ positiveOnly: true })