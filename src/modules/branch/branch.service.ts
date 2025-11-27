// import {
//     forwardRef,
//     Inject,
//     Injectable,
//     Logger,
// } from '@nestjs/common';
// import { InjectRepository } from '@nestjs/typeorm';
// import { DataSource, EntityManager, Repository } from 'typeorm';
// import { Branch } from './entities/branch.entity';
// import { CreateBranchDto } from './dto/create-branch.dto';
// import { UpdateBranchDto } from './dto/update-branch.dto';
// import { BranchModels, Designation } from 'src/utils/app.utils';
// import { orderByKey, orderByValue } from 'src/utils/app.utils';
// import 'moment-timezone';
// import { User } from '@modules/user/user.entity';
// import { UserService } from '@modules/user/user.service';

// interface CreateBranchDtoWithRowNumber extends CreateBranchDto {
//     originalRowNumber: number;
// }

// export interface IChurn {
//     particulars: string;
//     activeClientsAvg: number;
//     target: number;
//     achieved: number;
// }

// @Injectable()
// export class BranchService {
//     private readonly logger = new Logger(BranchService.name);

//     constructor(
//         @InjectRepository(Branch)
//         private readonly branchRepository: Repository<Branch>,
//         @InjectRepository(User)
//         private readonly employeeRepository: Repository<User>,
//         @Inject(forwardRef(() => UserService))
//         private readonly userService: UserService,
//         private readonly dataSource: DataSource,
//     ) { }


//     async findAll(req: any): Promise<any> {
//         Logger.log('QUERY_String', req?.QUERY_STRING);
//         // Single query for data and counts
//         const branches = await this.branchRepository
//             .createQueryBuilder('branch')
//             .leftJoinAndSelect('branch.controlBranch', 'controlBranch')
//             .leftJoinAndSelect('branch.regionalManager', 'regionalManager')
//             .where('branch.deletedAt IS NULL')
//             // .andWhere('branch.model = :model', { model: BranchModels.BRANCH })
//             .andWhere(req?.QUERY_STRING?.where || '1=1')
//             .orderBy(orderByKey({ key: req?.QUERY_STRING?.orderBy?.key, repoAlias: 'branch' }), orderByValue({ req }))
//             .offset(req?.QUERY_STRING?.skip || 0)
//             .limit(req?.QUERY_STRING?.limit || 10)
//             .getMany();

//         // Transform results
//         const items = branches.map((branch: any) => ({
//             id: branch.id,
//             name: branch.name,
//             city: branch.city,
//             email: branch.email,
//             phone: branch.phone,
//             model: branch.model,
//             controlBranch: branch.controlBranch ? { id: branch.controlBranch.id, name: branch.controlBranch.name } : null,
//             regionalManager: branch.regionalManager ? { id: branch.regionalManager.id, name: branch.regionalManager.name } : null,
//             active: branch.active,
//             createdAt: branch.createdAt,
//             updatedAt: branch.updatedAt,
//             deletedAt: branch.deletedAt,
//         }));

//         // Create query builder for additional queries
//         const qb = this.branchRepository
//             .createQueryBuilder('branch')
//             // .where('branch.model = :model', { model: BranchModels.BRANCH })
//             .andWhere('branch.deletedAt IS NULL')
//             .andWhere(req.where || '1=1'); // Safe default for where clause

//         return { qb, items };
//     }

//     async findById(id: string, manager?: EntityManager): Promise<Branch> {
//         const repo = manager ? manager.getRepository(Branch) : this.branchRepository;
//         const branch = await repo.findOne({
//             where: { id },
//             relations: {
//                 controlBranch: true,
//                 regionalManager: true,
//                 state: true,
//             }
//         });
//         if (!branch) throw new Error(`Branch with ID ${id} not found`);
//         return branch;
//     }

//     async update(id: string, updateBranchDto: UpdateBranchDto): Promise<Branch> {
//         return this.branchRepository.manager.transaction(async (transactionalEntityManager) => {
//             const branch = await this.findById(id, transactionalEntityManager);

