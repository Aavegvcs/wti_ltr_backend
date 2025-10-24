import {
    Column,
    CreateDateColumn,
    DeleteDateColumn,
    Entity,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
    OneToMany
} from 'typeorm';
import { User } from '@modules/user/user.entity';
import { CvdMapping } from '@modules/cvd-mapping/enitites/cvd-mapping.entity';

@Entity({ name: 'vehicle' })
export class Vehicle {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: 'vehicle_number', nullable: false })
    vehicleNumber: string;

    @Column({ name: 'vehicle_name', nullable: true })
    vehicleName: string;

    @Column({ name: 'vehicle_model', nullable: true })
    vehicleModel: string;

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

    @OneToMany(() => CvdMapping, (data) => data.vehicle)
    cvdMapping: CvdMapping[];
}
