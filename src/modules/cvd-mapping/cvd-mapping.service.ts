
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


    // ➤ LIST ALL MAPPINGS

    async createMapping(body: any) {
        try {
            const user = await this.loggedInsUserService.getCurrentUser();
            if (!user) return standardResponse(false, "User not logged in", 401);

            const { corporateId, branchId, vehicleId, driverId } = body;

            // === Fetch Entities ===
            const corporate = await this.corporateRepo.findOne({ where: { id: corporateId } });
            if (!corporate) return standardResponse(false, "Corporate not found", 404);
            if (!corporate.isActive)
                return standardResponse(false, "Corporate is inactive", 400);

            const branch = await this.branchRepo.findOne({ where: { id: branchId } });
            if (!branch) return standardResponse(false, "Branch not found", 404);
            if (!branch.isActive)
                return standardResponse(false, "Branch is inactive", 400);

            const vehicle = await this.vehicleRepo.findOne({ where: { id: vehicleId } });
            if (!vehicle) return standardResponse(false, "Vehicle not found", 404);
            if (!vehicle.isActive)
                return standardResponse(false, "Vehicle is inactive", 400);

            const driver = await this.driverRepo.findOne({ where: { id: driverId } });
            if (!driver) return standardResponse(false, "Driver not found", 404);
            if (!driver.isActive)
                return standardResponse(false, "Driver is inactive", 400);

            // ============================================================
            // RULE A : VEHICLE MUST BE FREE
            // ============================================================
            const activeVehicle = await this.cvdRepo.findOne({
                where: { vehicle: { id: vehicleId }, isActive: true }
            });

            if (activeVehicle) {
                return standardResponse(false, "This vehicle is already linked", 400);
            }

            // ============================================================
            // RULE B : DRIVER MUST BE FREE
            // ============================================================
            const activeDriver = await this.cvdRepo.findOne({
                where: { driver: { id: driverId }, isActive: true }
            });

            if (activeDriver) {
                return standardResponse(false, "This driver is already linked", 400);
            }

            // ============================================================
            // ✅ CREATE MAPPING (SAFE)
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

            return standardResponse(true, "CVD mapping created successfully", 201, saved);

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
        let mapping = await this.cvdRepo.findOne({
            where: { id },
            relations: ['corporate', 'branch', 'vehicle', 'driver']
        });

        if (!mapping) return standardResponse(false, 'Mapping not found', 404);

        const updatePayload: any = {};

        // ============================================================
        // ✅ VALIDATE BEFORE UPDATING
        // ============================================================

        if (body.corporateId) {
            const corporate = await this.corporateRepo.findOne({ where: { id: body.corporateId } });
            if (!corporate) return standardResponse(false, "Corporate not found", 404);
            if (!corporate.isActive)
                return standardResponse(false, "Corporate is inactive", 400);

            updatePayload.corporate = { id: body.corporateId };
        }

        if (body.branchId) {
            const branch = await this.branchRepo.findOne({ where: { id: body.branchId } });
            if (!branch) return standardResponse(false, "Branch not found", 404);
            if (!branch.isActive)
                return standardResponse(false, "Branch is inactive", 400);

            updatePayload.branch = { id: body.branchId };
        }

        if (body.vehicleId) {
            const vehicle = await this.vehicleRepo.findOne({ where: { id: body.vehicleId } });
            if (!vehicle) return standardResponse(false, "Vehicle not found", 404);
            if (!vehicle.isActive)
                return standardResponse(false, "Vehicle is inactive", 400);

            // ✅ Free vehicle rule
            const activeVehicle = await this.cvdRepo.findOne({
                where: { vehicle: { id: body.vehicleId }, isActive: true }
            });
            if (activeVehicle && activeVehicle.id !== id)
                return standardResponse(false, "Vehicle already in use", 400);

            updatePayload.vehicle = { id: body.vehicleId };
        }

        if (body.driverId) {
            const driver = await this.driverRepo.findOne({ where: { id: body.driverId } });
            if (!driver) return standardResponse(false, "Driver not found", 404);
            if (!driver.isActive)
                return standardResponse(false, "Driver is inactive", 400);

            // ✅ Free driver rule
            const activeDriver = await this.cvdRepo.findOne({
                where: { driver: { id: body.driverId }, isActive: true }
            });
            if (activeDriver && activeDriver.id !== id)
                return standardResponse(false, "Driver already in use", 400);

            updatePayload.driver = { id: body.driverId };
        }

        // if (body.isActive !== undefined) {
        //     // ✅ HARD BLOCK if any parent is inactive
        //     if (
        //         !mapping.corporate?.isActive ||
        //         !mapping.branch?.isActive ||
        //         !mapping.vehicle?.isActive ||
        //         !mapping.driver?.isActive
        //     ) {
        //         return standardResponse(
        //             false,
        //             "Cannot activate mapping while parent is inactive",
        //             400
        //         );
        //     }

        //     updatePayload.isActive = body.isActive;
        // }
        if (body.isActive !== undefined) {
            if (
                !mapping.corporate?.isActive ||
                !mapping.branch?.isActive ||
                !mapping.vehicle?.isActive ||
                !mapping.driver?.isActive
            ) {
                let reason = [];

                if (!mapping.corporate?.isActive)
                    reason.push(`Corporate "${mapping.corporate.corporateName}"`);
                if (!mapping.branch?.isActive)
                    reason.push(`Branch "${mapping.branch.name}"`);
                if (!mapping.vehicle?.isActive)
                    reason.push(`Vehicle "${mapping.vehicle.vehicleNumber}"`);
                if (!mapping.driver?.isActive)
                    reason.push(`Driver "${mapping.driver.name}"`);

                return standardResponse(
                    false,
                    `Cannot activate mapping because the following are inactive: ${reason.join(', ')}`,
                    400
                );
            }

            updatePayload.isActive = body.isActive;
        }


        await this.cvdRepo.update(id, updatePayload);

        const updated = await this.cvdRepo.findOne({
            where: { id },
            relations: ['corporate', 'branch', 'vehicle', 'driver']
        });

        return standardResponse(true, 'Mapping updated', 200, updated);
    }


    // ➤ CHANGE STATUS

    async changeStatus(id: number, status: boolean) {
        let mapping = await this.cvdRepo.findOne({
            where: { id },
            relations: ['corporate', 'branch', 'vehicle', 'driver']
        });

        if (!mapping) return standardResponse(false, 'Mapping not found', 404);

        // ✅ BLOCK ACTIVATION IF ANY PARENT IS INACTIVE
        // if (status === true) {
        //     if (
        //         !mapping.corporate?.isActive ||
        //         !mapping.branch?.isActive ||
        //         !mapping.vehicle?.isActive ||
        //         !mapping.driver?.isActive
        //     ) {
        //         return standardResponse(
        //             false,
        //             "Cannot activate mapping while any parent is inactive",
        //             400
        //         );
        //     }
        // }
        if (status === true) {
            let reason = [];

            if (!mapping.corporate?.isActive)
                reason.push(`Corporate "${mapping.corporate.corporateName}"`);
            if (!mapping.branch?.isActive)
                reason.push(`Branch "${mapping.branch.name}"`);
            if (!mapping.vehicle?.isActive)
                reason.push(`Vehicle "${mapping.vehicle.vehicleNumber}"`);
            if (!mapping.driver?.isActive)
                reason.push(`Driver "${mapping.driver.name}"`);

            if (reason.length > 0) {
                return standardResponse(
                    false,
                    `Cannot activate mapping because the following are inactive: ${reason.join(', ')}`,
                    400
                );
            }
        }


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
