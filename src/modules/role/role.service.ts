import { Inject, Injectable, NotFoundException, forwardRef } from '@nestjs/common';
import { CreateRoleDto } from './dto/request/create-role.dto';
import { Role } from './entities/role.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { UserRoleService } from '../user-role/user-role.service';
import { UserService } from '../user/user.service';
import { orderByKey, orderByValue, RoleId } from 'src/utils/app.utils';
import { User } from '@modules/user/user.entity';
import { standardResponse } from 'src/utils/helper/response.helper';
import { LoggedInsUserService } from '@modules/auth/logged-ins-user.service';

@Injectable()
export class RoleService {
    constructor(
        @InjectRepository(Role)
        private roleRepo: Repository<Role>,
        private userRoleService: UserRoleService,
        @Inject(forwardRef(() => UserService))
        private userService: UserService,
         private readonly loggedInsUserService: LoggedInsUserService,
    ) {}

    async create(createRoleDto: CreateRoleDto) {
        const role = new Role();
        role.roleName = createRoleDto.roleName;

        const { roleName } = await this.roleRepo.save(role);

        return roleName;
    }

    // async findAll(body: any, req: any): Promise<any> {
    //         const loggedUser = await this.loggedInsUserService.getCurrentUser();
    //               if (!loggedUser) return standardResponse(false, "User not logged in", 401);
    //         const existUserRole = loggedUser.userRole.id;
    //     const baseWhere = req?.QUERY_STRING?.where || {};

    //     // Ensure isActive = true is always applied
    //     const items = await this.roleRepo
    //         .createQueryBuilder('role')
    //         .where('role.isActive = :isActive', { isActive: true })
        
    //         .andWhere(baseWhere)
    //         .skip(req?.QUERY_STRING?.skip)
    //         .take(req?.QUERY_STRING?.limit)
    //         .orderBy(
    //             orderByKey({
    //                 key: req?.QUERY_STRING?.orderBy?.key,
    //                 repoAlias: 'role'
    //             }),
    //             orderByValue({ req })
    //         )
    //         .getMany();

    //     const qb = this.roleRepo
    //         .createQueryBuilder('role')
    //         .where('role.isActive = :isActive', { isActive: true })
    //         .andWhere(baseWhere)
    //         .select([]);

    //     return {
    //         items,
    //         qb
    //     };
    // }
    async findAll(body: any, req: any): Promise<any> {
  const loggedUser = await this.loggedInsUserService.getCurrentUser();
  if (!loggedUser) {
    return standardResponse(false, "User not logged in", 401);
  }

  const loggedRoleId = loggedUser.userRole.id;
  const baseWhere = req?.QUERY_STRING?.where || {};

  // ----------------------------------------
  // ROLE VISIBILITY RULES
  // ----------------------------------------
  let allowedRoleIds: number[] | null = null;

  // Super Admin → ALL roles
  if (loggedRoleId === RoleId.superadmin) {
    allowedRoleIds = null;
  }
  // Admin → Admin & Operation
  else if (loggedRoleId === RoleId.admin) {
    allowedRoleIds = [RoleId.admin, RoleId.operation];
  }
  // Corporate Admin / Corporate Staff → Corporate roles only
  else if (loggedRoleId === RoleId.corporateAdmin || loggedRoleId === RoleId.corporateStaff) {
    allowedRoleIds = [RoleId.corporateAdmin, RoleId.corporateStaff];
  }
console.log("allowedRoleIds---", allowedRoleIds);
  // ----------------------------------------
  // MAIN QUERY
  // ----------------------------------------
  const qb = this.roleRepo
    .createQueryBuilder('role')
    .where('role.isActive = :isActive', { isActive: true })
    .andWhere(baseWhere);

  // Apply role restriction ONLY when required
  if (allowedRoleIds) {
    qb.andWhere('role.id IN (:...allowedRoleIds)', { allowedRoleIds });
  }

  const items = await qb
    .skip(req?.QUERY_STRING?.skip)
    .take(req?.QUERY_STRING?.limit)
    .orderBy(
      orderByKey({
        key: req?.QUERY_STRING?.orderBy?.key,
        repoAlias: 'role',
      }),
      orderByValue({ req }),
    )
    .getMany();
console.log("items---", items);
  return {
    items,
    qb,
  };
}


    async findOne(id: number) {
        return await this.roleRepo.findOneBy({ id });
    }

    async findOneByName(roleName: string): Promise<Role> {
        return await this.roleRepo.findOneBy({ roleName });
    }

        async findOneById(id: number): Promise<Role> {
        return await this.roleRepo.findOneBy({ id });
    }

    async findAndUpdateRole(roleId: number, updates: any): Promise<any> {
        let dbRole: Role = await this.findOne(roleId);
        if (!dbRole) throw new NotFoundException(['Role not found']);

        const { id, roleName, ...rest } = updates;

        dbRole = {
            ...dbRole,
            ...rest
        };

        return await this.roleRepo.save(dbRole);
    }

    async removeByName(roleName: string): Promise<any> {
        return await this.roleRepo.delete({ roleName });
    }


    async getRolesForRoleNames(roleNames: string[]): Promise<Role[]> {
        return await this.roleRepo
            .createQueryBuilder('role')
            .where(`role.roleName IN (:...roleNames)`, { roleNames })
            .getMany();
    }
}
