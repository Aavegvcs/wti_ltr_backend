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
// @Injectable()
// export class CorporateService {
//     constructor(
//         private authService: AuthService,
//         private logService: LogService,
//         // private addressService: AddressService,
//         private mediaService: MediaService,
//         @InjectRepository(Corporate)
//         private corporateRepo: Repository<Corporate>,
//         @InjectRepository(User)
//         private userRepo: Repository<User>,
//         @Inject(forwardRef(() => UserService))
//         private userService: UserService
//     ) { }



//     async companyList(req: any): Promise<any> {
//         const companies = await this.corporateRepo
//             .createQueryBuilder('company')
//             .leftJoinAndSelect('company.state', 'state')
//             // .leftJoinAndSelect('company.city', 'city')
//             .leftJoinAndSelect('company.country', 'country')
//             .where(req?.QUERY_STRING?.where)
//             .skip(req?.QUERY_STRING?.skip)
//             .take(req?.QUERY_STRING?.limit)
//             .orderBy(
//                 orderByKey({
//                     key: req?.QUERY_STRING?.orderBy?.key,
//                     repoAlias: 'company'
//                 }),
//                 orderByValue({ req })
//             )
//             .getMany();

//         const qb = this.corporateRepo.createQueryBuilder('company').where(req?.QUERY_STRING?.where).select([]);

//         let res: any[] = [];

//         for (const company of companies) {
//             let clients = await this.userRepo
//                 .createQueryBuilder('user')
//                 .where('user.corporate_id = :corporateId AND user.userRole = :userRole', {
//                     corporateId: company.id,
//                     userRole: 'client'  // or whatever role identifies client
//                 })

//                 .getMany();

//             let staff = await this.userRepo
//                 .createQueryBuilder('user')
//                 .where('user.corporate_id = :corporateId AND user.userRole = :userRole', {
//                     corporateId: company.id,
//                     userRole: 'staff'
//                 })
//                 .getMany();

//             let obj = {
//                 ...company,
//                 client: {
//                     count: clients?.length,
//                     records: [...clients]
//                 },

//                 staff: {
//                     count: staff?.length,
//                     records: [...staff]
//                 }
//             };
//             res.push(obj);
//         }

//         return { res, qb };
//     }

//     async findOneById(id: number) {
//         return await this.corporateRepo
//             .createQueryBuilder('company')
//             .leftJoinAndSelect('company.state', 'state')
//             // .leftJoinAndSelect('company.city', 'city')
//             .leftJoinAndSelect('company.country', 'country')
//             .where('company.id = :id', { id })
//             .getOne();
//     }

//     async findCorporateById(id: number) {
//         return await this.corporateRepo.findOneBy({ id });
//     }

//      async getAllCompanies() {
//         return await this.corporateRepo.find();
//     }
//     // async updateCompany(updateCompanyDto: CompanyUpdateDto, req: any) {
//     //     const loggedInUser = req?.user?.email ? await this.userRepo.findOneBy({ email: req?.user?.email }) : null;

//     //     let company: Company = await this.findOne(+updateCompanyDto.id);
//     //     if (!company) throw new NotFoundException(['Company not found']);

//     //     fillOrReplaceObject(company, updateCompanyDto);

//     //     if (loggedInUser) {
//     //         company.updatedBy = loggedInUser.id;
//     //     }

//     //     try {
//     //         const companyData = await this.corporateRepo.save(company);

//     //         const logsData = await this.logService.saveLogByRef(companyData, Features.company, Action.update, req);

//     //         if (!logsData) throw new HttpException('could not save logs..', HttpStatus.INTERNAL_SERVER_ERROR);
//     //     } catch (error) {
//     //         if (error.code === '23505') {
//     //             throw new ConflictException(['Company Name already exists']);
//     //         }
//     //         throw error;
//     //     }
//     // }

//     // async deleteCompany(req: any) {
//     //     const loggedInUser = req?.user?.email ? await this.userRepo.findOneBy({ email: req?.user?.email }) : null;

//     //     const company = req.body.id;
//     //     await this.addressService.deleteAddressOfRef(company, 'company');

//     //     // Using custom query to Soft-Delete records based on refid and refTypeid

//     //     await this.corporateRepo
//     //         .createQueryBuilder()
//     //         .update(Company)
//     //         .set({ deletedAt: new Date(), updatedBy: loggedInUser?.id ?? null }) // Assuming userId is the value to update in updatedBy
//     //         .where('id = :company', { company })
//     //         .execute();
//     // }

//     async findOne(id: number): Promise<Corporate> {
//         return await this.corporateRepo.findOneBy({ id });
//     }
// }
// @Injectable()
// export class CorporateService {
//     constructor(
//         @InjectRepository(Corporate)
//         private corporateRepo: Repository<Corporate>,
//     ) { }
//     async createCorporate(dto: CreateCorporateDto) {
//         const { country, state, ...rest } = dto;

//         const corporate = this.corporateRepo.create({
//             ...rest,
//             country: country ? { id: country } : undefined,
//             state: state ? { id: state } : undefined,
//         });

//         return await this.corporateRepo.save(corporate);
//     }
//     async updateCorporate(dto: UpdateCorporateDto) {
//         const { id, country, state, ...rest } = dto;

//         await this.corporateRepo.update(id, {
//             ...rest,
//             country: country ? { id: country } : undefined,
//             state: state ? { id: state } : undefined,
//         });

//         return this.findCorporateById(id);
//     }

//     async deleteCorporate(id: number) {
//         return this.corporateRepo.softDelete(id);
//     }

