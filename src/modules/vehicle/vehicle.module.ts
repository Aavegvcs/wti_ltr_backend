
import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserModule } from '@modules/user/user.module';
import { AuthModule } from '@modules/auth/auth.module';
import { LoggedInsUserService } from '@modules/auth/logged-ins-user.service';
import { User } from '@modules/user/user.entity';
import { VehicleController } from './vehicle.controller';
import { VehicleService } from './vehicle.service';
import { Vehicle } from './entities/vehicle.entity';
import { CvdMapping } from '@modules/cvd-mapping/enitites/cvd-mapping.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            Vehicle,
            User,
            CvdMapping
        ]),
        forwardRef(() => UserModule),
        forwardRef(() => AuthModule),
    ],
    controllers: [VehicleController],
    providers: [VehicleService, LoggedInsUserService],
    exports: [VehicleService]
})
export class VehicleModule {}
