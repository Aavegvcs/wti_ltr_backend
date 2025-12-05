import { Process, Processor } from '@nestjs/bull';
import { InjectRepository } from '@nestjs/typeorm';
import { Job } from 'bull';
import { Repository } from 'typeorm';
import { TripSheet } from './entities/trip-sheet.entity';
@Processor('trip-queue')
export class TripWorker {
    private readonly debounceMap = new Map<number, NodeJS.Timeout>();

    constructor(
        @InjectRepository(TripSheet)
        private readonly tripSheetRepo: Repository<TripSheet>
    ) {}

    @Process('updateTrip')
    async handleUpdate(job: Job) {
        const { tripSheetId, updates } = job.data;

        if (this.debounceMap.has(tripSheetId)) {
            clearTimeout(this.debounceMap.get(tripSheetId));
        }

        const timer = setTimeout(async () => {
            await this.applyUpdate(tripSheetId, updates);
            this.debounceMap.delete(tripSheetId);
        }, 5000);

        this.debounceMap.set(tripSheetId, timer);
    }

    async applyUpdate(tripSheetId: number, updates: any) {
        try {
            const trip = await this.tripSheetRepo.findOne({ where: { id: tripSheetId } });
            if (!trip) return;

            const finalData = { ...trip, ...updates };

            // if (finalData.startOdometer !== undefined && finalData.endOdometer !== undefined) {
            //     if (finalData.startOdometer > finalData.endOdometer) return;

            //     finalData.totalKm = finalData.endOdometer - finalData.startOdometer;
            // }
             finalData.updatedAt = new Date();
            console.log('here is final data2', finalData);
            await this.tripSheetRepo.update({ id: tripSheetId }, finalData);
        } catch (error) {
            console.log('error❌❌❌ in applyUpdate -api- tripsheet/updateTripsheetApi ', error.message);
        }
        // console.log(`TripSheet ${tripSheetId} updated`, finalData);
    }
}
