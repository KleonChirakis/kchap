import { ValueTransformer } from "typeorm";

export interface EntityID {
    id: any;
}

/**
 * This sets the foreign id as the default return type of the column.
 * If we want to fetch the entity, along with its id, we can map it to
 * this column using appropriate query statements.
 */
export default class IDTransformer<T extends EntityID> implements ValueTransformer {
    to(value: T) {
        return value.id
    }

    from(value): T {
        return { id: value } as T;
    }
}