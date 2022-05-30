import { registerDecorator, ValidationOptions, ValidationArguments, isNotEmpty, isString, minLength, matches, isByteLength } from "class-validator";

export class PasswordValidator {
  @IsPassword()
  password: string;

  constructor(password: string) {
    this.password = password
  }
}

export const passwordErrorMessage = 'Minimum eight characters, at least one letter, one number and one special character';
export const passwordLengthExceededMessage = 'Please choose a smaller password';

export function IsPassword(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'IsPassword',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          return checkPassword(value);
        },

        defaultMessage(args: ValidationArguments) {
          if (!checkByteLength(args.value))
            return passwordLengthExceededMessage;
          return passwordErrorMessage;
        }
      },
    });
  };
}

function checkByteLength(value: string) {
  return isByteLength(value, 0, 72);        // Bcrypt has a password limit of 72 bytes (accept 0 bytes to move to the next check which also checks length and shows appropriate message)
}

function checkPassword(value: string) {
  let rules =
    isNotEmpty(value)
    && isString(value)
    && minLength(value, 8)
    && checkByteLength(value);

  if (process.env.NODE_ENV === 'production') {
    rules = rules
      && matches(value, /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$.!%*#?&])[A-Za-z\d@$.!%*#?&]{8,}$/);
  }

  return rules;
}