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
import { TripSheetStatusEnum } from 'src/utils/app.utils';

@Entity({ name: 'trip_sheet_status' })
export class TripSheetStatus {

    @PrimaryColumn({ name: 'id', type: 'int' })
    id: number;

    @Column({type:'enum', enum:TripSheetStatusEnum,  name: 'status', nullable: false })
    status: TripSheetStatusEnum;

    @Column({name:'description', nullable: true})
    description: string;

    @Column({ name: 'is_active', type: 'boolean', default: true })
    isActive: boolean;

}