//             Object.assign(branch, {
//                 ...updateBranchDto,
//                 activationDate: updateBranchDto.activationDate,
//                 state: updateBranchDto.stateId ? { id: updateBranchDto.stateId } : branch.state,
//                 regionalManager: updateBranchDto.regionalManagerId
//                     ? { id: updateBranchDto.regionalManagerId }
//                     : branch.regionalManager,
//                 controlBranch: updateBranchDto.controlBranchId
//                     ? { id: updateBranchDto.controlBranchId }
//                     : branch.controlBranch,
//             });

//             return await transactionalEntityManager.save(Branch, branch);
//         });
//     }

//     async toggleStatus(id: string): Promise<Branch> {
//         const branch = await this.branchRepository.findOne({ where: { id } });

//         if (!branch) {
//             throw new Error(`Branch with id ${id} not found`);
//         }
//         Logger.log('status', branch.isActive);
//         branch.isActive = !branch.isActive;
//         Logger.log('status 2', branch.isActive);

//         return this.branchRepository.save(branch);
//     }

//     async remove(id: string): Promise<void> {
//         await this.branchRepository.manager.transaction(async (transactionalEntityManager) => {
//             const branch = await this.findById(id, transactionalEntityManager);

//             // await transactionalEntityManager.softDelete(BranchRevenue, { branchId: id });
//             await transactionalEntityManager.softDelete(Branch, id);
//         });
//     }


//     async getAllBranches(): Promise<any> {
//         try {
//             return await this.branchRepository.find({
//                 select: ['id'],
//                 where: {
//                     // model: In([BranchModels.BRANCH, BranchModels.FRANCHISE])
//                 }
//             })

//         } catch (error) {
//             this.logger.error(`Failed to fetch subbranch revenue: ${error.message}`);
//             throw error;
//         }
//     }


//      async getBranch(): Promise<any> {
//         try {

//             const query = 'CALL get_branch()'

//             const result = await this.branchRepository.query(query);
//             return {
//                 status:'success',
//                 message: 'success fully data fetch',
//                 result:result[0]

//             }

//         } catch (error) {
//             this.logger.error(`Failed to fetch subbranch revenue: ${error.message}`);
//             throw error;
//         }
//     }
// }
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager, In } from 'typeorm';
import { Branch } from './entities/branch.entity';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { User } from '@modules/user/user.entity';

@Injectable()
export class BranchService {
    private readonly logger = new Logger(BranchService.name);

    constructor(
        @InjectRepository(Branch)
        private readonly branchRepository: Repository<Branch>,
        private readonly dataSource: DataSource,
    ) { }

    /**
     * findAll: returns flattened items and a qb usable for counts/filter by caller.
     * Expects req.QUERY_STRING with 'where', 'orderBy', 'skip', 'limit'
     */
    async findAll(req: any): Promise<any> {
        const q = req?.QUERY_STRING ?? {};
        const whereClause = q.where ?? '1=1';
        const skip = Number(q.skip ?? 0);
        const limit = Number(q.limit ?? 10);
        const orderByKey = (q.orderBy?.key) ? q.orderBy.key : 'createdAt';
        const orderByDir = (q.orderBy?.dir) ? q.orderBy.dir : 'DESC';

        const qb = this.branchRepository
            .createQueryBuilder('branch')
            .leftJoinAndSelect('branch.corporate', 'corporate')
            .leftJoinAndSelect('branch.state', 'state')
            .leftJoinAndSelect('branch.controlBranch', 'controlBranch')
            .leftJoinAndSelect('branch.regionalManager', 'regionalManager')
            .where('branch.deletedAt IS NULL')
            .andWhere(whereClause)
            .orderBy(`branch.${orderByKey}`, orderByDir as 'ASC' | 'DESC')
            .offset(skip)
            .limit(limit);

        const branches = await qb.getMany();

        const items = branches.map((b) => ({
            id: b.id,
            branchCode: b.branchCode,
            name: b.name,

            corporateId: b.corporate?.id ?? null,
            corporateName: b.corporate?.corporateName ?? null,

            stateId: b.state?.id ?? null,
            stateName: (b.state as any)?.stateName ?? (b.state as any)?.name ?? null,

            city: b.city ?? null,
            pincode: b.pincode ?? null,
            address: b.address ?? null,

            email: b.email ?? null,
            phone: b.phone ?? null,
            panNumber: b.panNumber ?? null,
            contactPerson: b.contactPerson ?? null,

            activationDate: b.activationDate ?? null,
            segments: b.segments ?? [],

            regionalManagerId: b.regionalManager?.id ?? null,
            regionalManagerName: (b.regionalManager as any)?.name ?? null,

            controlBranchId: b.controlBranch?.id ?? null,
            controlBranchName: b.controlBranch?.name ?? null,

            isActive: b.isActive,
            createdAt: b.createdAt,
            updatedAt: b.updatedAt,
        }));

        // total count (for pagination)
        const total = await this.branchRepository
            .createQueryBuilder('branch')
            .where('branch.deletedAt IS NULL')
            .andWhere(whereClause)
            .getCount();

        return {
            status: true,
            message: 'success',
            items,
            total,
            page: Math.floor(skip / limit) + 1,
            limit,
        };
    }
    async findById(id: string): Promise<Branch | null> {
        return this.branchRepository.findOne({
            where: { id },
            relations: ['corporate', 'state', 'controlBranch', 'regionalManager'],
        });
    }

