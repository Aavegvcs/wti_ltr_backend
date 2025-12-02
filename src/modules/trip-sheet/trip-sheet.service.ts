import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
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
import { TripSheetHistory } from './entities/trip-sheet-history.entity';

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

        @InjectRepository(TripSheetHistory)
        private readonly tripSheetHistoryRepo: Repository<TripSheetHistory>,

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

                return standardResponse(
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

                return standardResponse(
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
            return standardResponse(false, error.message, 500, null, null, 'tripsheet/newTripsheetApi');
        }
    }

    // update new tripsheet for driver
    async updateTripsheetByDriver(reqBody: any): Promise<any> {
        console.log('reqbody in update tripsheetapi', reqBody);
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

    // update trip sheet by corporate admin
    async updateTripSheetByAdmin(reqBody: any): Promise<any> {
        try {
            const userEntity = await this.loggedInsUserService.getCurrentUser();
            if (!userEntity) throw new NotFoundException('Logged user not found');
            const { tripSheetId } = reqBody;
            const tripData = await this.tripSheetRepo
                .createQueryBuilder('tripSheet')
                .where('tripSheet.id = :tripSheetId', { tripSheetId: tripSheetId })
                .getOne();
            if (!tripData) {
                throw new NotFoundException('Trip sheet not found');
            }
            const fields = [
                'id',
                'tripDate',
                'startTime',
                'endTime',
                'startOdometer',
                'endOdometer',
                'totalKm',
                'sourceName',
                'destinationName',
                'documents',
                'isActive',
                'updatedAt'
            ];
            const updateObject: any = {};
            fields.forEach((f) => {
                if (reqBody[f] !== undefined) {
                    updateObject[f] = reqBody[f];
                }
            });

            updateObject.id = reqBody.tripSheetId;
            updateObject.isEdited = true;

            // STEP 3: Save updated trip
            const updatedTripSheet = await this.tripSheetRepo.save(updateObject);

            const oldValues: Record<string, any> = {};
            const newValues: Record<string, any> = {};

            if (updatedTripSheet) {
                fields.forEach((field) => {
                    oldValues[field] = tripData[field]; // old value from DB
                    newValues[field] = updatedTripSheet[field]; // new value from request
                });
            }
            // console.log('old  values', oldValues);
            // console.log(' new values', newValues);

            const tripSheetHistoryUpdateObj: any = {};
            if (tripData.isEdited) {
                tripSheetHistoryUpdateObj.newValues = newValues;
                tripSheetHistoryUpdateObj.changedBy = userEntity.id;
                tripSheetHistoryUpdateObj.changedAt = new Date();
            } else {
                tripSheetHistoryUpdateObj.newValues = newValues;
                tripSheetHistoryUpdateObj.oldValues = oldValues;
                tripSheetHistoryUpdateObj.changedBy = userEntity.id;
                tripSheetHistoryUpdateObj.changedAt = new Date();
            }
            // console.log('tripSheetHistoryUpdateObj', tripSheetHistoryUpdateObj);

            const existingHistory = await this.tripSheetHistoryRepo.findOne({
                where: { tripSheet: { id: tripSheetId } }
            });

            let updatedHistory;

            if (existingHistory) {
                // UPDATE existing row
                updatedHistory = await this.tripSheetHistoryRepo.save({
                    id: existingHistory.id, // important!
                    ...tripSheetHistoryUpdateObj
                });
            } else {
                // CREATE new row
                updatedHistory = await this.tripSheetHistoryRepo.save({
                    tripSheet: { id: tripSheetId },
                    ...tripSheetHistoryUpdateObj
                });
            }

            return standardResponse(
                true,
                'Trip sheet updated successfully',
                200,
                null,
                null,
                'tripsheet/updateTripSheetByAdmin'
            );
        } catch (error) {
            console.log('-api- tripsheet/updateTripSheetByAdmin ', error.message);
            return standardResponse(false, error.message, 500, null, null, 'tripsheet/updateTripSheetByAdmin');
        }
    }

    // update trip sheet status(approve/reject) by corporate admin
    async updateStatusByAdmin(reqBody: any): Promise<any> {
        try {
            const { tripSheetId, tripStatus } = reqBody;
            const userEntity = await this.loggedInsUserService.getCurrentUser();
            if (!userEntity) throw new NotFoundException('Logged user not found');

            const tripData = await this.tripSheetRepo
                .createQueryBuilder('tripSheet')
                .where('tripSheet.id = :tripSheetId', { tripSheetId: tripSheetId })
                .getOne();
            if (!tripData) {
                throw new NotFoundException('Trip sheet not found');
            }

            tripData.tripStatus = tripStatus;
            tripData.updatedBy = userEntity;
            tripData.updatedAt = new Date();
            // STEP 3: Save updated trip
            const updatedTripSheet = await this.tripSheetRepo.save(tripData);

            return standardResponse(
                true,
                'Trip sheet updated successfully',
                200,
                null,
                null,
                'tripsheet/updateStatusByAdmin'
            );
        } catch (error) {
            console.log('-api- tripsheet/updateStatusByAdmin ', error.message);
            return standardResponse(false, error.message, 500, null, null, 'tripsheet/updateStatusByAdmin');
        }
    }
    // get trip sheet api for corporate admin
    async getTripSheetForAdmin(reqBody: any): Promise<any> {
        const userEntity = await this.loggedInsUserService.getCurrentUser();
        // console.log("in get trip sheet api entity is ", userEntity);

        if (!userEntity) {
            throw new NotFoundException('Logged user not found');
        }
        const page = reqBody.page ? Number(reqBody.page) : 1;
        const limit = reqBody.limit ? Number(reqBody.limit) : 10;
        const skip = (page - 1) * limit;

        const fromDate = reqBody.fromDate ? new Date(reqBody.fromDate) : null;
        const toDate = reqBody.toDate ? new Date(reqBody.toDate) : null;
        console.log('reqBody', reqBody, userEntity?.id, userEntity?.branch?.id);

        const qb = this.tripSheetRepo
            .createQueryBuilder('tripSheet')
            .leftJoinAndSelect('tripSheet.corporate', 'corporate')
            .leftJoinAndSelect('tripSheet.branch', 'branch')
            .leftJoinAndSelect('tripSheet.vehicle', 'vehicle')
            .leftJoinAndSelect('tripSheet.driver', 'driver')
            .where('branch.id = :branchId', { branchId: userEntity?.branch?.id })
            .andWhere('tripSheet.isActive = TRUE');

        if (fromDate && toDate) {
            qb.andWhere('tripSheet.createdAt >= :from', { from: fromDate }).andWhere('tripSheet.createdAt <= :to', {
                to: toDate
            });
        } else if (fromDate) {
            qb.andWhere('tripSheet.createdAt >= :from', { from: fromDate });
        } else if (toDate) {
            qb.andWhere('tripSheet.createdAt <= :to', { to: toDate });
        }

        qb.orderBy('tripSheet.id', 'DESC')
            .skip(skip)
            .take(limit)
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
            ]);

        const [tripSheets, total] = await qb.getManyAndCount();

        if (!tripSheets || tripSheets.length === 0) {
            return standardResponse(false, 'no trip sheet found', 404, null, null, 'tripsheet/getTripSheetForAdmin');
        }

        const tripIds = tripSheets.map((t) => t.id);
        const historyRows = await this.tripSheetHistoryRepo
            .createQueryBuilder('history')
            .leftJoinAndSelect('history.changedBy', 'changedBy')
            .leftJoinAndSelect('history.tripSheet', 'ts')
            .where('history.tripSheet IN (:...tripIds)', { tripIds })
            .orderBy('history.id', 'DESC')
            .select([
                'history.oldValues',
                'history.newValues',
                'changedBy.id',
                'changedBy.userCode',
                'changedBy.firstName',
                'ts.id'
            ])
            .getMany();

        // Map history to each trip
        const historyMap: Record<number, any[]> = {};
        historyRows.forEach((h) => {
            const tsId = h.tripSheet?.id; // <-- correct way
            if (!tsId) return;

            if (!historyMap[tsId]) historyMap[tsId] = [];
            historyMap[tsId].push(h);
        });

        // Attach edits to each trip sheet
        const finalData = tripSheets.map((ts) => ({
            ...ts,
            edits: historyMap[ts.id] ?? []
        }));

        return standardResponse(
            true,
            'Trip sheets fetched successfully',
            200,
            {
                items: finalData,
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
                filtersUsed: {
                    fromDate: fromDate || null,
                    toDate: toDate || null
                }
            },
            null,
            'tripsheet/getTripSheetForAdmin'
        );
    }

    // get trip sheet api for wti operations team
    async getTripSheetForOperations(reqBody: any): Promise<any> {
        try {
            console.log('req body');
            const userEntity = await this.loggedInsUserService.getCurrentUser();
            if (!userEntity) {
                throw new NotFoundException('Logged user not found');
            }
            const { isApiForReport, page, limit, fromDate, toDate, corporateId, branchId } = reqBody;

            const apiForReport = isApiForReport === true;

            // Pagination (only when NOT report)
            const ipage = page ? Number(page) : 1;
            const ilimit = limit ? Number(limit) : 10;
            const iskip = (page - 1) * limit;

            const ifromDate = fromDate ? new Date(fromDate) : null;
            const itoDate = toDate ? new Date(toDate) : null;

            const qb = this.tripSheetRepo
                .createQueryBuilder('tripSheet')
                .leftJoinAndSelect('tripSheet.corporate', 'corporate')
                .leftJoinAndSelect('tripSheet.branch', 'branch')
                .leftJoinAndSelect('tripSheet.vehicle', 'vehicle')
                .leftJoinAndSelect('tripSheet.driver', 'driver')
                .where('corporate.id = :corporateId', { corporateId: corporateId })
                .andWhere('tripSheet.isActive = TRUE');
            if (branchId !== 0) {
                qb.andWhere('branch.id = :branchId', { branchId });
            }

            // Date Filters
            if (ifromDate) {
                qb.andWhere('tripSheet.createdAt >= :from', { from: ifromDate });
            }
            if (itoDate) {
                qb.andWhere('tripSheet.createdAt <= :to', { to: itoDate });
            }

            qb.orderBy('tripSheet.id', 'DESC').select([
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
            ]);

            //  Apply pagination ONLY if apiForReport is false
            if (!apiForReport) {
                qb.skip(iskip).take(ilimit);
            }

            const [tripSheets, total] = await qb.getManyAndCount();

            if (!tripSheets.length) {
                return standardResponse(
                    false,
                    'no trip sheet found',
                    404,
                    null,
                    null,
                    'tripsheet/getTripSheetForOperations'
                );
            }

            // Fetch all history tied to these trip IDs
            const tripIds = tripSheets.map((t) => t.id);

            const historyRows = await this.tripSheetHistoryRepo
                .createQueryBuilder('history')
                .leftJoinAndSelect('history.changedBy', 'changedBy')
                .leftJoinAndSelect('history.tripSheet', 'ts')
                .where('history.tripSheet IN (:...tripIds)', { tripIds })
                .orderBy('history.id', 'DESC')
                .select([
                    'history.oldValues',
                    'history.newValues',
                    'changedBy.id',
                    'changedBy.userCode',
                    'changedBy.firstName',
                    'ts.id'
                ])
                .getMany();

            // Map history to trip sheets
            const historyMap: Record<number, any[]> = {};
            historyRows.forEach((h) => {
                const tsId = h.tripSheet?.id;
                if (!tsId) return;
                if (!historyMap[tsId]) historyMap[tsId] = [];
                historyMap[tsId].push(h);
            });

            const finalData = tripSheets.map((ts) => ({
                ...ts,
                edits: historyMap[ts.id] ?? []
            }));

            return standardResponse(
                true,
                'Trip sheets fetched successfully',
                200,
                {
                    items: finalData,
                    total,
                    page: apiForReport ? null : ipage,
                    limit: apiForReport ? null : ilimit,
                    totalPages: apiForReport ? null : Math.ceil(total / ilimit),
                    filtersUsed: {
                        fromDate: ifromDate || null,
                        toDate: itoDate || null
                    }
                },
                null,
                'tripsheet/getTripSheetForOperations'
            );
        } catch (error) {
            console.log('-api- tripsheet/getTripSheetForOperations ', error.message);
            return standardResponse(false, error.message, 500, null, null, 'tripsheet/getTripSheetForOperations');
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
