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
import { Country } from '@modules/countries/entities/country.entity';
import { State } from '@modules/states/entities/state.entity';
import { In } from 'typeorm';
import { standardResponse } from 'src/utils/helper/response.helper';
import { LoggedInsUserService } from '@modules/auth/logged-ins-user.service';

@Injectable()
export class CorporateService {

    constructor(
        @InjectRepository(Corporate)
        private corporateRepo: Repository<Corporate>,

        @InjectRepository(Branch)
        private branchRepo: Repository<Branch>,

        @InjectRepository(CvdMapping)
        private cvdRepo: Repository<CvdMapping>,

        @InjectRepository(Country)
        private countryRepo: Repository<Country>,
        @InjectRepository(State)
        private stateRepo: Repository<State>,

        private loggedInsUserService: LoggedInsUserService,
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
    async corporateBulkUpload(reqBody: any): Promise<any> {
        const failed: { index: number; name: string; reason: string }[] = [];
        const data = reqBody.data || [];
        const startIndex = reqBody.startIndex ?? 1;

        // 1️⃣ BASIC VALIDATION
        if (!Array.isArray(data) || data.length === 0) {
            return standardResponse(
                true,
                'No data provided for bulk upload',
                404,
                {
                    successCount: 0,
                    failedCount: 0,
                    failed: [],
                },
                null,
                'companies/corporateBulkUpload',
            );
        }

        // 2️⃣ DUPLICATE CHECK (LIKE BRANCH)
        const incomingCodes = data
            .map((item: any) => item['Corporate Code'])
            .filter((code: any) => !!code);

        const existingCorporates = incomingCodes.length
            ? await this.corporateRepo.find({
                where: { corporateCode: In(incomingCodes) },
            })
            : [];

        const existingSet = new Set(existingCorporates.map((c) => c.corporateCode));

        const uniqueData: any[] = [];
        const headerOffset = 1;

        data.forEach((item: any, index: number) => {
            const rowIndex = startIndex + index + headerOffset;
            const code = item['Corporate Code'];
            const name = item['Corporate Name'];

            if (!code || !name) {
                failed.push({
                    index: rowIndex,
                    name: name || code || 'N/A',
                    reason: 'Corporate Code or Name missing',
                });
                return;
            }

            if (existingSet.has(code)) {
                failed.push({
                    index: rowIndex,
                    name: code,
                    reason: `Corporate '${code}' already exists`,
                });
            } else {
                uniqueData.push(item);
            }
        });

        // 3️⃣ PRELOAD STATE & COUNTRY TO AVOID MANY QUERIES
        const allStates = await this.stateRepo.find();
        const allCountries = await this.countryRepo.find();

        const stateMap = new Map(
            allStates.map((s) => [s.name.trim().toLowerCase(), s.id]),
        );
        const countryMap = new Map(
            allCountries.map((c) => [c.name.trim().toLowerCase(), c.id]),
        );

        // 4️⃣ BUILD CORPORATE ENTITIES
        const toInsert: Corporate[] = [];

        for (let i = 0; i < uniqueData.length; i++) {
            const item = uniqueData[i];
            const rowIndex = startIndex + i + headerOffset;

            try {
                const corporateCode = item['Corporate Code'];
                const corporateName = item['Corporate Name'];
                const phoneNumber = item['Phone Number'];
                const adminName = item['Admin Name'];
                const email = item['Email'];
                const stateName = item['State'] || item['State Name'];
                const countryName = item['Country'] || item['Country Name'];
                const address = item['Address'];
                const isActiveRaw = item['IsActive'];

                // 🔹 Resolve state
                let stateId: number | undefined;
                if (stateName) {
                    const key = stateName.toString().trim().toLowerCase();
                    const id = stateMap.get(key);
                    if (!id) {
                        failed.push({
                            index: rowIndex,
                            name: corporateName,
                            reason: `State not found in DB: ${stateName}`,
                        });
                        continue;
                    }
                    stateId = id;
                }

                // 🔹 Resolve country
                let countryId: number | undefined;
                if (countryName) {
                    const key = countryName.toString().trim().toLowerCase();
                    const id = countryMap.get(key);
                    if (!id) {
                        failed.push({
                            index: rowIndex,
                            name: corporateName,
                            reason: `Country not found in DB: ${countryName}`,
                        });
                        continue;
                    }
                    countryId = id;
                }

                const corporate = this.corporateRepo.create({
                    corporateCode,
                    corporateName,
                    phoneNumber: phoneNumber ? String(phoneNumber) : null,
                    adminName,
                    email,
                    address,
                    isActive:
                        isActiveRaw == null
                            ? true
                            : String(isActiveRaw).toLowerCase() === 'true',
                    state: stateId ? ({ id: stateId } as any) : undefined,
                    country: countryId ? ({ id: countryId } as any) : undefined,
                });

                toInsert.push(corporate);
            } catch (err: any) {
                failed.push({
                    index: rowIndex,
                    name:
                        item['Corporate Name'] ||
                        item['Corporate Code'] ||
                        'N/A',
                    reason: err?.message || 'Internal processing error',
                });
            }
        }

        // 5️⃣ SAVE ALL VALID ONES
        if (toInsert.length) {
            await this.corporateRepo.save(toInsert);
        }

        const successCount = toInsert.length;
        const failedCount = failed.length;

        let message = 'Data inserted successfully.';
        if (successCount > 0 && failedCount > 0) message = 'Data partially inserted!';
        if (successCount === 0) message = 'Failed to insert data!';

        return standardResponse(
            true,
            message,
            200,
            {
                successCount,
                failedCount,
                failed,
            },
            null,
            'companies/corporateBulkUpload',
        );
    }





}

