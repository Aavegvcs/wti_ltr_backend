import {
    Injectable,
    Inject,
    forwardRef
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthService } from '../auth/auth.service';
import { Corporate } from './entities/corporate.entity';
import { LogService } from '../log/log.service';
import { MediaService } from '../media/media.service';
import { User } from '../user/user.entity';
import { orderByKey, orderByValue } from 'src/utils/app.utils';
// import { Action } from '../ability/ability.factory';
import { UserService } from '../user/user.service';
import { CreateCorporateDto } from './dto/company-create.dto';
import { UpdateCorporateDto } from './dto/update-company.dto';
import { ConflictException } from '@nestjs/common';
import { StandardResponse } from 'src/utils/helper/response.helper';
import { Branch } from '../branch/entities/branch.entity';
import { CvdMapping } from '../cvd-mapping/enitites/cvd-mapping.entity';

@Injectable()
export class CorporateService {
    // constructor(
    //     @InjectRepository(Corporate)
    //     private corporateRepo: Repository<Corporate>,
    // ) { }
    constructor(
        @InjectRepository(Corporate)
        private corporateRepo: Repository<Corporate>,

        @InjectRepository(Branch)
        private branchRepo: Repository<Branch>,

        @InjectRepository(CvdMapping)
        private cvdRepo: Repository<CvdMapping>,
    ) { }


    async companyList(req: any): Promise<any> {
        const query = this.corporateRepo
            .createQueryBuilder('company')
            .leftJoinAndSelect('company.state', 'state')
            .leftJoinAndSelect('company.country', 'country')
            .orderBy('company.id', 'DESC');

        if (req?.QUERY_STRING?.where) query.where(req.QUERY_STRING.where);
        if (req?.QUERY_STRING?.skip) query.skip(req.QUERY_STRING.skip);
        if (req?.QUERY_STRING?.limit) query.take(req.QUERY_STRING.limit);

        const [items, total] = await query.getManyAndCount();

        return {
            items,
            pagination: {
                total,
                page: req?.QUERY_STRING?.page || 1,
                limit: req?.QUERY_STRING?.limit || items.length,
            },
        };
    }

    async createCorporate(dto: CreateCorporateDto) {
        const { country, state, ...rest } = dto;

        const corporate = this.corporateRepo.create({
            ...rest,
            country: country ? { id: country } : undefined,
            state: state ? { id: state } : undefined,
        });

        return await this.corporateRepo.save(corporate);
    }

    // async updateCorporate(dto: UpdateCorporateDto) {
    //     const { id, country, state, ...rest } = dto;

    //     await this.corporateRepo.update(id, {
    //         ...rest,
    //         country: country ? { id: country } : undefined,
    //         state: state ? { id: state } : undefined,
    //     });

    //     return this.findCorporateById(id);
    // }
    async updateCorporate(dto: UpdateCorporateDto) {
        const { id, country, state, ...rest } = dto;

        const corporate = await this.corporateRepo.findOne({
            where: { id },
        });

        if (!corporate) {
            throw new ConflictException('Corporate not found');
        }

        const wasActive = corporate.isActive; 

        await this.corporateRepo.update(id, {
            ...rest,
            country: country ? { id: country } : undefined,
            state: state ? { id: state } : undefined,
        });

        const updatedCorporate = await this.findCorporateById(id);

        // ✅✅✅ CASCADE: IF CORPORATE TURNED INACTIVE
        if (wasActive === true && updatedCorporate.isActive === false) {
            // 1️⃣ Deactivate all branches under this corporate
            await this.branchRepo.update(
                { corporate: { id } },
                { isActive: false }
            );

            // 2️⃣ Deactivate all CVD mappings under this corporate
            await this.cvdRepo.update(
                { corporate: { id } },
                { isActive: false }
            );
        }

        return updatedCorporate;
    }


    async deleteCorporate(id: number) {
        return this.corporateRepo.softDelete(id);
    }

    async findCorporateById(id: number) {
        return this.corporateRepo.findOne({ where: { id } });
    }

}

