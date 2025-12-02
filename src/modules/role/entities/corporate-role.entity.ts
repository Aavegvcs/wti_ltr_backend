import { Corporate } from '@modules/company/entities/corporate.entity';
import { User } from '@modules/user/user.entity';
import {
    Column,
    CreateDateColumn,
    DeleteDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    OneToMany,
    OneToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn
} from 'typeorm';
import { Role } from './role.entity';
@Entity({ name: 'corporate_roles' })
export class CorporateRoles {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => Corporate, (corporate) => corporate.corporateRole)
    @JoinColumn({ name: 'corporate_id' })
    corporate: Corporate;

    @ManyToOne(() => Role, (role) => role.corporateRole)
    @JoinColumn({ name: 'role_id' })
    role: Role;

    /*---------------------------------------RoleFeatureAction-Relation-------------------------------------------------*/
    @Column({ name: 'description', nullable: true })
    description: string;

    @Column({ name: 'is_active', type: 'boolean', default: true })
    isActive: boolean;

    @CreateDateColumn({ type: 'timestamp' })
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP(6)', onUpdate: 'CURRENT_TIMESTAMP(6)' })
    updatedAt: Date;

    @DeleteDateColumn({ type: 'timestamp', nullable: true })
    deletedAt: Date;
}
