import { plainToClass } from "class-transformer";
import { IsOptional, IsString } from "class-validator";
import { ValueTransformer } from "typeorm";
import { IsPoint } from "./validation/point.validator";
import { LatLongPoint } from "./transaction/latLongPoint";

export class Location {
    @IsOptional()
    @IsString()
    name: string;

    @IsOptional()
    @IsPoint()                                              // No need for nested validation, is handled by the decorator
    coordinates: LatLongPoint;
}

/**
 * Checked decimal (coorindates) accuracy (without string conversion)
 * and it is adequate.
 */
export class LocationTransformer implements ValueTransformer {
    to(value: Location) {
        if (value == null || (value.name == null && value.coordinates == null))
            return null;        
        return Object.fromEntries(Object.entries(value).filter(([_, v]) => v != null));
    }

    from(json: any): Location {
        if (json != null)
            return plainToClass(Location, json);
        return null;
    }
}