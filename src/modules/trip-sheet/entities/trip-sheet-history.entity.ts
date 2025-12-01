import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { TripSheet } from "./trip-sheet.entity";
import { User } from "@modules/user/user.entity";

@Entity({ name: 'trip_sheet_history' })
export class TripSheetHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => TripSheet)
  @JoinColumn({ name: 'trip_sheet_id' })
  tripSheet: TripSheet;

  @Column({ type: 'json', name:'old_values', nullable:true })
  oldValues: any;

  @Column({ type: 'json', name:'new_values', nullable:true })
  newValues: any;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'changed_by' })
  changedBy: User;

  @CreateDateColumn({name:'changed_at'})
  changedAt: Date;
}
