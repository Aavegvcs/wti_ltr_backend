import { ApiProperty } from '@nestjs/swagger';
import {
    BaseEntity,
    BeforeInsert,
    Column,
    CreateDateColumn,
    DeleteDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    OneToMany,
    OneToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn
} from 'typeorm';
import { Country } from '../countries/entities/country.entity';
import { State } from '../states/entities/state.entity';
import { Exclude } from 'class-transformer';
import { USER_STATUS } from 'src/utils/app.utils';
import { Branch } from '@modules/branch/entities/branch.entity';
import { Role } from '@modules/role/entities/role.entity';
import { Corporate } from '@modules/company/entities/corporate.entity';

@Entity({ name: 'user' })
export class User extends BaseEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: 'user_code', nullable: true })
    userCode: string;

    @Column({ nullable: true })
    firstName: string;

    @Column({ nullable: true, type: 'date' })
    dateOfBirth: Date;

    @Column({ nullable: true })
    gender: string;

    @Column({ nullable: true })
    middleName: string;

    @Column({ nullable: true })
    lastName: string;


    @Column({ nullable: true })
    phoneNumber: string;

 
    @Column({ nullable: true })
    email: string;

    @Exclude()
    @Column({ nullable: true })
    password: string;

    @Exclude()
    @Column({ nullable: true })
    newPassword: string;


    @ManyToOne(() => Role, (role) => role.users)
    @JoinColumn({ name: 'user_role' })
    userRole: Role;

    // @OneToOne(() => Employee, (data) => data.user)
    // employee: Employee;

    @Exclude()
    @Column({ nullable: true })
    otp: string;

    @Column({ default: USER_STATUS.PENDING })
    status: string;

    @ManyToOne(() => Corporate)
    @JoinColumn({ name: 'corporate_id' })
    corporate: Corporate;

    @ManyToOne(() => Branch)
    @JoinColumn({ name: 'branch_id' })
    branch: Branch;

    @ManyToOne(() => User, (user) => user.subordinates, { nullable: true })
    @JoinColumn({ name: 'reporting_officer' })
    reportingOfficer: User;

    // One RO can have many users reporting to them
    @OneToMany(() => User, (user) => user.reportingOfficer)
    subordinates: User[];

    @Exclude()
    @Column({ nullable: true })
    accessToken: string;

    @Exclude()
    @Column({ nullable: true })
    refreshToken: string;

    @Column({ nullable: true })
    logo: string;

    @CreateDateColumn({ type: 'timestamp' })
    lastLogin: Date;

    @Column({ type: 'simple-array', nullable: true })
    addresses: string[];

    @ManyToOne(() => Country)
    @JoinColumn({ name: 'country' })
    country: Country;

    @Column({ nullable: true })
    city: string;

    @ManyToOne(() => State, { nullable: true })
    @JoinColumn({ name: 'state' })
    state: State;

    @Column({ nullable: true })
    zip: string;

    @Column({ name: 'is_active', type: 'boolean', default: true })
    isActive: boolean;

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

    @Column({ nullable: true })
    prefix: string;

    @Column({ nullable: true })
    suffix: string;

    @Column({ nullable: true })
    street: string;
    @Column({ name: 'incentive_percentage', type: 'decimal', precision: 10, scale: 2, nullable: true })
    incentivePercentage: number;

    // @OneToMany(() => InsuranceTicket, (data) => data.assignTo, { nullable: true })
    // assignedTicket: InsuranceTicket[];

    // @OneToMany(() => InsuranceAssignedTo, (ticketHistory) => ticketHistory.currentAssignedTo)
    // ticketAssign: InsuranceAssignedTo[];

    @Column({ name: 'otpCreatedAt', type: 'timestamp', default: null, nullable: true })
    otpCreatedAt: Date;
}
