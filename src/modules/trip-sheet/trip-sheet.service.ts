import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { LoggedInsUserService } from '@modules/auth/logged-ins-user.service';
import { standardResponse } from 'src/utils/helper/response.helper';
import { TripSheet } from './entities/trip-sheet.entity';
import { Driver } from '@modules/driver/entities/driver.entity';
import { TripSheetStatus } from './entities/trip-sheet-status.entity';
import { TripSheetStatusEnum } from 'src/utils/app.utils';
import { CvdMapping } from '@modules/cvd-mapping/enitites/cvd-mapping.entity';
import { Corporate } from '@modules/company/entities/corporate.entity';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

@Injectable()
export class TripSheetService {
    constructor(
        @InjectRepository(TripSheet)
        private readonly tripSheetRepo: Repository<TripSheet>,

        @InjectRepository(Driver)
        private readonly driverRepo: Repository<Driver>,

        @InjectRepository(TripSheetStatus)
        private readonly statusRepo: Repository<TripSheetStatus>,

        @InjectRepository(CvdMapping)
        private readonly cvdMappingRepo: Repository<CvdMapping>,

        private readonly loggedInsUserService: LoggedInsUserService,
        @InjectQueue('trip-queue') private readonly tripQueue: Queue
    ) {}

    // create new tripsheet
    async newTripsheetApi(reqBody: any): Promise<any> {
        let response = null;
        try {
            const driverMobile = reqBody.driverMobile;
            const existingDriver = await this.driverRepo.findOne({ where: { mobileNumber: driverMobile } });
            if (!existingDriver) {
                throw new UnauthorizedException('Driver not found');
            }
            // console.log('this is driver mobile number', existingDriver);

            // console.log('existing driver id is here', existingDriver?.id);
            const existingTripSheet = await this.tripSheetRepo
                .createQueryBuilder('tripSheet')
                .leftJoinAndSelect('tripSheet.corporate', 'corporate')
                .leftJoinAndSelect('tripSheet.branch', 'branch')
                .leftJoinAndSelect('tripSheet.vehicle', 'vehicle')
                .leftJoinAndSelect('tripSheet.driver', 'driver')
                .where('driver.id = :driverId', { driverId: existingDriver?.id })
                .andWhere('tripSheet.tripStatus = :tripStatus', { tripStatus: TripSheetStatusEnum.CREATED })
                .andWhere('tripSheet.isActive = TRUE')
                .orderBy('tripSheet.id', 'DESC')
                .select([
                    'tripSheet',
                    'corporate.id',
                    'corporate.corporateCode',
                    'corporate.corporateName',
                    'branch.id',
                    'branch.branchCode',
                    'branch.name',
                    'vehicle.id',
                    'vehicle.vehicleNumber',
                    'vehicle.vehicleName',
                    'driver.id',
                    'driver.name',
                    'driver.mobileNumber'
                ])
                .getOne();

            // console.log('this is existing trip sheet1', existingTripSheet);

            if (existingTripSheet) {
                // console.log('this is existing trip sheet2', existingTripSheet);

                response = standardResponse(
                    true,
                    'exisiting trip sheet found',
                    200,
                    existingTripSheet,
                    null,
                    'tripsheet/newTripsheetApi'
                );
            } else {
                const cvdMappingDetails = await this.cvdMappingRepo
                    .createQueryBuilder('cvd')
                    .leftJoinAndSelect('cvd.corporate', 'corporate')
                    .leftJoinAndSelect('cvd.branch', 'branch')
                    .leftJoinAndSelect('cvd.vehicle', 'vehicle')
                    .where('cvd.driver=:driverId', { driverId: existingDriver.id })
                    .andWhere('cvd.isActive=TRUE')
                    .select([
                        'cvd.id',
                        'corporate.id',
                        'corporate.corporateCode',
                        'corporate.corporateName',
                        'branch.id',
                        'branch.branchCode',
                        'branch.name',
                        'vehicle.id',
                        'vehicle.vehicleNumber',
                        'vehicle.vehicleName'
                    ])
                    .getOne();
                // console.log('this is cvd mapping details', cvdMappingDetails);

                // create  new trip sheet with default null
                const currentDate = new Date();
                const newTripSheet = new TripSheet();
                (newTripSheet.corporate = cvdMappingDetails.corporate),
                    (newTripSheet.branch = cvdMappingDetails.branch),
                    (newTripSheet.vehicle = cvdMappingDetails.vehicle),
                    (newTripSheet.driver = existingDriver),
                    (newTripSheet.tripStatus = TripSheetStatusEnum.CREATED),
                    (newTripSheet.tripDate = currentDate),
                    (newTripSheet.createdAt = currentDate);
                const savedData = await this.tripSheetRepo.save(newTripSheet);
                // console.log('in trip sheet created', savedData);

                response = standardResponse(
                    true,
                    'exisiting trip sheet found',
                    200,
                    savedData,
                    null,
                    'tripsheet/newTripsheetApi'
                );
            }
        } catch (error) {
            console.log('-api- tripsheet/newTripsheetApi ', error.message);
            response = standardResponse(false, error.message, 500, null, null, 'tripsheet/newTripsheetApi');
        }

        return response;
    }

