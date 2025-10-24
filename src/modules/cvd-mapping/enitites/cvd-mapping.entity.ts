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
import { Corporate } from '@modules/company/entities/corporate.entity';
import { Driver } from '@modules/driver/entities/driver.entity';
import { Vehicle } from '@modules/vehicle/entities/vehicle.entity';
// cvd mapping --> corporate vehicle driver mapping
@Entity({ name: 'cvd_mapping' })
export class CvdMapping {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => Corporate, (corporate) => corporate.cvdMapping, { nullable: false })
    @JoinColumn({ name: 'corporate_id' })
    corporate: Corporate;

    @ManyToOne(() => Vehicle, (vehicle) => vehicle.cvdMapping, { nullable: false })
    @JoinColumn({ name: 'vehicle_id' })
    vehicle: Vehicle;

    @ManyToOne(() => Driver, (driver) => driver.cvdMapping, { nullable: false })
    @JoinColumn({ name: 'driver_id' })
    driver: Driver;

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
}
