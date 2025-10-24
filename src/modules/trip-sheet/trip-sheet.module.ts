import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserModule } from '@modules/user/user.module';
import { AuthModule } from '@modules/auth/auth.module';
import { LoggedInsUserService } from '@modules/auth/logged-ins-user.service';
import { User } from '@modules/user/user.entity';
import { TripSheetController } from './trip-sheet.controller';
import { TripSheetService } from './trip-sheet.service';
import { FirstTripSheet } from './entities/first-trip-sheet.entity';
import { TripSheetStatus } from './entities/trip-sheet-status.entity';
import { Driver } from '@modules/driver/entities/driver.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            User,
            TripSheetStatus,
            FirstTripSheet,
            Driver
        ]),
         forwardRef(() => UserModule),
         forwardRef(() => AuthModule)
    ],
    controllers: [TripSheetController],
    providers: [TripSheetService, LoggedInsUserService],
    exports: [TripSheetService]
})
export class TripSheetModule {}
