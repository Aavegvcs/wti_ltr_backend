import {
    BadRequestException,
    ConflictException,
    Inject,
    Injectable,
    InternalServerErrorException,
    NotAcceptableException,
    NotFoundException,
    forwardRef
} from '@nestjs/common';
import { User } from './user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, In, Repository } from 'typeorm';
import { compare } from 'bcryptjs';
import { NotificationService } from '../notification/notification.service';
import {
    RoleType,
    Roles,
    fillOrReplaceObject,
    generateOTP,
    orderByKey,
    orderByValue,
    USER_STATUS,
    addFilters,
    generateRandomPassword,
    createPasswordHash,
    roleIds,
    makeUserCode
} from 'src/utils/app.utils';
import { AuthService } from '../auth/auth.service';
import { MediaService } from '../media/media.service';
import { ReferenceService } from '../reference/reference.service';
import { UserCreateDto } from './dto/request/user-create-dto';
import { UserRoleService } from '../user-role/user-role.service';
import { RoleService } from '../role/role.service';
import { UserEditDto } from './dto/request/user-edit-dto';
import { CorporateService } from '../company/corporate.service';
import { TokenService } from '../auth/tokens.service';
import { FilterRequest, UsersListOfTypeDto } from './dto/request/usersListOfSingleType-dto';
import { ClientStatusDto } from './dto/request/client-status.dto';
import { Role } from '../role/entities/role.entity';
import { TestListDto } from './dto/request/testList.dto';
import { getLogger } from 'src/utils/winstonLogger';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Branch } from '@modules/branch/entities/branch.entity';
import { EmailService } from '@modules/email/email.service';
import { passwordForInsuranceLogin } from 'src/utils/email-templates/otp/login';
import { Corporate } from '@modules/company/entities/corporate.entity';
import { BranchService } from '@modules/branch/branch.service';

@Injectable()
export class UserService {
    constructor(
        private authService: AuthService,
        private notifyService: NotificationService,
        @Inject(forwardRef(() => MediaService))
        private mediaService: MediaService,
        @InjectRepository(User)
        private userRepository: Repository<User>,
        private userRoleService: UserRoleService,
        private roleService: RoleService,
        private corporateService: CorporateService,
        private emailService: EmailService,
        @Inject(forwardRef(() => BranchService))
        private readonly branchService: BranchService,
        @InjectRepository(Role)
        private roleRepository: Repository<Role>
    ) {}

    async getActiveUsersByCompany(companyId: number): Promise<any> {
        return await this.userRepository
            .createQueryBuilder('user')
            .leftJoinAndSelect('user.company', 'company') // Assuming 'company' is the relation property in the User entity
            .where(
                `user.company = :company
                AND user.status = 'active'`,
                { company: companyId }
            )
            .orderBy('user.id', 'DESC') // Assuming 'id' is the primary key, replace it with your actual primary key column
            .getMany();
    }

    async findOneByEmail(email: string): Promise<User> {
        // return await this.userRepository.findOneBy({ email });
        return await this.userRepository
            .createQueryBuilder('user')
            .leftJoinAndSelect('user.company', 'company')
            .leftJoinAndSelect('user.state', 'state')
            .where('user.email = :email', { email })
            .getOne();
    }

    async findOneById(id: number): Promise<User> {
        return await this.userRepository
            .createQueryBuilder('user')
            .leftJoinAndSelect('user.company', 'company')
            .where('user.id = :id', { id })
            .getOne();
    }

    async findOneByIdAndUserType(id: number, type: string): Promise<User> {
        return await this.userRepository
            .createQueryBuilder('user')
            .leftJoinAndSelect('user.company', 'company')
            .leftJoinAndSelect('user.state', 'state')
            .where(`user.id = :id AND "userType" = :type`, { id, type })
            .getOne();
    }

