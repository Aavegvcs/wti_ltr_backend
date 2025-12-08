
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { LoggedInsUserService } from '@modules/auth/logged-ins-user.service';
import { standardResponse } from 'src/utils/helper/response.helper';
import { Driver } from './entities/driver.entity';
import { CvdMapping } from '@modules/cvd-mapping/enitites/cvd-mapping.entity';


@Injectable()
export class DriverService {
    constructor(
        @InjectRepository(Driver)
        private readonly driverRepo: Repository<Driver>,

        @InjectRepository(CvdMapping)
        private readonly cvdRepo: Repository<CvdMapping>,

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
    // async updateDriver(id: number, reqBody: any) {
    //     const user = await this.loggedInsUserService.getCurrentUser();

    //     const driver = await this.driverRepo.findOne({ where: { id } });
    //     if (!driver) return standardResponse(false, "Driver not found", 404);

    //     await this.driverRepo.update(id, {
    //         ...reqBody,
    //         updatedBy: user
    //     });

    //     const updatedData = await this.driverRepo.findOne({ where: { id } });

    //     return standardResponse(true, "Driver updated", 200, updatedData);
    // }
    async updateDriver(id: number, reqBody: any) {
        const user = await this.loggedInsUserService.getCurrentUser();

        const driver = await this.driverRepo.findOne({ where: { id } });
        if (!driver) return standardResponse(false, "Driver not found", 404);

        const wasActive = driver.isActive;

        await this.driverRepo.update(id, {
            ...reqBody,
            updatedBy: user
        });

        const updatedData = await this.driverRepo.findOne({ where: { id } });

        // ✅✅✅ CASCADE: DRIVER → CVD
        if (wasActive === true && updatedData?.isActive === false) {
            await this.cvdRepo.update(
                { driver: { id } },
                { isActive: false }
            );
        }

        return standardResponse(true, "Driver updated", 200, updatedData);
    }


    // SOFT DELETE DRIVER
    async deleteDriver(id: number) {
        const driver = await this.driverRepo.findOne({ where: { id } });
        if (!driver) return standardResponse(false, "Driver not found", 404);

        await this.driverRepo.softDelete(id);

        return standardResponse(true, "Driver deleted", 200);
    }

    // CHANGE DRIVER STATUS
    // async changeStatus(id: number, status: boolean) {
    //     const driver = await this.driverRepo.findOne({
    //         where: { id },
    //         withDeleted: false
    //     });

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

    // ✅✅✅ CASCADE: if driver becomes INACTIVE → disable CVD
    if (status === false) {
        await this.cvdRepo.update(
            { driver: { id } },
            { isActive: false }
        );
    }

    return standardResponse(true, `Driver ${status ? 'activated' : 'deactivated'}`, 200);
}


}