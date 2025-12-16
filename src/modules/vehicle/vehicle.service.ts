
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { LoggedInsUserService } from '@modules/auth/logged-ins-user.service';
import { Vehicle } from './entities/vehicle.entity';
import { standardResponse } from 'src/utils/helper/response.helper';
import { User } from '@modules/user/user.entity';
import { CvdMapping } from '@modules/cvd-mapping/enitites/cvd-mapping.entity';
import { In } from 'typeorm';


@Injectable()
export class VehicleService {
    constructor(
        @InjectRepository(Vehicle)
        private readonly vehicleRepo: Repository<Vehicle>,
        @InjectRepository(CvdMapping)
        private readonly cvdRepo: Repository<CvdMapping>,
        private readonly loggedInsUserService: LoggedInsUserService,
    ) { }

    // ➤ CREATE VEHICLE

    async createVehicle(reqBody: any) {
        console.log("🔥 BACKEND RECEIVED BODY:", reqBody);
        try {
            const user = await this.loggedInsUserService.getCurrentUser();
            if (!user) return standardResponse(false, "User not logged in", 401);

            const newVehicle = this.vehicleRepo.create({
                ...reqBody,
                createdBy: { id: user.id } as any,
                updatedBy: { id: user.id } as any,
            });

            const saved = await this.vehicleRepo.save(newVehicle);

            return standardResponse(true, "Vehicle created successfully", 201, saved);
        } catch (error) {
            return standardResponse(false, error.message, 500);
        }
    }


    // ➤ GET ALL VEHICLES
    async getAllVehicles(page = 1, limit = 10, search?: string) {
        const skip = (page - 1) * limit;

        const whereClause = search
            ? [
                { vehicleNumber: Like(`%${search}%`) },
                { vehicleName: Like(`%${search}%`) }
            ]
            : {};

        const [data, count] = await this.vehicleRepo.findAndCount({
            where: whereClause,
            skip,
            take: limit,
            relations: ['createdBy', 'updatedBy']
        });

        return standardResponse(true, "Vehicle list fetched", 200, {
            data,
            total: count,
            page,
            limit
        });
    }

    // ➤ GET VEHICLE BY VEHICLE NUMBER
    async getVehicleByNumber(vehicleNumber: string) {
        const vehicle = await this.vehicleRepo.findOne({
            where: { vehicleNumber },
            relations: ['createdBy', 'updatedBy']
        });

        if (!vehicle) return standardResponse(false, "Vehicle not found", 404);
        return standardResponse(true, "Vehicle fetched", 200, vehicle);
    }

    // ➤ UPDATE VEHICLE


    async updateVehicle(id: number, reqBody: any) {
        // console.log("🔥 BACKEND RECEIVED BODY:", reqBody);
        const user = await this.loggedInsUserService.getCurrentUser();
        // console.log("here user details", user);

        if (!user) return standardResponse(false, "User not logged in", 401);
        // console.log("🔥 BACKEND RECEIVED BODY22:", reqBody);
        const vehicle = await this.vehicleRepo.findOne({ where: { id } });
        if (!vehicle) return standardResponse(false, "Vehicle not found", 404);

        const wasActive = vehicle.isActive;

        // FORCE BOOLEAN (CRITICAL)
        if (reqBody.isActive !== undefined) {
            reqBody.isActive =
                reqBody.isActive === true || reqBody.isActive === 'true';
        }

        console.log('BACKEND  vehicle UPDATE PAYLOAD:', reqBody);


        await this.vehicleRepo.save({
            id,
            ...reqBody,
            updatedBy: { id: user.id } as any,
        });


        const updated = await this.vehicleRepo.findOne({ where: { id } });

        // CASCADE: VEHICLE → CVD
        if (wasActive === true && updated?.isActive === false) {
            await this.cvdRepo.update(
                { vehicle: { id } },
                { isActive: false }
            );
        }

        return standardResponse(true, "Vehicle updated", 200, updated);
    }




    // ➤ SOFT DELETE VEHICLE
    async deleteVehicle(id: number) {
        const vehicle = await this.vehicleRepo.findOne({ where: { id } });
        if (!vehicle) return standardResponse(false, "Vehicle not found", 404);

        await this.vehicleRepo.softDelete(id);
        return standardResponse(true, "Vehicle deleted", 200);
    }

    // ➤ CHANGE ACTIVE STATUS

