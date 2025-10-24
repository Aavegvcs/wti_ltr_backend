
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LoggedInsUserService } from '@modules/auth/logged-ins-user.service';
import { standardResponse } from 'src/utils/helper/response.helper';
import { FirstTripSheet } from './entities/first-trip-sheet.entity';
import { Driver } from '@modules/driver/entities/driver.entity';

@Injectable()
export class TripSheetService {
    constructor(
        @InjectRepository(FirstTripSheet)
        private readonly _firstTripSheetRepo: Repository<FirstTripSheet>,

        @InjectRepository(Driver)
        private readonly _driverRepo: Repository<Driver>,

        private readonly loggedInsUserService: LoggedInsUserService
      
    ) {}

    // async getTripSheetByMobile(reqBody: any): Promise<any> {
    //     try {
    //         const { mobileNumber, tripDate } = reqBody;
    //         const userEntity = await this.loggedInsUserService.getCurrentUser();

    //         if (!userEntity) {
    //             return standardResponse(false, 'Logged user not found', 404, null, null, 'tripsheet/getTripSheetByMobile');
    //         }

    //         const driver = await this._driverRepo.findOne({
    //             where: { mobileNumber: mobileNumber }
    //         });

    //         if (!driver) {
    //             return standardResponse(false, 'Driver not found', 404, null, null, 'tripsheet/getTripSheetByMobile');
    //         }

    //         // existing claim code
    //         const existingClaim = await this._claimRepo.findOne({
    //             where: { policy: { id: policy.id } },
    //             order: { createdAt: 'DESC' }
    //         });

    //         if (existingClaim) {
    //             if (existingClaim.status !== Claim_Status.CLOSED && existingClaim.status !== Claim_Status.REJECTED) {
    //                 return standardResponse(
    //                     false,
    //                     'A claim is already in proccess',
    //                     409,
    //                     null,
    //                     null,
    //                     'insurance-claim/createClaim'
    //                 );
    //             }
    //         }
    //         // check waiting period
    //         const currentDate = new Date();
    //         const startDate = new Date(policy.startDate);
    //         const waitingDays = policy.insuranceProduct.waitingPeriods ?? 0;
    //         const waitingDate = new Date(startDate);
    //         waitingDate.setDate(waitingDate.getDate() + waitingDays);

    //         if (waitingDate > currentDate) {
    //             return standardResponse(
    //                 false,
    //                 'Waiting period is not completed',
    //                 409,
    //                 null,
    //                 null,
    //                 'insurance-claim/createClaim'
    //             );
    //         }
    //         // check if policy is not mutured
    //         // end of code policy not mutured

    //         const newClaim = this._claimRepo.create({
    //             policy: policy,
    //             policyNumber: policy.policyNumber,
    //             insuranceUser: policy.insuranceUser,
    //             incidentDate: incidentDate,
    //             incidentPlace: incidentPlace,
    //             incidentDescription: incidentDescription,
    //             claimType: claimType,
    //             status: Claim_Status.REGISTERED,
    //             claimAmount: claimAmount,
    //             createdBy: userEntity
    //         });
    //         // Save to DB
    //         const result = await this._claimRepo.save(newClaim);

    //         if (result) {
    //             // here log history will be created
    //             const result2 = await this.createClaimLogs(
    //                 result,
    //                 policy.policyNumber,
    //                 Claim_Status.REGISTERED,
    //                 Claim_Status.REGISTERED,
    //                 'New claim created',
    //                 userEntity
    //             );
    //             if (result2) {
    //                 return standardResponse(
    //                     true,
    //                     'Claim is created & logs is created',
    //                     201,
    //                     null,
    //                     null,
    //                     'insurance-claim/createClaim'
    //                 );
    //             } else {
    //                 console.log(
    //                     'api- insurance-claim/createClaim-,  Claim is created but logs is not created. policyId is: ',
    //                     policy.policyNumber
    //                 );

    //                 return standardResponse(
    //                     false,
    //                     'Claim is created but logs is not created',
    //                     202,
    //                     null,
    //                     null,
    //                     'insurance-claim/createClaim'
    //                 );
    //             }
    //         } else {
    //             console.log(
    //                 'api- insurance-claim/createClaim-,  Failed to created claim. policyId is: ',
    //                 policy.policyNumber
    //             );

    //             return standardResponse(
    //                 false,
    //                 'Failed to created claim',
    //                 500,
    //                 null,
    //                 null,
    //                 'insurance-claim/createClaim'
    //             );
    //         }
    //     } catch (error) {
    //         console.log('-api- createPlicy', error.message);
    //         return standardResponse(false, error.message, 501, null, null, 'insurance-claim/createClaim');
    //     }
    // }
   
  
}