//     async findCorporateById(id: number) {
//         return this.corporateRepo.findOne({ where: { id } });
//     }
// }
@Injectable()
export class CorporateService {
    constructor(
        @InjectRepository(Corporate)
        private corporateRepo: Repository<Corporate>,
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

        await this.corporateRepo.update(id, {
            ...rest,
            country: country ? { id: country } : undefined,
            state: state ? { id: state } : undefined,
        });

        return this.findCorporateById(id);
    }

    async deleteCorporate(id: number) {
        return this.corporateRepo.softDelete(id);
    }

    async findCorporateById(id: number) {
        return this.corporateRepo.findOne({ where: { id } });
    }

}


// import { Injectable } from '@nestjs/common';
// import { InjectRepository } from '@nestjs/typeorm';
// import { Repository } from 'typeorm';
// import { Corporate } from './entities/corporate.entity';
// import { CreateCorporateDto } from './dto/company-create.dto';
// import { UpdateCorporateDto } from './dto/update-company.dto';
// import { standardResponse } from 'src/utils/helper/response.helper';

// @Injectable()
// export class CorporateService {
//     constructor(
//         @InjectRepository(Corporate)
//         private readonly corporateRepo: Repository<Corporate>,
//     ) { }

//     // ------------------------------------------------------
//     // LIST COMPANIES
//     // ------------------------------------------------------
//     async companyList(req: any): Promise<any> {
//         try {
//             const query = this.corporateRepo
//                 .createQueryBuilder('company')
//                 .leftJoinAndSelect('company.state', 'state')
//                 .leftJoinAndSelect('company.country', 'country')
//                 .orderBy('company.id', 'DESC');

//             if (req?.QUERY_STRING?.where)
//                 query.where(req.QUERY_STRING.where);

//             if (req?.QUERY_STRING?.skip)
//                 query.skip(req.QUERY_STRING.skip);

//             if (req?.QUERY_STRING?.limit)
//                 query.take(req.QUERY_STRING.limit);

//             const [items, total] = await query.getManyAndCount();

//             return standardResponse(
//                 true,
//                 "Company list fetched successfully",
//                 200,
//                 {
//                     items,
//                     pagination: {
//                         total,
//                         page: req?.QUERY_STRING?.page || 1,
//                         limit: req?.QUERY_STRING?.limit || items.length,
//                     }
//                 },
//                 null,
//                 'corporate/companyList'
//             );

//         } catch (error) {
//             return standardResponse(false, error.message, 500, null, null, 'corporate/companyList');
//         }
//     }

//     // ------------------------------------------------------
//     // CREATE
//     // ------------------------------------------------------
//     async createCorporate(dto: CreateCorporateDto) {
//         try {
//             const { country, state, ...rest } = dto;

//             const corporate = this.corporateRepo.create({
//                 ...rest,
//                 country: country ? { id: country } : undefined,
//                 state: state ? { id: state } : undefined,
//             });

//             const saved = await this.corporateRepo.save(corporate);

//             return standardResponse(
//                 true,
//                 "Corporate created successfully",
//                 201,
//                 saved,
//                 null,
//                 'corporate/createCorporate'
//             );
//         } catch (error) {
//             return standardResponse(false, error.message, 500, null, null, 'corporate/createCorporate');
//         }
//     }

//     // ------------------------------------------------------
//     // UPDATE
//     // ------------------------------------------------------
//     async updateCorporate(dto: UpdateCorporateDto) {
//         try {
//             const { id, country, state, ...rest } = dto;

//             const existing = await this.corporateRepo.findOne({ where: { id } });
//             if (!existing) {
//                 return standardResponse(false, "Corporate not found", 404, null, null, 'corporate/updateCorporate');
//             }

//             await this.corporateRepo.update(id, {
//                 ...rest,
//                 country: country ? { id: country } : undefined,
//                 state: state ? { id: state } : undefined,
//             });

//             const updated = await this.corporateRepo.findOne({ where: { id } });

//             return standardResponse(
//                 true,
//                 "Corporate updated successfully",
//                 200,
//                 updated,
//                 null,
//                 'corporate/updateCorporate'
//             );

//         } catch (error) {
//             return standardResponse(false, error.message, 500, null, null, 'corporate/updateCorporate');
//         }
//     }

//     // ------------------------------------------------------
//     // SOFT DELETE
//     // ------------------------------------------------------
//     async deleteCorporate(id: number) {
//         try {
//             const existing = await this.corporateRepo.findOne({ where: { id } });
//             if (!existing) {
//                 return standardResponse(false, "Corporate not found", 404, null, null, 'corporate/deleteCorporate');
//             }

//             await this.corporateRepo.softDelete(id);

//             return standardResponse(
//                 true,
//                 "Corporate deleted successfully",
//                 200,
//                 null,
//                 null,
//                 'corporate/deleteCorporate'
//             );

//         } catch (error) {
//             return standardResponse(false, error.message, 500, null, null, 'corporate/deleteCorporate');
//         }
//     }

//     // ------------------------------------------------------
//     // FIND BY ID
//     // ------------------------------------------------------
//     async findCorporateById(id: number) {
//         try {
//             const corporate = await this.corporateRepo.findOne({ where: { id } });

//             if (!corporate)
//                 return standardResponse(false, "Corporate not found", 404, null, null, 'corporate/findById');

//             return standardResponse(true, "Corporate fetched", 200, corporate, null, 'corporate/findById');

//         } catch (error) {
//             return standardResponse(false, error.message, 500, null, null, 'corporate/findById');
//         }
//     }
// }
