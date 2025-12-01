
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

@Index(['vehicleName'])   // 👈 This one is fine
@Entity({ name: 'vehicle' })
export class Vehicle {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: 'vehicle_number', nullable: false, unique: true })
    vehicleNumber: string;

    @Column({ name: 'vehicle_name', nullable: true, length: 100 })
    vehicleName: string;

    @Column({ name: 'vehicle_model', nullable: true, length: 50 })
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

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;

    @DeleteDateColumn({ name: 'deleted_at', nullable: true })
    deletedAt: Date;

    @OneToMany(() => CvdMapping, cvd => cvd.vehicle, {
        cascade: true,
        onDelete: 'CASCADE'
    })
    cvdMapping: CvdMapping[];
}