    async findOneByIdAndUserRoles(id: number, userTypes: string[]): Promise<User> {
        return await this.userRepository
            .createQueryBuilder('user')
            .leftJoinAndSelect('user.state', 'state')
            .leftJoinAndSelect('user.company', 'company')
            .where(
                `user.id = :id 
            AND user.userType IN (:...userTypes)`,
                { id, userTypes }
            )
            .getOne();
    }

    async findManyByIdsAndUsersRoles(usersIds: number[], usersTypes: string[]): Promise<User[]> {
        return await this.userRepository
            .createQueryBuilder('user')
            .leftJoinAndSelect('user.state', 'state')
            .leftJoinAndSelect('user.company', 'company')
            .where(
                `user.id IN (:...usersIds) 
            AND user.userType IN (:...usersTypes)`,
                { usersIds, usersTypes }
            )
            .getMany();
    }

    async findOneByEmailAndUserType(email: string, userType: RoleType): Promise<User> {
        if (userType === 'operation') {
            return await this.userRepository
                .createQueryBuilder('user')
                .leftJoinAndSelect('user.state', 'state')
                .leftJoinAndSelect('user.clientData', 'clientData')
                .leftJoinAndSelect('user.clientInsurance', 'clientInsurance')
                .leftJoinAndSelect('user.company', 'company')
                .leftJoinAndSelect('user.clientTreatments', 'clientTreatments')
                .select([
                    'user',
                    'state',
                    'clientData',
                    'clientInsurance',
                    'company.id',
                    'company.companyName',
                    'clientTreatments'
                ])
                .where(`user.email = :email AND "userType" = :userType`, { email, userType })
                .getOne();
        }

        return await this.userRepository
            .createQueryBuilder('user')
            .leftJoinAndSelect('user.company', 'company')
            .where(`user.email = :email AND "userType" = :userType`, { email, userType })
            .getOne();
    }

    async changePass(userEmail: string, data: any): Promise<any> {
        const dbUser = await this.findOneByEmail(userEmail);
        if (dbUser.password !== data.currentPassword) throw new BadRequestException(['Credentials not matched']);
        dbUser.password = data.newPassword;
        dbUser.otp = generateOTP();

        await this.userRepository.save(dbUser);
        await this.notifyService.sendOTP(userEmail, dbUser.otp);
        return await this.authService.generateJWT({ email: dbUser.email }, 'otp', '1d');
    }

    async verifyChangePass(req: any, data: any): Promise<any> {
        const userEmail = req?.user?.email;

        let dbUser: User = await this.findOneByEmail(userEmail);
        if (!dbUser) throw new NotFoundException(['user not found']);

        if (dbUser.otp !== data.otp) {
            dbUser.newPassword = null;
            await this.userRepository.save(dbUser);
            throw new BadRequestException(['invalid OTP']);
        }

        dbUser.password = dbUser.newPassword;
        dbUser.newPassword = null;
        const savedUser = await this.userRepository.save(dbUser);
    }

    async findAndUpdate(email: string, updates: any): Promise<any> {
        let user: User = await this.findOneByEmail(email);
        if (!user) throw new NotFoundException(['user not found']);

        user = {
            ...user,
            ...updates
        };

        return await this.userRepository.save(user);
    }

    async findUser(email: string) {
        try {
            const user = await this.userRepository.findOne({ where: { email } });
            return user;
        } catch (error) {
            console.error('Error fetching user:', error);
            throw new Error('Could not fetch user');
        }
    }

