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
import { CvdMapping } from '@modules/cvd-mapping/enitites/cvd-mapping.entity';

@Entity({ name: 'branch' })
export class Branch extends BaseEntity {
    @PrimaryColumn({ unique: true, type: 'varchar', length: 50 })
    id: string;

    @Column({ name: 'branch_code', unique: true })
    branchCode: string;

    @ManyToOne(() => Corporate, corporate => corporate.branch, { nullable: false })
    @JoinColumn({ name: 'corporate_id' })
    corporate: Corporate;

    @Column()
    name: string;

    @ManyToOne(() => State, { nullable: true })
    @JoinColumn({ name: 'state_id' })
    state: State;

    @Column({ nullable: true })
    city: string;   // <- ADD BACK if needed

    @Column({ nullable: true })
    pincode: number;

    @Column({ name: 'is_active', default: true })
    isActive: boolean;

    @Column()
    address: string;

    @Column({ type: 'simple-array', nullable: true })
    segments: string[];

    @Column({ nullable: true })
    email: string;

    @ManyToOne(() => User, user => user.managedBranches, { nullable: true })
    regionalManager: User;

    @ManyToOne(() => User, user => user.rmBranches, { nullable: true })
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

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @DeleteDateColumn()
    deletedAt: Date;

    // Control branch (parent)
    @ManyToOne(() => Branch, branch => branch.subBranches, { nullable: true })
    @JoinColumn({ name: 'control_branch_id' })
    controlBranch: Branch;

    // Sub-branches (children)
    @OneToMany(() => Branch, branch => branch.controlBranch)
    subBranches: Branch[];

    @OneToMany(() => User, (user) => user.branch)
    employees: User[];

    // CVD Mapping (Corporate–Branch–Vehicle–Driver)
    @OneToMany(() => CvdMapping, cvd => cvd.branch)
    cvdMapping: CvdMapping[];
}
