
// import { Injectable } from '@nestjs/common';
// import { InjectRepository } from '@nestjs/typeorm';
// import { Repository } from 'typeorm';
// import { LoggedInsUserService } from '@modules/auth/logged-ins-user.service';
// import { standardResponse } from 'src/utils/helper/response.helper';

// @Injectable()
// export class DriverService {
//     constructor(
//         // @InjectRepository(InsurancePolicy)
//         // private readonly _policyRepo: Repository<InsurancePolicy>,


//     ) {}

//     // async createClaim(reqBody: any): Promise<any> {
//     //     try {
//     //         const { policyId, incidentDate, incidentPlace, incidentDescription, claimType, claimAmount } = reqBody;
//     //         const userEntity = await this.loggedInsUserService.getCurrentUser();

//     //         if (!userEntity) {
//     //             return standardResponse(false, 'Logged user not found', 404, null, null, 'insurance-claim/createClaim');
//     //         }
//     //         const policy = await this._policyRepo.findOne({
//     //             where: { id: policyId },
//     //             relations: ['insuranceProduct', 'insuranceUser']
//     //         });
//     //         if (!policy) {
//     //             return standardResponse(false, 'Policy not found', 404, null, null, 'insurance-claim/createClaim');
//     //         }
//     //         // existing claim code
//     //         const existingClaim = await this._claimRepo.findOne({
//     //             where: { policy: { id: policy.id } },
//     //             order: { createdAt: 'DESC' }
//     //         });
//     //         if (existingClaim) {
//     //             if (existingClaim.status !== Claim_Status.CLOSED && existingClaim.status !== Claim_Status.REJECTED) {
//     //                 return standardResponse(
//     //                     false,
//     //                     'A claim is already in proccess',
//     //                     409,
//     //                     null,
//     //                     null,
//     //                     'insurance-claim/createClaim'
//     //                 );
//     //             }
//     //         }
//     //         // check waiting period
//     //         const currentDate = new Date();
//     //         const startDate = new Date(policy.startDate);
//     //         const waitingDays = policy.insuranceProduct.waitingPeriods ?? 0;
//     //         const waitingDate = new Date(startDate);
//     //         waitingDate.setDate(waitingDate.getDate() + waitingDays);

//     //         if (waitingDate > currentDate) {
//     //             return standardResponse(
//     //                 false,
//     //                 'Waiting period is not completed',
//     //                 409,
//     //                 null,
//     //                 null,
//     //                 'insurance-claim/createClaim'
//     //             );
//     //         }
//     //         // check if policy is not mutured
//     //         // end of code policy not mutured

//     //         const newClaim = this._claimRepo.create({
//     //             policy: policy,
//     //             policyNumber: policy.policyNumber,
//     //             insuranceUser: policy.insuranceUser,
//     //             incidentDate: incidentDate,
//     //             incidentPlace: incidentPlace,
//     //             incidentDescription: incidentDescription,
//     //             claimType: claimType,
//     //             status: Claim_Status.REGISTERED,
//     //             claimAmount: claimAmount,
//     //             createdBy: userEntity
//     //         });
//     //         // Save to DB
//     //         const result = await this._claimRepo.save(newClaim);

//     //         if (result) {
//     //             // here log history will be created
//     //             const result2 = await this.createClaimLogs(
//     //                 result,
//     //                 policy.policyNumber,
//     //                 Claim_Status.REGISTERED,
//     //                 Claim_Status.REGISTERED,
//     //                 'New claim created',
//     //                 userEntity
//     //             );
//     //             if (result2) {
//     //                 return standardResponse(
//     //                     true,
//     //                     'Claim is created & logs is created',
//     //                     201,
//     //                     null,
//     //                     null,
//     //                     'insurance-claim/createClaim'
//     //                 );
//     //             } else {
//     //                 console.log(
//     //                     'api- insurance-claim/createClaim-,  Claim is created but logs is not created. policyId is: ',
//     //                     policy.policyNumber
//     //                 );

//     //                 return standardResponse(
//     //                     false,
//     //                     'Claim is created but logs is not created',
//     //                     202,
//     //                     null,
//     //                     null,
//     //                     'insurance-claim/createClaim'
//     //                 );
//     //             }
//     //         } else {
//     //             console.log(
//     //                 'api- insurance-claim/createClaim-,  Failed to created claim. policyId is: ',
//     //                 policy.policyNumber
//     //             );