    async createUser(data: any): Promise<any> {
        const { email, firstName, lastName, roleId, corporate } = data;

        let user: User = await this.findOneByEmail(email);
        if (user) throw new ConflictException(`This user already exists.`);
        const generatedPass = await generateRandomPassword();
        // console.log('generatedPass', generatedPass);
        const hashedPassword = await createPasswordHash(generatedPass);
        // console.log('hashedPassword', hashedPassword);

        user = new User();
        user.email = email;
        user.firstName = firstName;
        user.lastName = lastName;
        user.corporate = await this.corporateService.findCorporateById(corporate); // companyId;
        // user.userType = (await this.roleService.findOne(roleId)).roleName;
        user.status = 'invitation sent';
        user.password = hashedPassword;

        const dbUser = await this.userRepository.save(user);
        await this.userRoleService.create(dbUser.id, roleId);

        // const allRoleFeatures = await this.roleFeatureActionService.findByRoleId(roleId);
        // await this.userFeatureActionService.replicateFeaturesFromUserRole({ userId: dbUser.id, features: allRoleFeatures });

        // await this.authService.forgotPass({ email: user.email, forgot: false });
        return dbUser;
    }

    async updateClientUser(data: any, id: number): Promise<any> {
        let clientUser: User = await this.findOneById(id);

        if (!clientUser) throw new NotFoundException(['Client Not found..']);
        fillOrReplaceObject(clientUser, data);

        const dbUser = await this.userRepository.save(clientUser);

        return dbUser;
    }

    async getActiveUsers(): Promise<any> {
        return await this.userRepository
            .createQueryBuilder('user')
            .leftJoinAndSelect('user.company', 'company') // Assuming 'company' is the relation property in the User entity
            .where(`user.status = 'active'`)
            .orderBy('user.id', 'DESC') // Assuming 'id' is the primary key, replace it with your actual primary key column
            .getMany();
    }

    async getUserOfSameRole({
        dashboardRoute,
        roleId,
        userId,
        companyId,
        superadmin,
        limit,
        count
    }: {
        dashboardRoute?: boolean;
        roleId: number;
        userId?: number;
        companyId?: number;
        superadmin?: boolean;
        limit?: number;
        count?: boolean;
    }): Promise<any> {
        const dbRole = await this.roleService.findOne(roleId);
        if (!dbRole) throw new NotFoundException(['Role not found..']);

        let condition: any = `user.userType = :userType`;

        if (dashboardRoute) {
            condition += ` AND user.status = 'active'`;
        }
        if (!superadmin) {
            condition += ` AND user.company = :company`;
        }

        if (count) {
            return await this.userRepository
                .createQueryBuilder('user')
                .leftJoinAndSelect('user.company', 'company') // Assuming 'company' is the relation property in the User entity
                .where(condition, { userType: dbRole.roleName, company: companyId })
                .orderBy('user.id', 'DESC') // Assuming 'id' is the primary key, replace it with your actual primary key column
                .getCount();
        }

        let usersWithCompanyInfo: any = null;

        if (!limit) {
            usersWithCompanyInfo = await this.userRepository
                .createQueryBuilder('user')
                .leftJoinAndSelect('user.company', 'company') // Assuming 'company' is the relation property in the User entity
                .where(condition, { userType: dbRole.roleName, company: companyId })
                .orderBy('user.id', 'DESC') // Assuming 'id' is the primary key, replace it with your actual primary key column
                .getMany();
        } else {
            usersWithCompanyInfo = await this.userRepository
                .createQueryBuilder('user')
                .leftJoinAndSelect('user.company', 'company') // Assuming 'company' is the relation property in the User entity
                .where(condition, { userType: dbRole.roleName, company: companyId })
                .orderBy('user.id', 'DESC') // Assuming 'id' is the primary key, replace it with your actual primary key column
                .take(limit)
                .getMany();
        }

        return usersWithCompanyInfo;
    }

