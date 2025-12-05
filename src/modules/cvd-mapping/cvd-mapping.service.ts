
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


    // async createMapping(body: any) {
    //     try {
    //         const user = await this.loggedInsUserService.getCurrentUser();
    //         if (!user) return standardResponse(false, "User not logged in", 401);

    //         const { corporateId, branchId, vehicleId, driverId } = body;

    //         const corporate = await this.corporateRepo.findOne({ where: { id: corporateId } });
    //         if (!corporate) return standardResponse(false, "Corporate not found", 404);

    //         const branch = await this.branchRepo.findOne({ where: { id: branchId } });
    //         if (!branch) return standardResponse(false, "Branch not found", 404);

    //         const vehicle = await this.vehicleRepo.findOne({ where: { id: vehicleId } });
    //         if (!vehicle) return standardResponse(false, "Vehicle not found", 404);

    //         const driver = await this.driverRepo.findOne({ where: { id: driverId } });
    //         if (!driver) return standardResponse(false, "Driver not found", 404);


    //         // 🚫 RULE A: vehicle must be free

    //         // VEHICLE MUST BE FREE
    //         const activeVehicle = await this.cvdRepo.findOne({
    //             where: { corporate, isActive: true }
    //         });
    //         if (activeVehicle) {
    //             return standardResponse(false, "Vehicle already linked to a driver/branch", 400);
    //         }

    //         // DRIVER MUST BE FREE
    //         const activeDriver = await this.cvdRepo.findOne({
    //             where: { driver, isActive: true }
    //         });
    //         if (activeDriver) {
    //             return standardResponse(false, "Driver already linked to a vehicle/branch", 400);
    //         }


    //         const newMapping = this.cvdRepo.create({
    //             corporate,
    //             branch,
    //             vehicle,
    //             driver,
    //             isActive: true,
    //             createdBy: user,
    //             updatedBy: user,
    //         });



    //         const saved = await this.cvdRepo.save(newMapping);

    //         return standardResponse(true, "CVD mapping created successfully", 201, saved);

    //     } catch (err) {
    //         return standardResponse(false, err.message, 500);
    //     }
    // }


    // ➤ LIST ALL MAPPINGS
    async createMapping(body: any) {
        try {
            const user = await this.loggedInsUserService.getCurrentUser();
            if (!user) return standardResponse(false, "User not logged in", 401);

            const { corporateId, branchId, vehicleId, driverId } = body;

            // === Fetch Entities ===
            const corporate = await this.corporateRepo.findOne({ where: { id: corporateId } });
            if (!corporate) return standardResponse(false, "Corporate not found", 404);

            const branch = await this.branchRepo.findOne({ where: { id: branchId } });
            if (!branch) return standardResponse(false, "Branch not found", 404);

            const vehicle = await this.vehicleRepo.findOne({ where: { id: vehicleId } });
            if (!vehicle) return standardResponse(false, "Vehicle not found", 404);

            const driver = await this.driverRepo.findOne({ where: { id: driverId } });
            if (!driver) return standardResponse(false, "Driver not found", 404);


            // ============================================================
            // RULE A : VEHICLE MUST BE FREE
            // ============================================================
            const activeVehicle = await this.cvdRepo.findOne({
                where: {
                    vehicle: { id: vehicleId },
                    isActive: true
                }
            });

            if (activeVehicle) {
                return standardResponse(
                    false,
                    "This vehicle is already linked to a driver/branch",
                    400
                );
            }


            // ============================================================
            // RULE B : DRIVER MUST BE FREE
            // ============================================================
            const activeDriver = await this.cvdRepo.findOne({
                where: {
                    driver: { id: driverId },
                    isActive: true
                }
            });

            if (activeDriver) {
                return standardResponse(
                    false,
                    "This driver is already linked to another vehicle/branch",
                    400
                );
            }


            // ============================================================
            // CREATE NEW MAPPING
            // ============================================================
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


            return standardResponse(
                true,
                "CVD mapping created successfully",
                201,
                saved
            );


        } catch (err) {
            console.log("ERR:", err);
            return standardResponse(false, err.message, 500);
        }
    }

    async listMappings() {
        const data = await this.cvdRepo.find({
            relations: ['corporate', 'branch', 'vehicle', 'driver', 'createdBy', 'updatedBy']
        });
        console.log("in list api-------", data);
        return standardResponse(true, 'List fetched', 200, data);
    }

    // ➤ GET BY CORPORATE
    async getByCorporate(id: number) {
        const data = await this.cvdRepo.find({
            where: { corporate: { id } },
            relations: ['corporate', 'branch', 'vehicle', 'driver']
        });
        return standardResponse(true, 'Data fetched', 200, data);
    }

    // ➤ GET BY VEHICLE
    async getByVehicle(id: number) {
        const data = await this.cvdRepo.find({
            where: { vehicle: { id } },
            relations: ['corporate', 'branch', 'vehicle', 'driver']
        });
        return standardResponse(true, 'Data fetched', 200, data);
    }

    // ➤ GET BY DRIVER
    async getByDriver(id: number) {
        const data = await this.cvdRepo.find({
            where: { driver: { id } },
            relations: ['corporate', 'branch', 'vehicle', 'driver']
        });
        return standardResponse(true, 'Data fetched', 200, data);
    }

   
    async updateMapping(id: number, body: any) {
        let mapping = await this.cvdRepo.findOne({ where: { id } });
        if (!mapping) return standardResponse(false, 'Mapping not found', 404);

        const updatePayload: any = {};

        if (body.corporateId)
            updatePayload.corporate = { id: body.corporateId };

        if (body.branchId)
            updatePayload.branch = { id: body.branchId };

        if (body.vehicleId)
            updatePayload.vehicle = { id: body.vehicleId };

        if (body.driverId)
            updatePayload.driver = { id: body.driverId };

        if (body.isActive !== undefined)
            updatePayload.isActive = body.isActive;

        await this.cvdRepo.update(id, updatePayload);

        const updated = await this.cvdRepo.findOne({
            where: { id },
            relations: ['corporate', 'branch', 'vehicle', 'driver']
        });

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
