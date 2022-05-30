import { registerDecorator, ValidationOptions, ValidationArguments } from "class-validator";

export class DeviceIdValidator {
  @IsDeviceId()
  deviceId: string;

  constructor(deviceId: string) {
    this.deviceId = deviceId
  }
}

export const deviceIdErrorMessage = 'DeviceId invalid';

export enum DeviceIdEnum {
  OTHER = "other"
}

export function IsDeviceId(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'IsDeviceId',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          return checkDeviceId(value);
        },

        defaultMessage(args: ValidationArguments) {
          return deviceIdErrorMessage;
        }
      },
    });
  };
}

function checkDeviceId(value: string) {
  let rules = 
    (<any>Object).values(DeviceIdEnum).includes(value) || 
      /^[0-9a-fA-F]+$/.test(value);
  return rules;
}