    // update new tripsheet
    async updateTripsheetApi(reqBody: any): Promise<any> {
        console.log("reqbody in update tripsheetapi", reqBody);
        console.log('api calling---------');

        try {
            const { tripSheetId, ...updates } = reqBody;

            if (!tripSheetId) {
                throw new BadRequestException('tripSheetId is required');
            }
            // console.log("here is ...update", updates);

            // Remove undefined/null fields
            const cleanData = Object.fromEntries(
                Object.entries(updates).filter(([_, v]) => v !== undefined && v !== null)
            );
            // console.log("here is clean data", cleanData);

            // Push to Redis queue (Bull/BullMQ)
            await this.tripQueue.add(
                'updateTrip',
                { tripSheetId, updates: cleanData, timestamp: Date.now() },
                {
                    jobId: `trip-${tripSheetId}`,
                    removeOnComplete: true,
                    removeOnFail: true
                }
            );

            return standardResponse(true, 'data queued for update', 201, null, null, 'tripsheet/updateTripsheetApi');
        } catch (error) {
            console.log('error in catch block -api- tripsheet/updateTripsheetApi ', error.message);
            return standardResponse(false, error.message, 500, null, null, 'tripsheet/updateTripsheetApi');
        }
    }

    // ⬆ Get or Create Trip Sheet
    async getTripSheetByMobile(reqBody: any) {
        try {
            const { mobileNumber, tripDate } = reqBody;

            const driver = await this.driverRepo.findOne({
                where: { mobileNumber }
            });

            if (!driver) {
                return standardResponse(false, 'Driver not found', 404);
            }

            // check if trip exists
            const existing = await this.tripSheetRepo.findOne({
                where: {
                    driver: { id: driver.id },
                    tripDate: tripDate
                },
                relations: ['status']
            });

            if (existing) {
                return standardResponse(true, 'Trip sheet fetched', 200, existing);
            }

            // Create NEW Trip Sheet
            const openStatus = await this.statusRepo.findOne({ where: { status: TripSheetStatusEnum.CREATED } });

            const newTrip = this.tripSheetRepo.create({
                driver,
                tripDate: tripDate,
                tripStatus: TripSheetStatusEnum.CREATED,
                isActive: true
            });

            const saved = await this.tripSheetRepo.save(newTrip);

            return standardResponse(true, 'New trip sheet created', 201, saved);
        } catch (err) {
            return standardResponse(false, err.message, 500);
        }
    }

    // ⬆ Save Trip Sheet (Partial)
    async saveTripSheet(id: number, body: any) {
        const trip = await this.tripSheetRepo.findOne({ where: { id } });
        if (!trip) return standardResponse(false, 'Trip not found', 404);

        await this.tripSheetRepo.update(id, body);

        return standardResponse(true, 'Trip sheet saved', 200);
    }

    // ⬆ Submit Trip Sheet → Status = SUBMITTED
    async submitTripSheet(id: number) {
        const submitted = await this.statusRepo.findOne({ where: { status: TripSheetStatusEnum.SUBMITTED } });

        await this.tripSheetRepo.update(id, { tripStatus: TripSheetStatusEnum.SUBMITTED });

        return standardResponse(true, 'Trip sheet submitted', 200);
    }

    // ⬆ Close Trip Sheet → Status = CLOSED
    async closeTripSheet(id: number) {
        const closed = await this.statusRepo.findOne({ where: { status: TripSheetStatusEnum.APPROVED } });

        await this.tripSheetRepo.update(id, { tripStatus: TripSheetStatusEnum.APPROVED });

        return standardResponse(true, 'Trip sheet closed', 200);
    }

    // ⬆ Reopen Trip Sheet → Status = OPEN
    async reopenTripSheet(id: number) {
        const openStatus = await this.statusRepo.findOne({ where: { status: TripSheetStatusEnum.CREATED } });

        await this.tripSheetRepo.update(id, { tripStatus: TripSheetStatusEnum.CREATED });

        return standardResponse(true, 'Trip sheet reopened', 200);
    }

    // ⬆ List trip sheets for driver
    async getTripsByDriver(driverId: number) {
        const trips = await this.tripSheetRepo.find({
            where: { driver: { id: driverId } },
            relations: ['status']
        });

        return standardResponse(true, 'Trips fetched', 200, trips);
    }
}
