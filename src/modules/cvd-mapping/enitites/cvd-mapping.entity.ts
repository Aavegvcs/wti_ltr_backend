
import {
    Column,
    CreateDateColumn,
    DeleteDateColumn,
    Entity,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
    Unique,
    Index
} from 'typeorm';
import { User } from '@modules/user/user.entity';
import { Corporate } from '@modules/company/entities/corporate.entity';
import { Branch } from '@modules/branch/entities/branch.entity';
import { Driver } from '@modules/driver/entities/driver.entity';
import { Vehicle } from '@modules/vehicle/entities/vehicle.entity';

@Entity({ name: 'cvd_mapping' })
// @Unique(['driver'])
export class CvdMapping {
    @PrimaryGeneratedColumn()
    id: number;
    // ============== RELATIONS ===================
    @ManyToOne(() => Corporate, c => c.cvdMapping, { nullable: true })
    @JoinColumn({ name: 'corporate_id' })
    corporate: Corporate;
   
    @ManyToOne(() => Branch, branch => branch.cvdMapping, {nullable: false})
    @JoinColumn({ name: 'branch_id'})
    branch: Branch;

    @ManyToOne(() => Vehicle, v => v.cvdMapping, { nullable: false })
    @JoinColumn({ name: 'vehicle_id' })
    vehicle: Vehicle;

    @Index('idx_driver_id_in_cvd', {unique:true}) 
    @ManyToOne(() => Driver, d => d.cvdMapping, { nullable: false })
    @JoinColumn({ name: 'driver_id' })
    driver: Driver;

    // ============================================
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
}