//     //             return standardResponse(
//     //                 false,
//     //                 'Failed to created claim',
//     //                 500,
//     //                 null,
//     //                 null,
//     //                 'insurance-claim/createClaim'
//     //             );
//     //         }
//     //     } catch (error) {
//     //         console.log('-api- createPlicy', error.message);
//     //         return standardResponse(false, error.message, 501, null, null, 'insurance-claim/createClaim');
//     //     }
//     // }
//     // this is function

// }
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { LoggedInsUserService } from '@modules/auth/logged-ins-user.service';
import { standardResponse } from 'src/utils/helper/response.helper';
import { Driver } from './entities/driver.entity';

@Injectable()
export class DriverService {
    constructor(
        @InjectRepository(Driver)
        private readonly driverRepo: Repository<Driver>,
        private readonly loggedInsUserService: LoggedInsUserService
    ) { }

    // CREATE DRIVER
    async createDriver(reqBody: any) {
        try {
            const user = await this.loggedInsUserService.getCurrentUser();
            if (!user) {
                return standardResponse(false, "User not logged in", 401);
            }

            const newDriver = this.driverRepo.create({
                ...reqBody,
                createdBy: user,
                updatedBy: user
            });

            const savedData = await this.driverRepo.save(newDriver);
            return standardResponse(true, "Driver created successfully", 201, savedData);

        } catch (error) {
            return standardResponse(false, error.message, 500);
        }
    }

    // GET ALL DRIVERS
    async getAllDrivers(page = 1, limit = 10, search?: string) {
        const skip = (page - 1) * limit;

        const whereClause = search
            ? [{ name: Like(`%${search}%`) }, { mobileNumber: Like(`%${search}%`) }]
            : {};

        const [data, count] = await this.driverRepo.findAndCount({
            where: whereClause,
            skip,
            take: limit,
            relations: ['createdBy', 'updatedBy']
        });

        return standardResponse(true, "Driver list fetched", 200, {
            data,
            total: count,
            page,
            limit
        });
    }

    // GET SINGLE DRIVER
    async getDriverByMobileNumber(mobileNumber: string) {
        const driver = await this.driverRepo.findOne({
            where: { mobileNumber },
            relations: ['createdBy', 'updatedBy'],
        });

        if (!driver) return standardResponse(false, "Driver not found", 404);
        return standardResponse(true, "Driver fetched", 200, driver);
    }

    // UPDATE DRIVER
    async updateDriver(id: number, reqBody: any) {
        const user = await this.loggedInsUserService.getCurrentUser();

        const driver = await this.driverRepo.findOne({ where: { id } });
        if (!driver) return standardResponse(false, "Driver not found", 404);

        await this.driverRepo.update(id, {
            ...reqBody,
            updatedBy: user
        });

        const updatedData = await this.driverRepo.findOne({ where: { id } });

        return standardResponse(true, "Driver updated", 200, updatedData);
    }

    // SOFT DELETE DRIVER
    async deleteDriver(id: number) {
        const driver = await this.driverRepo.findOne({ where: { id } });
        if (!driver) return standardResponse(false, "Driver not found", 404);

        await this.driverRepo.softDelete(id);

        return standardResponse(true, "Driver deleted", 200);
    }

    // ACTIVATE / DEACTIVATE DRIVER
    // async changeStatus(id: number, status: boolean) {
    //     const driver = await this.driverRepo.findOne({ where: { id } });
    //     if (!driver) return standardResponse(false, "Driver not found", 404);

    //     await this.driverRepo.update(id, { isActive: status });

    //     return standardResponse(true, `Driver ${status ? 'activated' : 'deactivated'}`, 200);
    // }
    async changeStatus(id: number, status: boolean) {
        const driver = await this.driverRepo.findOne({
            where: { id },
            withDeleted: false
        });

        if (!driver) return standardResponse(false, "Driver not found", 404);

        await this.driverRepo.update(id, { isActive: status });

        return standardResponse(true, `Driver ${status ? 'activated' : 'deactivated'}`, 200);
    }

}