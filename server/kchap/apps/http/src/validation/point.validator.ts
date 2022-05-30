import { registerDecorator, ValidationOptions, ValidationArguments, isNotEmpty, isNumber } from 'class-validator';
import { LatLongPoint } from '../transaction/latLongPoint';

export const errorMessage = 'coordinates properties should have non empty numbers';


export function IsPoint(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'IsPoint',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          return check(value);
        },

        defaultMessage(args: ValidationArguments) {
          return errorMessage;
        }
      },
    });
  };
}

/**
 * @param value Can be empty (null), but its properties cannot
 */
function check(value: LatLongPoint) {
  return (
    isNotEmpty(value.lat) && isNumber(value.lat)
    && isNotEmpty(value.lon) && isNumber(value.lon)
  );
}