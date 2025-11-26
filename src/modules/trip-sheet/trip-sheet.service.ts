
// import { Injectable } from '@nestjs/common';
// import { InjectRepository } from '@nestjs/typeorm';
// import { Repository } from 'typeorm';
// import { LoggedInsUserService } from '@modules/auth/logged-ins-user.service';
// import { standardResponse } from 'src/utils/helper/response.helper';
// import { FirstTripSheet } from './entities/first-trip-sheet.entity';
// import { Driver } from '@modules/driver/entities/driver.entity';

// @Injectable()
// export class TripSheetService {
//     constructor(
//         @InjectRepository(FirstTripSheet)
//         private readonly _firstTripSheetRepo: Repository<FirstTripSheet>,

//         @InjectRepository(Driver)
//         private readonly _driverRepo: Repository<Driver>,

//         private readonly loggedInsUserService: LoggedInsUserService

//     ) {}

//     // async getTripSheetByMobile(reqBody: any): Promise<any> {
//     //     try {
//     //         const { mobileNumber, tripDate } = reqBody;
//     //         const userEntity = await this.loggedInsUserService.getCurrentUser();

//     //         if (!userEntity) {
//     //             return standardResponse(false, 'Logged user not found', 404, null, null, 'tripsheet/getTripSheetByMobile');
//     //         }

//     //         const driver = await this._driverRepo.findOne({
//     //             where: { mobileNumber: mobileNumber }
//     //         });

//     //         if (!driver) {
//     //             return standardResponse(false, 'Driver not found', 404, null, null, 'tripsheet/getTripSheetByMobile');
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


// }
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { LoggedInsUserService } from '@modules/auth/logged-ins-user.service';
import { standardResponse } from 'src/utils/helper/response.helper';
import { FirstTripSheet } from './entities/first-trip-sheet.entity';
import { Driver } from '@modules/driver/entities/driver.entity';
import { TripSheetStatus } from './entities/trip-sheet-status.entity';

@Injectable()
export class TripSheetService {
    constructor(
        @InjectRepository(FirstTripSheet)
        private readonly tripRepo: Repository<FirstTripSheet>,

        @InjectRepository(Driver)
        private readonly driverRepo: Repository<Driver>,

        @InjectRepository(TripSheetStatus)
        private readonly statusRepo: Repository<TripSheetStatus>,

        private readonly loggedInsUserService: LoggedInsUserService
    ) { }

    // ⬆ Get or Create Trip Sheet
    async getTripSheetByMobile(reqBody: any) {
        try {
            const { mobileNumber, tripDate } = reqBody;

            const driver = await this.driverRepo.findOne({
                where: { mobileNumber }
            });

            if (!driver) {
                return standardResponse(false, "Driver not found", 404);
            }

            // check if trip exists
            const existing = await this.tripRepo.findOne({
                where: {
                    driver: { id: driver.id },
                    date: tripDate
                },
                relations: ['status']
            });

            if (existing) {
                return standardResponse(true, "Trip sheet fetched", 200, existing);
            }

            // Create NEW Trip Sheet
            const openStatus = await this.statusRepo.findOne({ where: { status: "OPEN" } });

            const newTrip = this.tripRepo.create({
                driver,
                date: tripDate,
                status: openStatus,
                isActive: true
            });

            const saved = await this.tripRepo.save(newTrip);

            return standardResponse(true, "New trip sheet created", 201, saved);

        } catch (err) {
            return standardResponse(false, err.message, 500);
        }
    }

    // ⬆ Save Trip Sheet (Partial)
    async saveTripSheet(id: number, body: any) {
        const trip = await this.tripRepo.findOne({ where: { id } });
        if (!trip) return standardResponse(false, "Trip not found", 404);

        await this.tripRepo.update(id, body);

        return standardResponse(true, "Trip sheet saved", 200);
    }

    // ⬆ Submit Trip Sheet → Status = SUBMITTED
    async submitTripSheet(id: number) {
        const submitted = await this.statusRepo.findOne({ where: { status: "SUBMITTED" } });

        await this.tripRepo.update(id, { status: submitted });

        return standardResponse(true, "Trip sheet submitted", 200);
    }

    // ⬆ Close Trip Sheet → Status = CLOSED
    async closeTripSheet(id: number) {
        const closed = await this.statusRepo.findOne({ where: { status: "CLOSED" } });

        await this.tripRepo.update(id, { status: closed });

        return standardResponse(true, "Trip sheet closed", 200);
    }

    // ⬆ Reopen Trip Sheet → Status = OPEN
    async reopenTripSheet(id: number) {
        const openStatus = await this.statusRepo.findOne({ where: { status: "OPEN" } });

        await this.tripRepo.update(id, { status: openStatus });

        return standardResponse(true, "Trip sheet reopened", 200);
    }

    // ⬆ List trip sheets for driver
    async getTripsByDriver(driverId: number) {
        const trips = await this.tripRepo.find({
            where: { driver: { id: driverId } },
            relations: ['status']
        });

        return standardResponse(true, "Trips fetched", 200, trips);
    }
}
