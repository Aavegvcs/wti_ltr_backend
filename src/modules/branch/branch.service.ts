import {
    forwardRef,
    Inject,
    Injectable,
    Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Branch } from './entities/branch.entity';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { BranchModels, Designation } from 'src/utils/app.utils';
import { orderByKey, orderByValue } from 'src/utils/app.utils';
import 'moment-timezone';
import { User } from '@modules/user/user.entity';
import { UserService } from '@modules/user/user.service';

interface CreateBranchDtoWithRowNumber extends CreateBranchDto {
    originalRowNumber: number;
}

export interface IChurn {
    particulars: string;
    activeClientsAvg: number;
    target: number;
    achieved: number;
}

@Injectable()
export class BranchService {
    private readonly logger = new Logger(BranchService.name);

    constructor(
        @InjectRepository(Branch)
        private readonly branchRepository: Repository<Branch>,
        @InjectRepository(User)
        private readonly employeeRepository: Repository<User>,
        @Inject(forwardRef(() => UserService))
        private readonly userService: UserService,
        private readonly dataSource: DataSource,
    ) { }


    async findAll(req: any): Promise<any> {
        Logger.log('QUERY_String', req?.QUERY_STRING);
        // Single query for data and counts
        const branches = await this.branchRepository
            .createQueryBuilder('branch')
            .leftJoinAndSelect('branch.controlBranch', 'controlBranch')
            .leftJoinAndSelect('branch.regionalManager', 'regionalManager')
            .where('branch.deletedAt IS NULL')
            // .andWhere('branch.model = :model', { model: BranchModels.BRANCH })
            .andWhere(req?.QUERY_STRING?.where || '1=1')
            .orderBy(orderByKey({ key: req?.QUERY_STRING?.orderBy?.key, repoAlias: 'branch' }), orderByValue({ req }))
            .offset(req?.QUERY_STRING?.skip || 0)
            .limit(req?.QUERY_STRING?.limit || 10)
            .getMany();

        // Transform results
        const items = branches.map((branch: any) => ({
            id: branch.id,
            name: branch.name,
            city: branch.city,
            email: branch.email,
            phone: branch.phone,
            model: branch.model,
            controlBranch: branch.controlBranch ? { id: branch.controlBranch.id, name: branch.controlBranch.name } : null,
            regionalManager: branch.regionalManager ? { id: branch.regionalManager.id, name: branch.regionalManager.name } : null,
            active: branch.active,
            createdAt: branch.createdAt,
            updatedAt: branch.updatedAt,
            deletedAt: branch.deletedAt,
        }));

        // Create query builder for additional queries
        const qb = this.branchRepository
            .createQueryBuilder('branch')
            // .where('branch.model = :model', { model: BranchModels.BRANCH })
            .andWhere('branch.deletedAt IS NULL')
            .andWhere(req.where || '1=1'); // Safe default for where clause

        return { qb, items };
    }

    async findById(id: string, manager?: EntityManager): Promise<Branch> {
        const repo = manager ? manager.getRepository(Branch) : this.branchRepository;
        const branch = await repo.findOne({
            where: { id },
            relations: {
                state: true,
            }
        });
        if (!branch) throw new Error(`Branch with ID ${id} not found`);
        return branch;
    }

    // async update(id: string, updateBranchDto: UpdateBranchDto): Promise<Branch> {
    //     return this.branchRepository.manager.transaction(async (transactionalEntityManager) => {
    //         const branch = await this.findById(id, transactionalEntityManager);

    //         Object.assign(branch, {
    //             ...updateBranchDto,
    //             activationDate: updateBranchDto.activationDate,
    //             state: updateBranchDto.stateId ? { id: updateBranchDto.stateId } : branch.state,
    //             regionalManager: updateBranchDto.regionalManagerId
    //                 ? { id: updateBranchDto.regionalManagerId }
    //                 : branch.regionalManager,
    //             controlBranch: updateBranchDto.controlBranchId
    //                 ? { id: updateBranchDto.controlBranchId }
    //                 : branch.controlBranch,
    //         });

    //         return await transactionalEntityManager.save(Branch, branch);
    //     });
    // }

    async toggleStatus(id: string): Promise<Branch> {
        const branch = await this.branchRepository.findOne({ where: { id } });

        if (!branch) {
            throw new Error(`Branch with id ${id} not found`);
        }
        Logger.log('status', branch.isActive);
        branch.isActive = !branch.isActive;
        Logger.log('status 2', branch.isActive);

        return this.branchRepository.save(branch);
    }

    // async remove(id: string): Promise<void> {
    //     await this.branchRepository.manager.transaction(async (transactionalEntityManager) => {
    //         const branch = await this.findById(id, transactionalEntityManager);

    //         // await transactionalEntityManager.softDelete(BranchRevenue, { branchId: id });
    //         await transactionalEntityManager.softDelete(Branch, id);
    //     });
    // }


    // async resolveBranchIds(employee: Employee): Promise<string[]> {

    //     switch (employee.designation) {
    //         case Designation.regionalManager:
    //             const regionalBranches = await this.dataSource.getRepository(Branch).find({
    //                 where: { regionalManager: { id: employee.id }, model: BranchModels.BRANCH },
    //                 select: ['id'],
    //             });
    //             return regionalBranches.map(branch => branch.id);
    //         case Designation.branchManager:
    //             const subBranches = await this.dataSource.getRepository(Branch).find({
    //                 where: { id: employee.branch.id },
    //                 relations: ['subBranches'],
    //             });

    //             const subBranchIds = subBranches.flatMap(branch => branch.subBranches.map(sub => sub.id));
    //             return subBranchIds;

    //         case Designation.superAdmin:
    //             const allBranches = await this.dataSource.getRepository(Branch).find({
    //                 where: { model: BranchModels.BRANCH },
    //                 select: ['id'],
    //             });
    //             return allBranches.map(branch => branch.id);
    //         default:
    //             this.logger.warn(`Unsupported designation: ${employee.designation}`);
    //             return [];
    //     }
    // }

    async getAllBranches(): Promise<any> {
        try {
            return await this.branchRepository.find({
                select: ['id'],
                where: {
                    // model: In([BranchModels.BRANCH, BranchModels.FRANCHISE])
                }
            })

        } catch (error) {
            this.logger.error(`Failed to fetch subbranch revenue: ${error.message}`);
            throw error;
        }
    }


     async getBranch(): Promise<any> {
        try {

            const query = 'CALL get_branch()'

            const result = await this.branchRepository.query(query);
            return {
                status:'success',
                message: 'success fully data fetch',
                result:result[0]

            }

        } catch (error) {
            this.logger.error(`Failed to fetch subbranch revenue: ${error.message}`);
            throw error;
        }
    }
}
