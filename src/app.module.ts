import { Module, NestModule, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { UserModule } from './modules/user/user.module';
import { AuthModule } from './modules/auth/auth.module';
import { CorsMiddleware } from './middlewares/cors.middleware';
import { ReferenceModule } from './modules/reference/reference.module';
import { ClientDetailsMiddleware } from './middlewares/clientDetails.middleware';
import { DecryptDataMiddleware } from './middlewares/decrypt.middleware';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { EncryptionInterceptor } from './interceptors/encrypt.interceptor';
import { GlobalExceptionFilter } from './filters/exception.filter';
import { EmailModule } from './modules/email/email.module';
import { MediaModule } from './modules/media/media.module';
import { CorporateModule } from './modules/company/corporate.module';
import { RoleModule } from './modules/role/role.module';
import { UserRoleModule } from './modules/user-role/user-role.module';
import { typeOrmAsyncConfig } from './config/typeorm.config';
import { CheckDtTableMiddleware } from './middlewares/dtTables.middleware';
import * as bodyParser from 'body-parser';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { CountriesModule } from './modules/countries/countries.module';
import { StatesModule } from './modules/states/states.module';
import { AwsModule } from './modules/aws/aws.module';
import { BranchModule } from '@modules/branch/branch.module';
const cookieParser = require('cookie-parser')();
import { InsuranceRolePermissionModule } from '@modules/insurance-role-permission/insurance-role-permission.module';
// import { BullModule } from '@nestjs/bull';
import { InsuranceDashboardModule } from '@modules/insurance-dashboard/insurance-dashboard.module';
import { RedisModule } from '@modules/redis/redis.module';
import { DriverModule } from '@modules/driver/driver.module';
import { VehicleModule } from '@modules/vehicle/vehicle.module';
import { CvdModule } from '@modules/cvd-mapping/cvd-mapping.module';
import { TripSheetModule } from '@modules/trip-sheet/trip-sheet.module';
@Module({
    imports: [
        AwsModule,
        UserModule,
        ReferenceModule,
        AuthModule,
        ConfigModule.forRoot({
            isGlobal: true
        }),
        TypeOrmModule.forRootAsync(typeOrmAsyncConfig),
        EmailModule,
        MediaModule,
        BranchModule,
        CorporateModule,
        RoleModule,
        UserRoleModule,
        EventEmitterModule.forRoot(),
        CountriesModule,
        StatesModule,
        InsuranceRolePermissionModule,
        DriverModule,
        VehicleModule,
        CvdModule,
        TripSheetModule,

        // BullModule.forRoot({
        //     redis: {
        //         host: process.env.REDIS_HOST,
        //         port: 6379
        //     }
        // }),
        InsuranceDashboardModule,
         RedisModule
    ],
    controllers: [AppController],
    providers: [
        AppService,
        {
            provide: APP_INTERCEPTOR,
            useClass: EncryptionInterceptor
        },
        {
            provide: APP_FILTER,
            useClass: GlobalExceptionFilter
        }
    ]
})
export class AppModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        consumer.apply(CorsMiddleware).forRoutes('*');
        consumer.apply(DecryptDataMiddleware).forRoutes('*');
        consumer.apply(cookieParser).forRoutes('*');
        consumer.apply(bodyParser.json()).forRoutes('*');
        consumer.apply(ClientDetailsMiddleware).forRoutes({ path: '*', method: RequestMethod.ALL });
        consumer.apply(CheckDtTableMiddleware).forRoutes({ path: '*', method: RequestMethod.POST });
    }
}
