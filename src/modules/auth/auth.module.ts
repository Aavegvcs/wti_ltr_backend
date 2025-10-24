import { Global, MiddlewareConsumer, Module, NestModule, forwardRef } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { LocalStrategy } from './local.strategy';
import { UserModule } from '../user/user.module';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './jwt.strategy';
import { jwtConfig } from '../../config/jwt.config';
import { ReferenceModule } from '../reference/reference.module';
import { LogModule } from '../log/log.module';
import { NotificationModule } from '../notification/notification.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../user/user.entity';
import { TokenService } from './tokens.service';
import { JwtVerifyStrategy } from './strategies/verify.strategy';
import { JwtAccessStrategy } from './strategies/access.strategy';
import { JwtRefreshStrategy } from './strategies/refresh.strategy';
import { MediaModule } from '../media/media.module';
import { RoleModule } from '../role/role.module';
import { EmailService } from '@modules/email/email.service';
import { InsuranceRolePermission } from '@modules/insurance-role-permission/entities/insurance-role-permission.entity';
import { EmailModule } from '@modules/email/email.module';
import { HttpModule } from '@nestjs/axios';
import { Corporate } from '@modules/company/entities/corporate.entity';
import { JwtAuthGuard } from './jwt-auth.guard';
import { LoggedInsUserService } from './logged-ins-user.service';


@Global()
@Module({
    imports: [
        // AwsModule,
        JwtModule.registerAsync(jwtConfig),
        PassportModule,
        ReferenceModule,
        LogModule,
        MediaModule,
        RoleModule,
        // UserFeatureActionModule,
        HttpModule,
        forwardRef(() => EmailModule),
        // forwardRef(() => RoleFeatureActionModule),
        forwardRef(() => NotificationModule),
        TypeOrmModule.forFeature([User]),
        forwardRef(() => UserModule),
        TypeOrmModule.forFeature([Corporate]),
         TypeOrmModule.forFeature([InsuranceRolePermission])
    ],
    providers: [
        AuthService,
        LocalStrategy,
        JwtStrategy,
        JwtVerifyStrategy,
        JwtAccessStrategy,
        JwtRefreshStrategy,
        TokenService,
        EmailService,
        JwtAuthGuard,
        LoggedInsUserService,
    ],
    controllers: [AuthController],
    exports: [
        JwtModule,
        AuthService,
        JwtStrategy,
        JwtVerifyStrategy,
        JwtAccessStrategy,
        JwtRefreshStrategy,
        TokenService,
        JwtAuthGuard,
        LoggedInsUserService,
        TypeOrmModule
    ]
})
export class AuthModule {}
