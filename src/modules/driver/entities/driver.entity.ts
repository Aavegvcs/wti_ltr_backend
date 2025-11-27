import {
    Column,
    CreateDateColumn,
    DeleteDateColumn,
    Entity,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
    OneToMany,
    Index
} from 'typeorm';
import { User } from '@modules/user/user.entity';
import { CvdMapping } from '@modules/cvd-mapping/enitites/cvd-mapping.entity';

@Entity({ name: 'driver' })
export class Driver {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: 'name', nullable: false })
    name: string;

    @Index('idx_driver_mobile_number')
    @Column({ name: 'mobile_number', nullable: false })
    mobileNumber: string;

    @Column({ name: 'pan_number', nullable: true })
    panNumber: string;

    @Column({ name: 'cancel_cheque', nullable: true })
    cancelCheque: string;


    @Column({ type: 'json', name: 'documents', nullable: true })
    documents: any;

    @Column({ name: 'is_active', type: 'boolean', default: true })
    isActive: boolean;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'created_by' })
    createdBy: User;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'updated_by' })
    updatedBy: User;

    @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
    updatedAt: Date;

    @DeleteDateColumn({ name: 'deleted_at', type: 'timestamp', nullable: true })
    deletedAt: Date;

    @OneToMany(() => CvdMapping, (data) => data.driver, { cascade: true, onDelete: 'CASCADE' })
     cvdMapping: CvdMapping[];
}
