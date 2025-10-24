import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserModule } from '@modules/user/user.module';
import { AuthModule } from '@modules/auth/auth.module';
import { LoggedInsUserService } from '@modules/auth/logged-ins-user.service';
import { User } from '@modules/user/user.entity';
import { DriverController } from './driver.controller';
import { DriverService } from './driver.service';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            User
        ]),
         forwardRef(() => UserModule),
         forwardRef(() => AuthModule)
    ],
    controllers: [DriverController],
    providers: [DriverService, LoggedInsUserService],
    exports: [DriverService]
})
export class DriverModule {}
