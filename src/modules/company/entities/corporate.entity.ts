import { Branch } from '@modules/branch/entities/branch.entity';
import { CvdMapping } from '@modules/cvd-mapping/enitites/cvd-mapping.entity';
import { User } from '@modules/user/user.entity';
import { ApiProperty } from '@nestjs/swagger';
import { Country } from 'src/modules/countries/entities/country.entity';
import { State } from 'src/modules/states/entities/state.entity';
import {
    BaseEntity,
    Column,
    CreateDateColumn,
    Entity,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
    DeleteDateColumn,
    BeforeInsert,
    OneToMany,
    ManyToOne,
    JoinColumn
} from 'typeorm';

@Entity({ name: 'corporate' })
export class Corporate extends BaseEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({
        name: 'corporate_code',
        unique: true,
        nullable: false
    })
    corporateCode: string;

    @ApiProperty({
        description: 'corporate Name',
        example: 'ITS'
    })
    @Column({
        unique: true
    })
    corporateName: string;

    @ApiProperty({
        description: 'Timezone',
        example: 'Central Standard Time'
    })
    @Column({ nullable: true })
    timezone: string;

    @ApiProperty({
        description: 'Company Logo',
        example: 'ITS Company Logo'
    })

     @Column({ nullable: true })
    corporateLogo: string;

    @ApiProperty({
        description: 'Date Format',
        example: 'MM:DD:YYYY'
    })
    @Column({ nullable: true })
    dateFormat: string;

    @ApiProperty({
        description: 'Currency',
        example: ' $ , INR'
    })
    @Column({ nullable: true })
    currency: string;

    @ApiProperty({
        description: 'Phone Number',
        example: ' 675879'
    })
    @Column({ nullable: true })
    phoneNumber: string;

    @Column({ name: 'admin_name', nullable: true })
    adminName: string;

    @Column({ name: 'number_of_vehicle', nullable: true })
    numberOfVehicle: string;

    @Column({ name: 'gst', nullable: true })
    gst: string;

    @Column({ name: 'pan_number', nullable: true })
    panNumber: string;

    @Column({ name: 'po_number', nullable: true })
    po_number: string; // po means purchase order

    @Column({type: 'date', name: 'po_date', nullable: true })
    po_date: Date;

    @Column({type: 'date', name: 'po_validity', nullable: true })
    po_validity: Date;

    @Column({ type: 'json', name: 'documents', nullable: true })
    documents: any;

    @ApiProperty({
        description: 'Secondary Phone Number',
        example: ' 675879'
    })
    @Column({ nullable: true })
    secondaryPhoneNumber: string;

    @ApiProperty({
        description: 'created By',
        example: ' created by logged in user Id'
    })
    @ApiProperty({
        description: 'is_active'
    })
    @Column({ name: 'is_active', default: true })
    isActive: boolean;

    @Column({ nullable: true })
    address: string;

    @ManyToOne(() => Country)
    @JoinColumn({ name: 'country' })
    country: Country;

    @ManyToOne(() => State)
    @JoinColumn({ name: 'state' })
    state: State;

    @Column({ nullable: true })
    fax: string;

    @Column({ nullable: true })
    email: string;

    @CreateDateColumn({ type: 'timestamp', default: null, nullable: true })
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP(6)', onUpdate: 'CURRENT_TIMESTAMP(6)' })
    updatedAt: Date;

    @DeleteDateColumn({ type: 'timestamp', nullable: true })
    deletedAt: Date;

    @BeforeInsert()
    updateTimestamps() {
        this.createdAt = new Date(Date.now());
    }

    @ManyToOne(() => User)
    @JoinColumn({ name: 'created_by' })
    createdBy: User;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'updated_by' })
    updatedBy: User;

    @OneToMany(() => Branch, (data) => data.corporate, { nullable: true })
    branch: Branch[];

    @OneToMany(() => CvdMapping, (data) => data.corporate, { nullable: true })
    cvdMapping: CvdMapping[];
}
