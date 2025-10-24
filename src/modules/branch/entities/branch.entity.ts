import {
    BaseEntity,
    OneToMany,
    ManyToOne,
    JoinColumn,
    Column,
    Entity,
    CreateDateColumn,
    UpdateDateColumn,
    DeleteDateColumn,
    PrimaryColumn,
    OneToOne,
    ManyToMany,
    JoinTable
} from 'typeorm';
import { State } from '@modules/states/entities/state.entity';
import { branchModelsArr } from 'src/utils/app.utils';
import { User } from '@modules/user/user.entity';
import { Corporate } from '@modules/company/entities/corporate.entity';

@Entity()
export class Branch extends BaseEntity {
    @PrimaryColumn({ unique: true, type: 'varchar', length: 50, nullable: false })
    id: string;

    
    @Column({
        name: 'branch_code',
        unique: true,
        nullable:false
    })
    branchCode: string;

    @ManyToOne(() => Corporate, (corporate) => corporate.branch, { nullable: true })
    @JoinColumn({ name: 'corporate_id' })
    corporate: Corporate;

    @Column({ nullable: false })
    name: string;

    @ManyToOne(() => State, { nullable: true })
    @JoinColumn({ name: 'state_id' })
    state: State;

    // @Column({ nullable: false })
    // city: string;

    @Column({ nullable: true })
    pincode: number;

    @Column({name:'is_active', default: true })
    isActive: boolean;

    @Column()
    address: string;

    @Column({ type: 'simple-array', nullable: true })
    segments: string[];

    @Column({ nullable: true })
    email: string;

    @ManyToOne(() => User, (user) => user.managedBranches, { nullable: true })
    regionalManager: User;

    @ManyToOne(() => User, (user) => user.rmBranches, { nullable: true })
    @JoinColumn({ name: 'rmId' })
    rm: User;

    @Column({ nullable: true })
    phone: string;

    @Column({ nullable: true })
    panNumber: string;

    @Column({ type: 'date', nullable: true })
    activationDate: Date;


    @Column({ name: 'contact_person', nullable: true })
    contactPerson: string;

    @CreateDateColumn({
        type: 'timestamp',
        default: () => 'CURRENT_TIMESTAMP(6)'
    })
    createdAt: Date;

    @UpdateDateColumn({
        type: 'timestamp',
        default: () => 'CURRENT_TIMESTAMP(6)',
        onUpdate: 'CURRENT_TIMESTAMP(6)'
    })
    updatedAt: Date;

    @DeleteDateColumn({ type: 'timestamp', nullable: true })
    deletedAt: Date;


    // Self-referencing Many-to-One (Each branch can have one control branch)
    @ManyToOne(() => Branch, (branch) => branch.subBranches, { nullable: true })
    @JoinColumn({ name: 'control_branch_id' })
    controlBranch: Branch;

    // Self-referencing One-to-Many (Each branch can be a control branch for many)
    @OneToMany(() => Branch, (branch) => branch.controlBranch)
    subBranches: Branch[];

    @OneToMany(() => User, (user) => user.branch)
    employees: User[];

    // @OneToMany(() => InsuranceTicket, (data) => data.branch)
    // tickets: InsuranceTicket[];

    @OneToMany(() => User, (user) => user.branch)
    user: User[];


}
