import { Module, forwardRef } from '@nestjs/common';
import { RoleService } from './role.service';
import { RoleController } from './role.controller';
import { Role } from './entities/role.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserRoleModule } from '../user-role/user-role.module';
import { UserModule } from '../user/user.module';
import { AuthModule } from '@modules/auth/auth.module';
import { User } from '@modules/user/user.entity';
import { LoggedInsUserService } from '@modules/auth/logged-ins-user.service';

@Module({
    imports: [
        TypeOrmModule.forFeature([Role, User]),
        UserRoleModule,
        forwardRef(() => UserModule),
    ],
    controllers: [RoleController],
    providers: [RoleService, LoggedInsUserService],
    exports: [RoleService]
})
export class RoleModule {}
