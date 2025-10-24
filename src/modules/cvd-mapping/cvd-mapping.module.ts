import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserModule } from '@modules/user/user.module';
import { AuthModule } from '@modules/auth/auth.module';
import { LoggedInsUserService } from '@modules/auth/logged-ins-user.service';
import { User } from '@modules/user/user.entity';
import { CvdMappingController } from './cvd-mapping.controller';
import { CvdMappingService } from './cvd-mapping.service';
import { Corporate } from '@modules/company/entities/corporate.entity';
import { Vehicle } from '@modules/vehicle/entities/vehicle.entity';
import { Driver } from '@modules/driver/entities/driver.entity';
import { CvdMapping } from './enitites/cvd-mapping.entity';
@Module({
    imports: [
        TypeOrmModule.forFeature([
            CvdMapping,
            User,
            Corporate,
            Vehicle,
            Driver
        ]),
         forwardRef(() => UserModule),
         forwardRef(() => AuthModule)
    ],
    controllers: [CvdMappingController],
    providers: [CvdMappingService, LoggedInsUserService],
    exports: [CvdMappingService]
})
export class CvdModule {}
