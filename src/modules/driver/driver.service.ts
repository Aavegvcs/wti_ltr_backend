import { formatToCamelCase } from './../../utils/app.utils';

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { LoggedInsUserService } from '@modules/auth/logged-ins-user.service';
import { standardResponse } from 'src/utils/helper/response.helper';
import { Driver } from './entities/driver.entity';
import { CvdMapping } from '@modules/cvd-mapping/enitites/cvd-mapping.entity';
import { In } from 'typeorm';

function formatDriverName(name: string): string {
  if (!name) return name;
  return name
    .trim()
    .split(" ")
    .filter((x) => x)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function formatPAN(pan: string): string {
  if (!pan) return pan;
  return pan.trim().toUpperCase();
}

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

        // CASCADE: DRIVER → CVD
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
    async changeStatus(id: number, status: boolean) {
        const driver = await this.driverRepo.findOne({
            where: { id },
            withDeleted: false
        });

        if (!driver) return standardResponse(false, "Driver not found", 404);

        await this.driverRepo.update(id, { isActive: status });

        // CASCADE: if driver becomes INACTIVE → disable CVD
        if (status === false) {
            await this.cvdRepo.update(
                { driver: { id } },
                { isActive: false }
            );
        }

        return standardResponse(true, `Driver ${status ? 'activated' : 'deactivated'}`, 200);
    }

    // BULK UPLOAD DRIVERS
   
 



async bulkUpload(reqBody: any) {
  try {
    const user = await this.loggedInsUserService.getCurrentUser();
    if (!user) {
      return standardResponse(false, "User not logged in", 401);
    }

    const data = reqBody.data || [];
    const startIndex = typeof reqBody.startIndex === "number" ? reqBody.startIndex : 1;

    const failed: { index: number; name: string; reason: string }[] = [];

    if (!Array.isArray(data) || data.length === 0) {
      return standardResponse(true, "No data provided", 404, {
        successCount: 0,
        failedCount: 0,
        failed: []
      });
    }

    const headerOffset = 1;
    const uniqueData: any[] = [];

    // ====================================================
    // 1️⃣ VALIDATION + EXCEL DUPLICATE CHECK
    // ====================================================
    const seenMobiles = new Set<string>();

    data.forEach((item: any, idx: number) => {
      const rowIndex = startIndex + idx + headerOffset;

      const rawName = (item.name || "").trim();
      const rawMobile = (item.mobileNumber || "").trim();
      const rawPAN = item.panNumber || null;

      if (!rawMobile) {
        failed.push({ index: rowIndex, name: "Unknown", reason: "Mobile number missing" });
        return;
      }

      if (!rawName) {
        failed.push({ index: rowIndex, name: rawMobile, reason: "Driver name missing" });
        return;
      }

      // Duplicate inside Excel
      if (seenMobiles.has(rawMobile)) {
        failed.push({
          index: rowIndex,
          name: rawMobile,
          reason: `Duplicate mobile number inside file: '${rawMobile}'`
        });
        return;
      }

      seenMobiles.add(rawMobile);

      uniqueData.push({
        _rowIndex: rowIndex,
        name: formatDriverName(rawName),
        mobileNumber: rawMobile,
        panNumber: formatPAN(rawPAN),
        cancelCheque: item.cancelCheque || null,
        documents: item.documents || null,
      });
    });

    if (uniqueData.length === 0) {
      return standardResponse(true, "No valid data", 200, {
        successCount: 0,
        failedCount: failed.length,
        failed
      });
    }

    // ====================================================
    // 2️⃣ DUPLICATE CHECK IN DATABASE
    // ====================================================
    const incomingMobiles = uniqueData.map((d) => d.mobileNumber);

    const existingDrivers = await this.driverRepo.find({
      where: { mobileNumber: In(incomingMobiles) },
      select: ["mobileNumber"]
    });

    const existingSet = new Set(existingDrivers.map((d) => d.mobileNumber));

    uniqueData.forEach((row) => {
      if (existingSet.has(row.mobileNumber)) {
        failed.push({
          index: row._rowIndex,
          name: row.mobileNumber,
          reason: `Mobile '${row.mobileNumber}' already exists in database`
        });
      }
    });

    const validToInsert = uniqueData.filter(
      (row) => !existingSet.has(row.mobileNumber)
    );

    if (validToInsert.length === 0) {
      return standardResponse(true, "All records are duplicates", 200, {
        successCount: 0,
        failedCount: failed.length,
        failed
      });
    }

    // ====================================================
    // 3️⃣ INSERT VALID DRIVERS
    // ====================================================
    let successCount = 0;

    await this.driverRepo.manager.transaction(async (manager) => {
      const driverTx = manager.getRepository(Driver);

      for (const row of validToInsert) {
        try {
          const newDriver = driverTx.create({
            name: row.name,
            mobileNumber: row.mobileNumber,
            panNumber: row.panNumber,
            cancelCheque: row.cancelCheque,
            documents: row.documents,
            isActive: true,
            createdBy: user,
            updatedBy: user,
          });

          await driverTx.save(newDriver);
          successCount++;

        } catch (err: any) {
          failed.push({
            index: row._rowIndex,
            name: row.mobileNumber,
            reason: err?.message || "Error saving driver"
          });
        }
      }
    });

    const failedCount = failed.length;

    let message = "Drivers uploaded successfully.";
    if (successCount > 0 && failedCount > 0) message = "Partial success. Some records failed.";
    if (successCount === 0) message = "Driver upload failed.";

    return standardResponse(true, message, 202, {
      successCount,
      failedCount,
      failed
    });

  } catch (error: any) {
    return standardResponse(false, "Unexpected server error", 500, {
      successCount: 0,
      failedCount: 0,
      failed: [{ index: 0, name: "System", reason: error.message }]
    });
  }
}


}