    // fetch single branch and return flattened object
    async findByIdFlattened(id: string): Promise<any> {
        const b = await this.branchRepository.findOne({
            where: { id },
            relations: ['corporate', 'state', 'controlBranch', 'regionalManager'],
        });
        if (!b) throw new Error('Branch not found');

        return {
            status: true,
            message: 'success',
            data: {
                id: b.id,
                branchCode: b.branchCode,
                name: b.name,
                corporateId: b.corporate?.id ?? null,
                corporateName: b.corporate?.corporateName ?? null,
                stateId: b.state?.id ?? null,
                stateName: (b.state as any)?.stateName ?? (b.state as any)?.name ?? null,
                city: b.city,
                pincode: b.pincode,
                address: b.address,
                email: b.email,
                phone: b.phone,
                panNumber: b.panNumber,
                contactPerson: b.contactPerson,
                activationDate: b.activationDate,
                regionalManagerId: b.regionalManager?.id ?? null,
                regionalManagerName: (b.regionalManager as any)?.name ?? null,
                controlBranchId: b.controlBranch?.id ?? null,
                controlBranchName: b.controlBranch?.name ?? null,
                isActive: b.isActive,
                createdAt: b.createdAt,
                updatedAt: b.updatedAt,
            },
        };
    }

    // create branch (accepts flattened DTO)
    async create(dto: CreateBranchDto): Promise<any> {
        return this.branchRepository.manager.transaction(async (em: EntityManager) => {
            const branch = em.create(Branch, {
                id: dto.id ?? dto.branchCode,
                branchCode: dto.branchCode,
                name: dto.name,

                corporate: dto.corporateId ? { id: Number(dto.corporateId) } : null,
                state: dto.stateId ? { id: Number(dto.stateId) } : null,
                city: dto.city,
                pincode: dto.pincode,
                isActive: dto.isActive ?? true,
                address: dto.address,
                segments: dto.segments ?? [],
                email: dto.email,
                phone: dto.phone,
                panNumber: dto.panNumber,
                activationDate: dto.activationDate,
                contactPerson: dto.contactPerson,

                regionalManager: dto.regionalManagerId
                    ? ({ id: Number(dto.regionalManagerId) } as any)
                    : null,

                controlBranch: dto.controlBranchId
                    ? ({ id: Number(dto.controlBranchId) } as any)
                    : null,
            });

            const saved = await em.save(Branch, branch);
            return { status: true, message: 'success', data: { id: saved.id } };
        });
    }