    async changeStatus(id: number, status: boolean) {
        const user = await this.loggedInsUserService.getCurrentUser();
        if (!user) return standardResponse(false, "User not logged in", 401);

        const vehicle = await this.vehicleRepo.findOne({ where: { id } });
        if (!vehicle) return standardResponse(false, "Vehicle not found", 404);

        await this.vehicleRepo.update(id, {
            isActive: status,
            updatedBy: { id: user.id } as any, // ✅ VERY IMPORTANT
        });

        //  CASCADE: if vehicle becomes INACTIVE → disable CVD
        if (status === false) {
            await this.cvdRepo.update(
                { vehicle: { id } },
                { isActive: false }
            );
        }

        return standardResponse(
            true,
            `Vehicle ${status ? 'activated' : 'deactivated'}`,
            200
        );
    }
    // ➤ BULK UPLOAD VEHICLES
    async bulkUpload(reqBody: any) {
        try {
            const user = await this.loggedInsUserService.getCurrentUser();
            if (!user) return standardResponse(false, "User not logged in", 401);

            const data = reqBody.data || [];
            const startIndex = typeof reqBody.startIndex === "number" ? reqBody.startIndex : 1;

            const failed: { index: number; name: string; reason: string }[] = [];

            if (!Array.isArray(data) || data.length === 0) {
                return standardResponse(true, "No data provided", 404, {
                    successCount: 0,
                    failedCount: 0,
                    failed: [],
                });
            }

            const headerOffset = 1;
            const uniqueData: any[] = [];

            // ----------------------------------------------
            // 1️⃣ CHECK DUPLICATES INSIDE EXCEL FILE
            // ----------------------------------------------
            const seenInExcel = new Set<string>();

            data.forEach((item: any, idx: number) => {
                const rowIndex = startIndex + idx + headerOffset;
                const vehicleNumber = (item.vehicleNumber || "").trim().toUpperCase();

                if (!vehicleNumber) {
                    failed.push({ index: rowIndex, name: "Unknown", reason: "Vehicle number missing" });
                    return;
                }

                if (seenInExcel.has(vehicleNumber)) {
                    failed.push({
                        index: rowIndex,
                        name: vehicleNumber,
                        reason: `Duplicate entry in Excel: '${vehicleNumber}'`,
                    });
                    return;
                }

                seenInExcel.add(vehicleNumber);

                uniqueData.push({
                    _rowIndex: rowIndex,
                    vehicleNumber,
                    vehicleName: item.vehicleName || "",
                    vehicleModel: item.vehicleModel || "",
                    documents: item.documents || null,
                });
            });

            if (uniqueData.length === 0) {
                return standardResponse(true, "No valid vehicle records to insert", 200, {
                    successCount: 0,
                    failedCount: failed.length,
                    failed,
                });
            }

            // ----------------------------------------------
            // 2️⃣ CHECK DUPLICATES IN DATABASE
            // ----------------------------------------------
            const incomingVehicleNumbers = uniqueData.map((v) => v.vehicleNumber);

            const existing = await this.vehicleRepo.find({
                where: { vehicleNumber: In(incomingVehicleNumbers) },
                select: ["vehicleNumber"],
            });

            const dbDuplicates = new Set(existing.map((v) => v.vehicleNumber.toUpperCase()));

            uniqueData.forEach((item) => {
                if (dbDuplicates.has(item.vehicleNumber)) {
                    failed.push({
                        index: item._rowIndex,
                        name: item.vehicleNumber,
                        reason: `Vehicle '${item.vehicleNumber}' already exists in database`,
                    });
                }
            });

            // Filter out items that should NOT be inserted
            const validToInsert = uniqueData.filter(
                (item) => !dbDuplicates.has(item.vehicleNumber)
            );

            if (validToInsert.length === 0) {
                return standardResponse(true, "All records are duplicates, nothing inserted", 200, {
                    successCount: 0,
                    failedCount: failed.length,
                    failed,
                });
            }

            // ----------------------------------------------
            // 3️⃣ INSERT VALID VEHICLES
            // ----------------------------------------------
            let successCount = 0;

            await this.vehicleRepo.manager.transaction(async (manager) => {
                const vehicleRepoTx = manager.getRepository(Vehicle);

                for (const row of validToInsert) {
                    try {
                        const newVehicle = vehicleRepoTx.create({
                            vehicleNumber: row.vehicleNumber,
                            vehicleName: row.vehicleName,
                            vehicleModel: row.vehicleModel,
                            documents: row.documents,
                            createdBy: { id: user.id } as any,
                            updatedBy: { id: user.id } as any,
                        });

                        await vehicleRepoTx.save(newVehicle);
                        successCount++;
                    } catch (err: any) {
                        failed.push({
                            index: row._rowIndex,
                            name: row.vehicleNumber,
                            reason: err?.message || "Error saving vehicle",
                        });
                    }
                }
            });

            const failedCount = failed.length;
            let message = "Bulk upload completed";

            if (successCount > 0 && failedCount > 0) message = "Bulk upload partially successful";
            if (successCount === 0 && failedCount > 0) message = "Bulk upload failed";

            return standardResponse(true, message, 202, {
                successCount,
                failedCount,
                failed,
            });

        } catch (error: any) {
            return standardResponse(false, "Unexpected server error", 500, {
                successCount: 0,
                failedCount: 0,
                failed: [{ index: 0, name: "System", reason: error.message }],
            });
        }
    }


}
