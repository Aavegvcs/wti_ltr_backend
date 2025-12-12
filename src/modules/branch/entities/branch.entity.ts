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
    JoinTable,
    PrimaryGeneratedColumn
} from 'typeorm';
import { State } from '@modules/states/entities/state.entity';
import { branchModelsArr } from 'src/utils/app.utils';
import { User } from '@modules/user/user.entity';
import { Corporate } from '@modules/company/entities/corporate.entity';
import { CvdMapping } from '@modules/cvd-mapping/enitites/cvd-mapping.entity';

@Entity({ name: 'branch' })
export class Branch extends BaseEntity {
    // @PrimaryColumn({ unique: true, type: 'varchar', length: 50 })
    // id: string;
    @PrimaryGeneratedColumn()
    id: number;


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

    @Column({ nullable: true })
    email: string;

    @Column({ nullable: true })
    phone: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @DeleteDateColumn()
    deletedAt: Date;

    @OneToMany(() => User, (user) => user.branch)
    employees: User[];
    @ManyToOne(() => User)
    @JoinColumn({ name: 'created_by' })
    createdBy: User;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'updated_by' })
    updatedBy: User;

    // CVD Mapping (Corporate–Branch–Vehicle–Driver)
    @OneToMany(() => CvdMapping, cvd => cvd.branch)
    cvdMapping: CvdMapping[];
}