    async update(id: string, dto: UpdateBranchDto): Promise<any> {
        return this.branchRepository.manager.transaction(async (em: EntityManager) => {
            const repo = em.getRepository(Branch);
            const branch = await repo.findOne({ where: { id } });
            if (!branch) throw new Error('Branch not found');

            if (dto.branchCode !== undefined) branch.branchCode = dto.branchCode;
            if (dto.name !== undefined) branch.name = dto.name;
            if (dto.corporateId !== undefined) (branch as any).corporate = dto.corporateId ? { id: dto.corporateId } : null;
            if (dto.stateId !== undefined) (branch as any).state = dto.stateId ? { id: dto.stateId } : null;
            if (dto.city !== undefined) branch.city = dto.city;
            if (dto.pincode !== undefined) branch.pincode = dto.pincode;
            if (dto.address !== undefined) branch.address = dto.address;
            if (dto.email !== undefined) branch.email = dto.email;
            if (dto.phone !== undefined) branch.phone = dto.phone;
            if (dto.panNumber !== undefined) branch.panNumber = dto.panNumber;
            if (dto.activationDate !== undefined) branch.activationDate = dto.activationDate as any;
            if (dto.contactPerson !== undefined) branch.contactPerson = dto.contactPerson;
            if (dto.regionalManagerId !== undefined) (branch as any).regionalManager = dto.regionalManagerId ? ({ id: dto.regionalManagerId } as any) : null;
            if (dto.controlBranchId !== undefined) (branch as any).controlBranch = dto.controlBranchId ? ({ id: dto.controlBranchId } as any) : null;
            if (dto.isActive !== undefined) branch.isActive = dto.isActive;

            const saved = await em.save(Branch, branch);
            return { status: true, message: 'success', data: { id: saved.id } };
        });
    }

    async toggleStatus(id: string): Promise<any> {
        const branch = await this.branchRepository.findOne({ where: { id } });
        if (!branch) throw new Error('Branch not found');
        branch.isActive = !branch.isActive;
        const saved = await this.branchRepository.save(branch);
        return { status: true, message: 'success', data: { id: saved.id, isActive: saved.isActive } };
    }

    async remove(id: string): Promise<any> {
        await this.branchRepository.softDelete(id);
        return { status: true, message: 'deleted' };
    }

    async getAllBranches(): Promise<any> {
        const result = await this.branchRepository.find({
            select: ['id', 'name'],
            where: { /* model filtering if needed */ },
        });
        return { status: true, message: 'success', data: result };
    }

    // Bulk upload: expects { data: any[], startIndex?: number }
    async branchBulkUpload(body: any): Promise<any> {
        const arr: any[] = body.data ?? body.batch ?? [];
        const failed: any[] = [];
        for (let i = 0; i < arr.length; i++) {
            const row = arr[i];
            try {
                // basic validation - change as per requirement
                if (!row.branchCode || !row.name || !row.corporateId) {
                    failed.push({ index: (body.startIndex ?? 0) + i + 1, reason: 'Missing required fields' });
                    continue;
                }
                // upsert behaviour: if exists update else create
                const exists = await this.branchRepository.findOne({ where: { id: row.id ?? row.branchCode } });
                if (exists) {
                    exists.branchCode = row.branchCode ?? exists.branchCode;
                    exists.name = row.name ?? exists.name;
                    exists.corporate = row.corporateId ? ({ id: row.corporateId } as any) : exists.corporate;
                    if (row.stateId) (exists as any).state = { id: row.stateId };
                    exists.city = row.city ?? exists.city;
                    exists.pincode = row.pincode ?? exists.pincode;
                    exists.address = row.address ?? exists.address;
                    exists.email = row.email ?? exists.email;
                    exists.phone = row.phone ?? exists.phone;
                    await this.branchRepository.save(exists);
                } else {
                    const branch = this.branchRepository.create({
                        id: row.id ?? row.branchCode,
                        branchCode: row.branchCode,
                        name: row.name,
                        corporate: row.corporateId ? ({ id: row.corporateId } as any) : null,
                        state: row.stateId ? ({ id: row.stateId } as any) : null,
                        city: row.city,
                        pincode: row.pincode,
                        address: row.address,
                        email: row.email,
                        phone: row.phone,
                        panNumber: row.panNumber,
                        contactPerson: row.contactPerson,
                        isActive: row.isActive === undefined ? true : !!row.isActive,
                    });
                    await this.branchRepository.save(branch);
                }
            } catch (err) {
                failed.push({ index: (body.startIndex ?? 0) + i + 1, reason: err.message ?? 'Server error' });
            }
        }

        return {
            status: true,
            message: 'bulk processed',
            result: { failed, processed: arr.length - failed.length },
        };
    }
}
