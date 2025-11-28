import {
    Column,
    CreateDateColumn,
    DeleteDateColumn,
    Entity,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
    Index
} from 'typeorm';
import { User } from '@modules/user/user.entity';
import { Corporate } from '@modules/company/entities/corporate.entity';
import { Vehicle } from '@modules/vehicle/entities/vehicle.entity';
import { Driver } from '@modules/driver/entities/driver.entity';
import { TripSheetStatus } from './trip-sheet-status.entity';
import { Branch } from '@modules/branch/entities/branch.entity';
import { TripSheetStatusEnum } from 'src/utils/app.utils';

@Entity({ name: 'trip_sheet' })
export class TripSheet {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => Corporate)
    @JoinColumn({ name: 'corporate_id' })
    corporate: Corporate;

    @ManyToOne(() => Branch)
    @JoinColumn({ name: "branch_id" })
    branch: Branch;

    @ManyToOne(() => Vehicle)
    @JoinColumn({ name: 'vehicle_id' })
    vehicle: Vehicle;

    // @ManyToOne(() => Driver)
    // @JoinColumn({ name: 'driver_id' })
    // driver: Driver;

    @Index('idx_driver_id_in_trip_sheet')     // <-- Add INDEX here
    @ManyToOne(() => Driver, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'driver_id' })
    driver: Driver;

    @Column({ type: 'int', name: 'trip_status' })
    tripStatus: TripSheetStatusEnum;

    @Column({ type: 'date', name: 'trip_date', nullable: true })
    tripDate: Date;

    @Column({ type: 'time', name: 'start_time', nullable: true })
    startTime: string;

    @Column({ type: 'int', name: 'start_odometer', nullable: true })
    startOdometer: number;

    @Column({ type: 'int', name: 'end_odometer', nullable: true })
    endOdometer: number;


    @Column({ type: 'time', name: 'end_time', nullable: true })
    endTime: string;

   

    @Column({ type: 'decimal', name: 'total_km', precision: 10, scale: 2, nullable: true })
    totalKm: number;

    @Column({ name: 'source_name', type: 'varchar', length: 255, nullable: true })
    sourceName: string;

    @Column({ name: 'destination_name', type: 'varchar', length: 255, nullable: true })
    destinationName: string;

    @Column({ name: 'driver_sign', nullable: true })
    driverSign: string;

    @Column({ name: 'user_sign', nullable: true })
    userSign: string;

    @Column({ type: 'decimal', precision: 10, scale: 6, name: 'start_lat', nullable: true })
    startLat: number;

    @Column({ type: 'decimal', precision: 10, scale: 6, name: 'start_lng', nullable: true })
    startLng: number;

    @Column({ type: 'decimal', precision: 10, scale: 6, name: 'end_lat', nullable: true })
    endLat: number;

    @Column({ type: 'decimal', precision: 10, scale: 6, name: 'end_lng', nullable: true })
    endLng: number;

    @Column({ type: 'decimal', precision: 10, scale: 6, name: 'driver_sign_lat', nullable: true })
    driverSignLat: number;

    @Column({ type: 'decimal', precision: 10, scale: 6, name: 'driver_sign_lng', nullable: true })
    driverSignLng: number;

    @Column({ type: 'decimal', precision: 10, scale: 6, name: 'user_sign_lat', nullable: true })
    userSignLat: number;

    @Column({ type: 'decimal', precision: 10, scale: 6, name: 'user_sign_lng', nullable: true })
    userSignLng: number;

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
}
