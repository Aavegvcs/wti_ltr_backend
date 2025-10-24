import { User } from '@modules/user/user.entity';
import { ApiProperty } from '@nestjs/swagger';
import {
    Column,
    CreateDateColumn,
    DeleteDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryColumn,
    PrimaryGeneratedColumn,
    UpdateDateColumn
} from 'typeorm';

@Entity({ name: 'user_role' })
export class UserRole {
    @PrimaryGeneratedColumn()
    id: number;
    

    // @PrimaryColumn({unique: true})
    // userId: User;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'user_id' })
    userId: User;

    @Column({name:'role_id'})
    roleId: number;

    @CreateDateColumn({ type: 'timestamp' })
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP(6)', onUpdate: 'CURRENT_TIMESTAMP(6)' })
    updatedAt: Date;

    @DeleteDateColumn({ type: 'timestamp', nullable: true })
    deletedAt: Date;
}
