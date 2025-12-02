import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserModule } from '@modules/user/user.module';
import { AuthModule } from '@modules/auth/auth.module';
import { LoggedInsUserService } from '@modules/auth/logged-ins-user.service';
import { User } from '@modules/user/user.entity';
import { TripSheetController } from './trip-sheet.controller';
import { TripSheetService } from './trip-sheet.service';
import { TripSheet } from './entities/trip-sheet.entity';
import { Driver } from '@modules/driver/entities/driver.entity';
import { CvdMapping } from '@modules/cvd-mapping/enitites/cvd-mapping.entity';
import { TripWorker } from './trip-sheet-worker.processor';
import { BullModule } from '@nestjs/bull';
import { TripSheetHistory } from './entities/trip-sheet-history.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            User,
            TripSheet,
            Driver,
            CvdMapping,
            TripSheetHistory
        ]),
         forwardRef(() => UserModule),
         forwardRef(() => AuthModule),
          BullModule.registerQueue({ name: 'trip-queue' })
    ],
    controllers: [TripSheetController],
    providers: [TripSheetService, LoggedInsUserService, TripWorker],
    exports: [TripSheetService]
})
export class TripSheetModule {}