    async getUserOfRoles({
        req,
        status,
        dashboardRoute,
        rolesNames,
        userId,
        companyId,
        superadmin,
        limit,
        count,
        filters
    }: {
        req: any;
        status?: string;
        dashboardRoute?: boolean;
        rolesNames: string[];
        userId?: number;
        companyId?: number;
        superadmin?: boolean;
        limit?: number;
        count?: boolean;
        filters?: FilterRequest;
    }): Promise<any> {
        let condition: any = `user.userType IN (:...rolesNames)`;

        if (dashboardRoute) {
            condition += ` AND user.status = 'active'`;
        }

        if (!dashboardRoute && status) {
            condition += ` AND user.status = :status`;
        }

        if (!superadmin) {
            condition += ` AND user.company = :company`;
        }

        if (count) {
            return await this.userRepository
                .createQueryBuilder('user')
                .leftJoinAndSelect('user.company', 'company') // Assuming 'company' is the relation property in the User entity
                .where(condition, { rolesNames, company: companyId, status })
                .orderBy('user.id', 'DESC') // Assuming 'id' is the primary key, replace it with your actual primary key column
                .getCount();
        }

        let usersWithCompanyInfo: any = null;

        if (!limit) {
            const query = this.userRepository
                .createQueryBuilder('user')
                .leftJoinAndSelect('user.company', 'company') // Assuming 'company' is the relation property in the User entity
                .where(condition, { rolesNames, company: companyId, status })
                .skip(req?.QUERY_STRING?.skip)
                .take(req?.QUERY_STRING?.limit)
                .orderBy(
                    orderByKey({
                        key: req?.QUERY_STRING?.orderBy?.key,
                        defaultKey: 'id',
                        repoAlias: 'user'
                    }),
                    orderByValue({ req })
                );

            // Apply dynamic filters
            if (filters && Object?.keys(filters)?.length) {
                addFilters(query, filters);
            }

            const items = await query.getMany();

            const qb = query.select([]);

            usersWithCompanyInfo = { items, qb };
        } else {
            usersWithCompanyInfo = await this.userRepository
                .createQueryBuilder('user')
                .leftJoinAndSelect('user.company', 'company') // Assuming 'company' is the relation property in the User entity
                .where(condition, { rolesNames, company: companyId, status })
                .orderBy('user.id', 'DESC') // Assuming 'id' is the primary key, replace it with your actual primary key column
                .take(limit)
                .getMany();
        }

        return usersWithCompanyInfo;
    }

    async bulkUpdate(columnNameToUpdate: string, newValue: any, condition: any) {
        await this.userRepository
            .createQueryBuilder()
            .update(User)
            .set({ [columnNameToUpdate]: newValue })
            .where(condition)
            .execute();
    }

    async editUserType(userEmail: string, data: UserEditDto): Promise<any> {
        const dbUser = await this.findOneByEmail(userEmail);
        if (!dbUser) throw new NotFoundException(['User not found']);

        const { roleId, email, ...rest } = data;

        if (roleId) {
            const dbRole = await this.roleService.findOne(roleId);
            if (dbRole) {
                const dbUserRole = await this.userRoleService.findByUserId(dbUser.id);
                await this.userRoleService.updateUserRole(dbUserRole, { roleId });
                // dbUser.userType = dbRole.roleName;
                await this.userRepository.save(dbUser);
            }
        }

        await this.updateUser(dbUser, rest);
    }

    async updateUser(dbUser: User, updates: any) {
        let newUser = {
            ...dbUser,
            ...updates
        };
        return await this.userRepository.save(newUser);
    }

    async updateProfile(userEmail: string, data: any): Promise<any> {
        let dbUser: User = await this.findOneByEmail(userEmail);
        if (!dbUser) throw new NotFoundException(['user not found']);

        let updates: any = {};

        if (data.defaultLocation) {
            updates.state = data.defaultLocation;
        }

        const { defaultLocation, ...rest } = data;
        updates = {
            ...updates,
            ...rest
        };

        return await this.findAndUpdate(dbUser.email, updates);
    }

    async removeByEmail(email: string): Promise<any> {
        if (email === 'tahir@insighttherapy.us') {
            const dbUser = await this.findOneByEmail(email);
            if (!dbUser) throw new NotFoundException(['Already Deleted..']);
        }

        return await this.userRepository.delete({ email });
    }

