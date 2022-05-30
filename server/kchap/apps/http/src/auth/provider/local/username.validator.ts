import { registerDecorator, ValidationOptions, ValidationArguments, isNotEmpty, isString, matches } from 'class-validator';
import { trim } from '../../../utils/utils';
import { Transform, TransformFnParams } from "class-transformer";

export const errorMessage = 'Names should not be empty, have any special characters or numbers, length 2-40 characters';

export class UserameValidator {
  @IsUsername()
  @Transform(({ value }: TransformFnParams) => trim(value))
  name: string;
}

export function IsUsername(validationOptions?: ValidationOptions): PropertyDecorator {
  /**
   * We could directly implement validate method by skipping check method
   * and manipulate variables to build a custom error message.
   */
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'IsUsername',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          return isUsername(value);
        },

        defaultMessage(args: ValidationArguments) {
          return errorMessage;
        }
      },
    });
  };
}

function isUsername(value: string) {
  return (
    isNotEmpty(value)
    && isString(value)
    && matches(value, /^[a-zA-Z ]{2,40}$/)        // only chars
  );
}