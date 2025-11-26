
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LoggedInsUserService } from '@modules/auth/logged-ins-user.service';
import { standardResponse } from 'src/utils/helper/response.helper';
import { Driver } from './entities/driver.entity';

@Injectable()
export class DriverService {
    constructor(
        @InjectRepository(Driver)
        private readonly driverRepo: Repository<Driver>,
        private readonly loggedInsUserService: LoggedInsUserService
      
    ) {}
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


  
}