    async removeById(req: any): Promise<any> {
        const id = req.body.id;
        return this.userRepository.delete({ id });
    }

    async getProfile(email: string): Promise<any> {
        const dbUser = await this.findOneByEmail(email);
        if (!dbUser) throw new NotFoundException(['user not found']);

        const { id, password, newPassword, accessToken, ...rest } = dbUser;

        return {
            ...rest
        };
    }

    async findOneByEmailWithRelations(email: string) {
        return await this.userRepository
            .createQueryBuilder('user')
            .leftJoinAndSelect('user.company', 'company')
            .leftJoinAndSelect('user.state', 'state')
            .where('user.email= :email', { email })
            .select(['user', 'company', 'state'])
            .getOne();
    }

    async findClientByIdWithRelations(id: number) {
        return await this.userRepository
            .createQueryBuilder('user')
            .leftJoinAndSelect('user.company', 'company')
            .leftJoinAndSelect('user.clientData', 'clientData')
            .where(
                `user.id = :id 
                              AND user.userType = :type`,
                { id, type: Roles.operation }
            )
            .getOne();
    }

    async findSingleClientByIdAndCompanyWithRelations(id: number, company: number) {
        return await this.userRepository
            .createQueryBuilder('user')
            .leftJoinAndSelect('user.company', 'company')
            .leftJoinAndSelect('user.therapistData', 'therapistData')
            .leftJoinAndSelect('user.therapistSpecialities', 'speciality')
            .leftJoinAndSelect('user.therapistLicenses', 'therapistLicenses')
            .leftJoinAndSelect('therapistLicenses.license', 'license')
            .select([
                'user.id',
                'user.firstName',
                'user.lastName',
                'user.logo',
                'speciality',
                'therapistData.timeZone',
                'therapistLicenses',
                'license.licenseType',
                'company'
            ])
            .where(
                `user.id = :id 
                              AND user.userType = :type
                              AND user.company = :company`,
                { id, type: 'client', company }
            )
            .getOne();
    }

    async setClientStatus(body: ClientStatusDto) {
        const dbUser = await this.findOneById(body?.clientId);
        // if (!dbUser || dbUser?.userType !== Roles.client) throw new NotFoundException('Client not found');

        dbUser.status = body?.status;

        await this.userRepository.save(dbUser);
    }

    async getTestList(data: TestListDto, req: any): Promise<User[]> {
        let users = await this.userRepository
            .createQueryBuilder('user')
            .leftJoinAndSelect('user.company', 'company')
            .where(req?.QUERY_STRING?.where)
            .select(['user.id', 'user.firstName', 'user.userType', 'user.createdAt', 'company.id'])
            .skip(req?.QUERY_STRING?.skip)
            .take(req?.QUERY_STRING?.limit)
            .orderBy(
                orderByKey({
                    key: req?.QUERY_STRING?.orderBy?.key,
                    repoAlias: 'user'
                }),
                orderByValue({ req })
            )
            .getMany();

        return users;
    }

