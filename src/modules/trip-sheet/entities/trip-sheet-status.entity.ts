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
    PrimaryColumn
} from 'typeorm';
import { User } from '@modules/user/user.entity';
import { CvdMapping } from '@modules/cvd-mapping/enitites/cvd-mapping.entity';

@Entity({ name: 'trip_sheet_status' })
export class TripSheetStatus {

    @PrimaryColumn({ name: 'id', type: 'int' })
    id: number;

    @Column({ name: 'status', nullable: false })
    status: string;

    @Column({ name: 'is_active', type: 'boolean', default: true })
    isActive: boolean;

}
