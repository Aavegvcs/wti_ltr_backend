
// import { Injectable } from '@nestjs/common';
// import { InjectRepository } from '@nestjs/typeorm';
// import { Repository } from 'typeorm';
// import { LoggedInsUserService } from '@modules/auth/logged-ins-user.service';
// import { standardResponse } from 'src/utils/helper/response.helper';

// @Injectable()
// export class CvdMappingService {
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
import { Repository } from 'typeorm';
import { LoggedInsUserService } from '@modules/auth/logged-ins-user.service';
import { standardResponse } from 'src/utils/helper/response.helper';
import { CvdMapping } from './enitites/cvd-mapping.entity';
import { Corporate } from '@modules/company/entities/corporate.entity';
import { Vehicle } from '@modules/vehicle/entities/vehicle.entity';
import { Driver } from '@modules/driver/entities/driver.entity';
import { Branch } from '@modules/branch/entities/branch.entity';

@Injectable()
export class CvdMappingService {
    constructor(
        @InjectRepository(CvdMapping)
        private readonly cvdRepo: Repository<CvdMapping>,

        @InjectRepository(Corporate)
        private readonly corporateRepo: Repository<Corporate>,

        @InjectRepository(Branch)
        private readonly branchRepo: Repository<Branch>,

        @InjectRepository(Vehicle)
        private readonly vehicleRepo: Repository<Vehicle>,

        @InjectRepository(Driver)
        private readonly driverRepo: Repository<Driver>,

        private readonly loggedInsUserService: LoggedInsUserService
    ) { }


    async createMapping(body: any) {
        try {
            const user = await this.loggedInsUserService.getCurrentUser();
            if (!user) return standardResponse(false, "User not logged in", 401);

            const { corporateId, branchId, vehicleId, driverId } = body;

            const corporate = await this.corporateRepo.findOne({ where: { id: corporateId } });
            if (!corporate) return standardResponse(false, "Corporate not found", 404);

            const branch = await this.branchRepo.findOne({ where: { id: branchId } });
            if (!branch) return standardResponse(false, "Branch not found", 404);

            const vehicle = await this.vehicleRepo.findOne({ where: { id: vehicleId } });
            if (!vehicle) return standardResponse(false, "Vehicle not found", 404);

            const driver = await this.driverRepo.findOne({ where: { id: driverId } });
            if (!driver) return standardResponse(false, "Driver not found", 404);


            // 🚫 RULE A: vehicle must be free

            // VEHICLE MUST BE FREE
            const activeVehicle = await this.cvdRepo.findOne({
                where: { corporate, isActive: true }
            });
            if (activeVehicle) {
                return standardResponse(false, "Vehicle already linked to a driver/branch", 400);
            }

            // DRIVER MUST BE FREE
            const activeDriver = await this.cvdRepo.findOne({
                where: { driver, isActive: true }
            });
            if (activeDriver) {
                return standardResponse(false, "Driver already linked to a vehicle/branch", 400);
            }

            // OPTIONAL: auto-deactivate old mapping instead of error
            // await this.cvdRepo.update({ vehicle: { id: vehicleId }, isActive: true }, { isActive: false });
            // await this.cvdRepo.update({ driver: { id: driverId }, isActive: true }, { isActive: false });

            // const newMapping = this.cvdRepo.create({
            //     corporate,
            //     branch,
            //     vehicle,
            //     driver,
            //     isActive: true,
            //     createdBy: user,
            //     updatedBy: user
            // });
            const newMapping = this.cvdRepo.create({
                corporate,
                branch,
                vehicle,
                driver,
                isActive: true,
                createdBy: user,
                updatedBy: user,
            });



            const saved = await this.cvdRepo.save(newMapping);

            return standardResponse(true, "CVD mapping created successfully", 201, saved);

        } catch (err) {
            return standardResponse(false, err.message, 500);
        }
    }


    // ➤ LIST ALL MAPPINGS
    async listMappings() {
        const data = await this.cvdRepo.find({
            relations: ['corporate', 'branch', 'vehicle', 'driver', 'createdBy', 'updatedBy']
        });
        console.log("in list api-------",data);
        return standardResponse(true, 'List fetched', 200, data);
    }

    // ➤ GET BY CORPORATE
    async getByCorporate(id: number) {
        const data = await this.cvdRepo.find({
            where: { corporate: { id } },
            relations: ['corporate','branch',  'vehicle', 'driver']
        });
        return standardResponse(true, 'Data fetched', 200, data);
    }

    // ➤ GET BY VEHICLE
    async getByVehicle(id: number) {
        const data = await this.cvdRepo.find({
            where: { vehicle: { id } },
            relations: ['corporate','branch',  'vehicle', 'driver']
        });
        return standardResponse(true, 'Data fetched', 200, data);
    }

    // ➤ GET BY DRIVER
    async getByDriver(id: number) {
        const data = await this.cvdRepo.find({
            where: { driver: { id } },
            relations: ['corporate','branch',  'vehicle', 'driver']
        });
        return standardResponse(true, 'Data fetched', 200, data);
    }

    // ➤ UPDATE MAPPING
    async updateMapping(id: number, reqBody: any) {
        let mapping = await this.cvdRepo.findOne({ where: { id } });
        if (!mapping) return standardResponse(false, 'Mapping not found', 404);

        await this.cvdRepo.update(id, reqBody);

        const updated = await this.cvdRepo.findOne({ where: { id } });

        return standardResponse(true, 'Mapping updated', 200, updated);
    }

    // ➤ CHANGE STATUS
    async changeStatus(id: number, status: boolean) {
        let mapping = await this.cvdRepo.findOne({ where: { id } });
        if (!mapping) return standardResponse(false, 'Mapping not found', 404);

        await this.cvdRepo.update(id, { isActive: status });

        return standardResponse(true, 'Status updated', 200);
    }

    // ➤ DELETE (SOFT)
    async deleteMapping(id: number) {
        let mapping = await this.cvdRepo.findOne({ where: { id } });
        if (!mapping) return standardResponse(false, 'Mapping not found', 404);

        await this.cvdRepo.softDelete(id);

        return standardResponse(true, 'Mapping deleted', 200);
    }
}