    async getAllStaffByCompany(companyId: number, req: any, staffTypes: string[], searchByNameParam?: any) {
        let firstName = null;
        let lastName = null;

        const queryBuilder = await this.userRepository.createQueryBuilder('staff').where(
            `staff.userType IN (:...staffTypes) 
                          AND staff.status = :status
                          AND staff.company = :companyId`,
            {
                staffTypes,
                status: USER_STATUS.ACTIVE,
                companyId,
                firstName: `%${firstName}%`, // Partial match for firstName
                lastName: lastName ? `%${lastName}%` : `%${firstName}%`
            }
        );

        if (searchByNameParam && searchByNameParam !== '') {
            const nameParts = searchByNameParam.trim().split(' ').filter(Boolean);
            firstName = nameParts[0]; // First part is considered first name
            lastName = nameParts[1] ? nameParts[1] : null;

            if (firstName) {
                queryBuilder.andWhere(
                    `LOWER(staff.firstName) LIKE :firstName OR LOWER(staff.lastName) LIKE :firstName)`,
                    {
                        firstName: `%${firstName}%`
                    }
                );
            }
            if (lastName) {
                queryBuilder.andWhere(
                    `LOWER(staff.firstName) LIKE :lastName OR LOWER(staff.lastName) LIKE :lastName)`,
                    {
                        lastName: `%${lastName}%`
                    }
                );
            }
        }

        queryBuilder.skip(req?.QUERY_STRING?.skip).take(req?.QUERY_STRING?.limit);

        // Apply dynamic sorting
        if (req?.body?.sort) {
            Object.entries(req?.body?.sort).forEach(([key, value]) => {
                const sortOrder = String(value).trim().toUpperCase(); // Sanitize the sort order
                queryBuilder.addOrderBy(`staff.${key}`, sortOrder as 'ASC' | 'DESC');
            });
        }

        const items = await queryBuilder.getMany();

        const qb = queryBuilder.select(['staff.id']);

        return {
            items,
            qb
        };
    }

    async getUserByCompanyId(reqBody: any): Promise<any> {
        let result = null;
        try {
            const query = 'CALL get_userByCompanyId(?)';
            result = await this.userRepository.query(query, [reqBody.companyId]);
            // console.log(result[0]);
        } catch (error) {
            console.log('-api: backend/user/getUserByCompanyId', error.message);
            throw new InternalServerErrorException(error.message);
        }

        return result[0];
    }

    async getUserForFilter(): Promise<any> {
        const query = 'CALL get_userForFilter()';
        const result = await this.userRepository.query(query);
        // console.log(result[0]);

        return result[0];
    }

    async findOneByEmailAndCompany(email: string, corporate: Corporate): Promise<User | null> {
        return await this.userRepository.findOne({
            where: { email, corporate }
        });
    }

    // async createInsuranceUser(data: any): Promise<any> {
    //     const {
    //         email,
    //         firstName,
    //         lastName,
    //         phone,
    //         dateOfBirth,
    //         gender,
    //         roleId,
    //         corporate,
    //         branch,
    //         userRole,
    //         reportingOfficer
    //     } = data;

    //     const existsCorporate = await this.corporateService.findCorporateById(corporate);

    //     if (!existsCorporate) throw new NotFoundException('Corporate not found');

    //     let user: User = await this.findOneByEmailAndCompany(email, existsCorporate);

    //     if (user) throw new ConflictException(`This user already exists.`);
    //     const generatedPass = await generateRandomPassword();
    //     // console.log('generatedPass', generatedPass);
    //     const hashedPassword = await createPasswordHash(generatedPass);
    //     // console.log('hashedPassword', hashedPassword);

    //     user = new User();
    //     user.email = email;
    //     user.firstName = firstName;
    //     user.lastName = lastName;
    //     user.phoneNumber = phone;
    //     user.dateOfBirth = dateOfBirth;
    //     user.gender = gender;
    //     user.corporate = existsCorporate;
    //     user.branch = branch,
    //     user.userRole = userRole;
    //     // user.userType = (await this.roleService.findOne(roleId)).roleName;
    //     user.reportingOfficer = reportingOfficer;
    //     user.status = 'active';
    //     user.password = hashedPassword;

    //     const dbUser = await this.userRepository.save(user);
    //     await this.userRoleService.create(dbUser.id, roleId);
    //     // write here email service
    //     if (dbUser) {
    //         let htmlContent = passwordForInsuranceLogin(email, generatedPass, firstName);
    //         const mailedData = await this.emailService.sendEmail(email, 'Your LTR Account Credentials', htmlContent);
    //         if (!mailedData) {
    //             throw new InternalServerErrorException('Email not sent');
    //         }
    //     }
    //     return dbUser;
    // }

