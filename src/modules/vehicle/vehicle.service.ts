
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { LoggedInsUserService } from '@modules/auth/logged-ins-user.service';
import { Vehicle } from './entities/vehicle.entity';
import { standardResponse } from 'src/utils/helper/response.helper';
import { User } from '@modules/user/user.entity';
import { CvdMapping } from '@modules/cvd-mapping/enitites/cvd-mapping.entity';


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
    // async createVehicle(reqBody: any) {
    //     try {
    //         let user = await this.loggedInsUserService.getCurrentUser();
    //         if (!user) user = { id: 1 } as User;

    //         const newVehicle = this.vehicleRepo.create({
    //             ...reqBody,
    //             createdBy: { id: user.id } as any,
    //             updatedBy: { id: user.id } as any,
    //         });

    //         const saved = await this.vehicleRepo.save(newVehicle);
    //         return standardResponse(true, "Vehicle created successfully", 201, saved);

    //     } catch (error) {
    //         return standardResponse(false, error.message, 500);
    //     }
    // }
    async createVehicle(reqBody: any) {
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
    // async updateVehicle(id: number, reqBody: any) {
    //     let user = await this.loggedInsUserService.getCurrentUser();
    //     if (!user) user = { id: 1 } as User;

    //     const vehicle = await this.vehicleRepo.findOne({ where: { id } });
    //     if (!vehicle) return standardResponse(false, "Vehicle not found", 404);

    //     await this.vehicleRepo.update(id, {
    //         ...reqBody,
    //         updatedBy: { id: user.id } as any
    //     });

    //     const updated = await this.vehicleRepo.findOne({ where: { id } });

    //     return standardResponse(true, "Vehicle updated", 200, updated);
    // }
    //    async updateVehicle(id: number, reqBody: any) {
    //     const user = await this.loggedInsUserService.getCurrentUser();
    //     if (!user) return standardResponse(false, "User not logged in", 401);

    //     const vehicle = await this.vehicleRepo.findOne({ where: { id } });
    //     if (!vehicle) return standardResponse(false, "Vehicle not found", 404);

    //     const wasActive = vehicle.isActive;

    //     await this.vehicleRepo.update(id, {
    //         ...reqBody,
    //         updatedBy: { id: user.id } as any,
    //     });

    //     const updated = await this.vehicleRepo.findOne({ where: { id } });

    //     // ✅✅✅ CASCADE: VEHICLE → CVD
    //     if (wasActive === true && updated?.isActive === false) {
    //         await this.cvdRepo.update(
    //             { vehicle: { id } },
    //             { isActive: false }
    //         );
    //     }

    //     return standardResponse(true, "Vehicle updated", 200, updated);
    // }
    async updateVehicle(id: number, reqBody: any) {
        const user = await this.loggedInsUserService.getCurrentUser();
        if (!user) return standardResponse(false, "User not logged in", 401);

        const vehicle = await this.vehicleRepo.findOne({ where: { id } });
        if (!vehicle) return standardResponse(false, "Vehicle not found", 404);

        const wasActive = vehicle.isActive;

        // ✅✅✅ FORCE BOOLEAN (CRITICAL)
        if (reqBody.isActive !== undefined) {
            reqBody.isActive =
                reqBody.isActive === true || reqBody.isActive === 'true';
        }

        console.log('BACKEND UPDATE PAYLOAD:', reqBody); // ✅ TEMP DEBUG

        await this.vehicleRepo.update(id, {
            ...reqBody,
            updatedBy: { id: user.id } as any,
        });

        const updated = await this.vehicleRepo.findOne({ where: { id } });

        // ✅✅✅ CASCADE: VEHICLE → CVD
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
    // async changeStatus(id: number, status: boolean) {
    //     const vehicle = await this.vehicleRepo.findOne({ where: { id } });
    //     if (!vehicle) return standardResponse(false, "Vehicle not found", 404);

    //     await this.vehicleRepo.update(id, { isActive: status });

    //     return standardResponse(
    //         true,
    //         `Vehicle ${status ? 'activated' : 'deactivated'}`,
    //         200
    //     );
    // }
    async changeStatus(id: number, status: boolean) {
        const user = await this.loggedInsUserService.getCurrentUser();
        if (!user) return standardResponse(false, "User not logged in", 401);

        const vehicle = await this.vehicleRepo.findOne({ where: { id } });
        if (!vehicle) return standardResponse(false, "Vehicle not found", 404);

        await this.vehicleRepo.update(id, {
            isActive: status,
            updatedBy: { id: user.id } as any, // ✅ VERY IMPORTANT
        });

        // ✅✅✅ CASCADE: if vehicle becomes INACTIVE → disable CVD
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


}
