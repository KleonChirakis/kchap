import { Group } from './group/group.entity';
import { Column, JoinColumn, ManyToOne } from 'typeorm';
import { User } from './user/user.entity';
import { Location, LocationTransformer } from './location';

export abstract class Content {

    /* Needs to be overridden to match foreign entity mapping */
    group: Group;

    /**
     * Can be overriden to match foreign entity mapping when using a transformer, but the 
     * synchronize feature will not reference field as a foreign key. When using a 
     * relationship decorator (ManyToOne), to declare a foreign key in typeorm, a second field 
     * (join column) is automatically created. This field is used only for typeorm needs and 
     * otherwise wouldn't be part of the schema. Applying the same column name to the join column 
     * name has problems. What we do is use a plain Column with an IDTransformer and declare the 
     * foreign key relationship at database level when running the initialization script. 
     * 
     * @Column({ name: 'created_by', type: 'bigint', transformer: new IDTransformer<User>()})
     * createdBy: User;
     * 
     * The second option is to use a field for relationship and a separate field for the id of the
     * foreign entity. Both should have the same column name. A mapper would be needed in order to
     * check whether the foreign entity field is filled. If not use the value of the plain field.
     */
    @ManyToOne(() => User)
    @JoinColumn({ name: 'created_by' })
    createdBy: User;

    @Column({ name: 'created_by', type: 'bigint' })
    createdById: string;

    @Column({ name: 'location', type: 'jsonb', transformer: new LocationTransformer()})
    location: Location;

    @Column({ name: 'date_time', type: "timestamp with time zone" })
    dateTime: Date;

    @Column({ name: 'created_on', type: "timestamp with time zone" })
    createdOn: Date;

    @Column({ name: 'uploaded_on', type: "timestamp with time zone", default: () => `now()` })
    uploadedOn: Date;

    @Column({ name: 'modified_on', type: "timestamp with time zone", default: () => `now()` })
    modifiedOn: Date;
}