    async getUserById(reqBody: any): Promise<any> {
        let result = null;
        try {
            const query = 'CALL get_userById(?)';
            result = await this.userRepository.query(query, [reqBody.userId]);
            // console.log(result[0]);
        } catch (error) {
            // console.log('-api: backend/user/getUserById', error.message);
            throw new InternalServerErrorException(error.message);
        }

        return result[0];
    }

    async getEmployeeRo(reqBody: any): Promise<any> {
        let result = null;
        try {
            const query = 'CALL get_employeeRo()';
            result = await this.userRepository.query(query);
            console.log(result[0]);
        } catch (error) {
            console.log('-api: backend/user/getEmployeeRo', error.message);
            throw new InternalServerErrorException(error.message);
        }

        return result[0];
    }

    //--------------------
    async createUserApi(body: any): Promise<any> {
        try {
            const {
                email,
                firstName,
                lastName,
                middleName,
                phone,
                dateOfBirth,
                gender,
                dateOfJoining,
                branchId,
                roleName,
                corporateId
            } = body;
            console.log('body---------->');
            // Validation: Check required fields
            if (!branchId) {
                throw new BadRequestException('Branch ID is required');
            }

            // Fetch branch
            const branch = await this.branchService.findById(body.branchId);
            if (!branch) {
                throw new BadRequestException('Invalid Branch ID');
            }

            const role = await this.roleRepository.findOne({ where: { roleName: roleName } });
            console.log('here is role ', role);

            if (!role) throw new NotFoundException('Role is not found');

            const existsCorporate = await this.corporateService.findCorporateById(corporateId);

            if (!existsCorporate) throw new NotFoundException('Corporate not found');

            // ----------------- Create user ----------------


            let user = await this.userRepository.findOne({where:{email:email, corporate:{id:existsCorporate.id}}});
// console.log("checking poin 2 +++++++++++++++ user", user);
    

            if (user?.id) {
                throw new ConflictException(`This user already exists.`);
            } else {
                // const generatedPass = await generateRandomPassword();
                const tempPassword = '12345';
                const hashedPassword = await createPasswordHash(tempPassword);

                user = new User();
                user.email = email;
                user.firstName = firstName;
                user.lastName = lastName;
                user.phoneNumber = phone;
                user.dateOfBirth = dateOfBirth;
                user.gender = gender;
                user.corporate = existsCorporate;
                (user.branch = branch), (user.userRole = role);
                user.reportingOfficer = null;
                // user.userCode = userCode;
                user.status = 'active';
                user.password = hashedPassword;

                const dbUser = await this.userRepository.save(user);
                console.log("checking poin 1 +++++++++++++++dbUser", dbUser);

                await this.userRoleService.create(dbUser, dbUser.userRole?.id);
                // write here email service
                if (dbUser) {
                    const userCode = makeUserCode(dbUser.id, existsCorporate.corporateName, branch.name);
                    console.log('user code --------', userCode);

                    await this.userRepository.update(dbUser.id, {
                        userCode: userCode
                    });
                    let htmlContent = passwordForInsuranceLogin(email, '12345', firstName);
                    const mailedData = await this.emailService.sendEmail(
                        email,
                        'Your Account Credentials',
                        htmlContent
                    );
                    if (!mailedData) {
                        throw new InternalServerErrorException('Email not sent');
                    }
                }

                // const newUser = await this.userService.createInsuranceUser(userData);
                if (!dbUser) {
                    throw new InternalServerErrorException('Failed to create user');
                }

                // Return structured response
                return {
                    success: true,
                    message: 'User created successfully',
                    data: {
                        userId: dbUser.id,
                        userCode: dbUser.userCode,
                        fullName: `${dbUser.firstName} ${dbUser.lastName}`
                    }
                };
            }
        } catch (error) {
            console.error('error: api- users/createUserApi', error.message);
            throw new InternalServerErrorException(error.message || 'Error in creating user');
        }
    }



}
