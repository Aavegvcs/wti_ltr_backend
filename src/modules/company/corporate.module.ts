import { Module, forwardRef } from '@nestjs/common';
import { CorporateService } from './corporate.service';
import { CorporateController } from './corporate.controller';
import { AuthModule } from '../auth/auth.module';
import { LogModule } from '../log/log.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Corporate } from './entities/corporate.entity';
import { MediaModule } from '../media/media.module';
import { User } from '../user/user.entity';
import { UserModule } from '../user/user.module';
import { Branch } from '@modules/branch/entities/branch.entity';
import { CvdMapping } from '@modules/cvd-mapping/enitites/cvd-mapping.entity';
import { Country } from '@modules/countries/entities/country.entity';
import { State } from '@modules/states/entities/state.entity';

@Module({
    imports: [
        AuthModule,
        MediaModule,
        LogModule,
        forwardRef(() => UserModule),
        TypeOrmModule.forFeature([Corporate, User, Branch, CvdMapping, Country, State])
    ],
    controllers: [CorporateController],
    providers: [CorporateService],
    exports: [CorporateService]
})
export class CorporateModule {}
