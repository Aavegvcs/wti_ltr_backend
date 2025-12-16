
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
 import { In } from 'typeorm';
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

   

// async bulkUpload(reqBody: any) {
//   try {
//     const user = await this.loggedInsUserService.getCurrentUser();
//     if (!user) {
//       return standardResponse(false, "User not logged in", 401);
//     }

//     const data = reqBody.data || [];
//     const startIndex = typeof reqBody.startIndex === "number" ? reqBody.startIndex : 1;

//     const failed: { index: number; name: string; reason: string }[] = [];
//     const headerOffset = 1;

//     if (!Array.isArray(data) || data.length === 0) {
//       return standardResponse(true, "No data provided", 404, {
//         successCount: 0,
//         failedCount: 0,
//         failed: []
//       });
//     }

//     const validRows: any[] = [];

//     // ====================================================
//     // 1️⃣ BASIC VALIDATION
//     // ====================================================
//     data.forEach((item: any, idx: number) => {
//       const rowIndex = startIndex + idx + headerOffset;

//       const corporateId = item.corporateId;
//       const branchId = item.branchId;
//       const vehicleNumber = (item.vehicleNumber || "").trim().toUpperCase();
//       const driverMobile = (item.driverMobileNumber || "").trim();

//       if (!corporateId) {
//         failed.push({ index: rowIndex, name: "N/A", reason: "Corporate ID missing" });
//         return;
//       }
//       if (!branchId) {
//         failed.push({ index: rowIndex, name: "N/A", reason: "Branch ID missing" });
//         return;
//       }
//       if (!vehicleNumber) {
//         failed.push({ index: rowIndex, name: "N/A", reason: "Vehicle Number missing" });
//         return;
//       }
//       if (!driverMobile) {
//         failed.push({ index: rowIndex, name: "N/A", reason: "Driver mobile number missing" });
//         return;
//       }

//       validRows.push({
//         _rowIndex: rowIndex,
//         corporateId,
//         branchId,
//         vehicleNumber,
//         driverMobile
//       });
//     });

//     if (validRows.length === 0) {
//       return standardResponse(true, "No valid rows", 200, {
//         successCount: 0,
//         failedCount: failed.length,
//         failed
//       });
//     }

//     // ====================================================
//     // 2️⃣ FETCH REQUIRED ENTITIES
//     // ====================================================

//     const vehicles = await this.vehicleRepo.find({
//       where: { vehicleNumber: In(validRows.map(r => r.vehicleNumber)) }
//     });

//     const drivers = await this.driverRepo.find({
//       where: { mobileNumber: In(validRows.map(r => r.driverMobile)) }
//     });

//     const corporates = await this.corporateRepo.find({
//       where: { id: In(validRows.map(r => r.corporateId)) }
//     });

//     const branches = await this.branchRepo.find({
//       where: { id: In(validRows.map(r => r.branchId)) }
//     });

//     // Create Maps
//     const vehicleMap = new Map(vehicles.map(v => [v.vehicleNumber, v]));
//     const driverMap = new Map(drivers.map(d => [d.mobileNumber, d]));
//     const corporateMap = new Map(corporates.map(c => [c.id, c]));
//     const branchMap = new Map(branches.map(b => [b.id, b]));

//     // ====================================================
//     // 3️⃣ FETCH EXISTING DRIVER MAPPINGS
//     // ====================================================
//     const existingMappings = await this.cvdRepo.find({
//       where: { driver: In(drivers.map(d => d.id)) },
//       relations: ["driver"]
//     });

//     const mappedDriverIds = new Set(existingMappings.map(m => m.driver.id));

//     // ====================================================
//     // 4️⃣ PROCESS INSERT
//     // ====================================================
//     let successCount = 0;

//     await this.cvdRepo.manager.transaction(async (manager) => {
//       const cvdTx = manager.getRepository(CvdMapping);

//       for (const row of validRows) {
//         const rowIndex = row._rowIndex;

//         const corporate = corporateMap.get(row.corporateId);
//         const branch = branchMap.get(row.branchId);
//         const vehicle = vehicleMap.get(row.vehicleNumber);
//         const driver = driverMap.get(row.driverMobile);

//         // ===== ENTITY EXISTENCE CHECKS =====
//         if (!corporate) {
//           failed.push({ index: rowIndex, name: row.driverMobile, reason: `Corporate '${row.corporateId}' not found` });
//           continue;
//         }
//         if (!branch) {
//           failed.push({ index: rowIndex, name: row.driverMobile, reason: `Branch '${row.branchId}' not found` });
//           continue;
//         }
//         if (!vehicle) {
//           failed.push({ index: rowIndex, name: row.vehicleNumber, reason: `Vehicle '${row.vehicleNumber}' not found` });
//           continue;
//         }
//         if (!driver) {
//           failed.push({ index: rowIndex, name: row.driverMobile, reason: `Driver '${row.driverMobile}' not found` });
//           continue;
//         }

//         // ===== ACTIVE STATE VALIDATION =====
//         if (!corporate.isActive) {
//           failed.push({ index: rowIndex, name: row.driverMobile, reason: `Corporate '${corporate.id}' is inactive` });
//           continue;
//         }
//         if (!branch.isActive) {
//           failed.push({ index: rowIndex, name: row.driverMobile, reason: `Branch '${branch.id}' is inactive` });
//           continue;
//         }
//         if (!vehicle.isActive) {
//           failed.push({ index: rowIndex, name: row.vehicleNumber, reason: `Vehicle '${row.vehicleNumber}' is inactive` });
//           continue;
//         }
//         if (!driver.isActive) {
//           failed.push({ index: rowIndex, name: row.driverMobile, reason: `Driver '${row.driverMobile}' is inactive` });
//           continue;
//         }

//         // ===== DRIVER ALREADY MAPPED CHECK =====
//         if (mappedDriverIds.has(driver.id)) {
//           failed.push({
//             index: rowIndex,
//             name: row.driverMobile,
//             reason: `Driver '${row.driverMobile}' is already mapped`
//           });
//           continue;
//         }

//         // ===== INSERT NEW MAPPING =====
//         try {
//           const newMapping = cvdTx.create({
//             corporate,
//             branch,
//             vehicle,
//             driver,
//             isActive: true,
//             createdBy: user,
//             updatedBy: user
//           });

//           await cvdTx.save(newMapping);
//           successCount++;
//           mappedDriverIds.add(driver.id);

//         } catch (err: any) {
//           failed.push({
//             index: rowIndex,
//             name: row.driverMobile,
//             reason: err?.message || "Error saving mapping"
//           });
//         }
//       }
//     });

//     const failedCount = failed.length;

//     let message = "CVD Mapping upload completed";
//     if (successCount > 0 && failedCount > 0) message = "Some records failed";
//     if (successCount === 0) message = "All records failed";

//     return standardResponse(true, message, 202, {
//       successCount,
//       failedCount,
//       failed
//     });

//   } catch (error: any) {
//     return standardResponse(false, error.message, 500);
//   }
// }

async bulkUpload(reqBody: any) {
  try {
    const user = await this.loggedInsUserService.getCurrentUser();
    if (!user) {
      return standardResponse(false, "User not logged in", 401);
    }

    const data = reqBody.data || [];
    const startIndex = typeof reqBody.startIndex === "number" ? reqBody.startIndex : 1;
    const headerOffset = 1;

    const failed: { index: number; name: string; reason: string }[] = [];

    if (!Array.isArray(data) || data.length === 0) {
      return standardResponse(true, "No data provided", 200, {
        successCount: 0,
        failedCount: 0,
        failed: []
      });
    }

    const validRows: any[] = [];

    // ====================================================
    // 1️⃣ BASIC VALIDATION (REQUIRED FIELDS)
    // ====================================================
    data.forEach((item: any, idx: number) => {
      const rowIndex = startIndex + idx + headerOffset;

      const corporateId = item.corporateId;
      const branchId = item.branchId;
      const vehicleNumber = (item.vehicleNumber || "").trim().toUpperCase();
      const driverMobile = (item.driverMobileNumber || "").trim();

      if (!corporateId) {
        failed.push({ index: rowIndex, name: "N/A", reason: "Corporate ID missing" });
        return;
      }
      if (!branchId) {
        failed.push({ index: rowIndex, name: "N/A", reason: "Branch ID missing" });
        return;
      }
      if (!vehicleNumber) {
        failed.push({ index: rowIndex, name: "N/A", reason: "Vehicle number missing" });
        return;
      }
      if (!driverMobile) {
        failed.push({ index: rowIndex, name: "N/A", reason: "Driver mobile number missing" });
        return;
      }

      validRows.push({
        _rowIndex: rowIndex,
        corporateId,
        branchId,
        vehicleNumber,
        driverMobile
      });
    });

    if (validRows.length === 0) {
      return standardResponse(true, "No valid rows", 200, {
        successCount: 0,
        failedCount: failed.length,
        failed
      });
    }

    // ====================================================
    // 2️⃣ FETCH ALL REQUIRED ENTITIES
    // ====================================================
    const vehicles = await this.vehicleRepo.find({
      where: { vehicleNumber: In(validRows.map(r => r.vehicleNumber)) }
    });

    const drivers = await this.driverRepo.find({
      where: { mobileNumber: In(validRows.map(r => r.driverMobile)) }
    });

    const corporates = await this.corporateRepo.find({
      where: { id: In(validRows.map(r => r.corporateId)) }
    });

    const branches = await this.branchRepo.find({
      where: { id: In(validRows.map(r => r.branchId)) }
    });

    const vehicleMap = new Map(vehicles.map(v => [v.vehicleNumber, v]));
    const driverMap = new Map(drivers.map(d => [d.mobileNumber, d]));
    const corporateMap = new Map(corporates.map(c => [c.id, c]));
    const branchMap = new Map(branches.map(b => [b.id, b]));

    // ====================================================
    // 3️⃣ FETCH EXISTING ACTIVE MAPPINGS (FREE RULES)
    // ====================================================
    const existingActiveMappings = await this.cvdRepo.find({
      where: { isActive: true },
      relations: ['vehicle', 'driver']
    });

    const mappedVehicleIds = new Set(
      existingActiveMappings.map(m => m.vehicle?.id)
    );

    const mappedDriverIds = new Set(
      existingActiveMappings.map(m => m.driver?.id)
    );

    // ====================================================
    // 4️⃣ INSERT MAPPINGS (TRANSACTION SAFE)
    // ====================================================
    let successCount = 0;

    await this.cvdRepo.manager.transaction(async (manager) => {
      const cvdTx = manager.getRepository(CvdMapping);

      for (const row of validRows) {
        const rowIndex = row._rowIndex;

        const corporate = corporateMap.get(row.corporateId);
        const branch = branchMap.get(row.branchId);
        const vehicle = vehicleMap.get(row.vehicleNumber);
        const driver = driverMap.get(row.driverMobile);

        // -------- EXISTENCE CHECKS --------
        if (!corporate) {
          failed.push({ index: rowIndex, name: row.driverMobile, reason: `Corporate '${row.corporateId}' not found` });
          continue;
        }
        if (!branch) {
          failed.push({ index: rowIndex, name: row.driverMobile, reason: `Branch '${row.branchId}' not found` });
          continue;
        }
        if (!vehicle) {
          failed.push({ index: rowIndex, name: row.vehicleNumber, reason: `Vehicle '${row.vehicleNumber}' not found` });
          continue;
        }
        if (!driver) {
          failed.push({ index: rowIndex, name: row.driverMobile, reason: `Driver '${row.driverMobile}' not found` });
          continue;
        }

        // -------- ACTIVE CHECKS --------
        if (!corporate.isActive) {
          failed.push({ index: rowIndex, name: row.driverMobile, reason: `Corporate is inactive` });
          continue;
        }
        if (!branch.isActive) {
          failed.push({ index: rowIndex, name: row.driverMobile, reason: `Branch is inactive` });
          continue;
        }
        if (!vehicle.isActive) {
          failed.push({ index: rowIndex, name: row.vehicleNumber, reason: `Vehicle is inactive` });
          continue;
        }
        if (!driver.isActive) {
          failed.push({ index: rowIndex, name: row.driverMobile, reason: `Driver is inactive` });
          continue;
        }

        // -------- FREE RULES (SAME AS createMapping) --------
        if (mappedVehicleIds.has(vehicle.id)) {
          failed.push({
            index: rowIndex,
            name: row.vehicleNumber,
            reason: `Vehicle '${row.vehicleNumber}' is already linked`
          });
          continue;
        }

        if (mappedDriverIds.has(driver.id)) {
          failed.push({
            index: rowIndex,
            name: row.driverMobile,
            reason: `Driver '${row.driverMobile}' is already linked`
          });
          continue;
        }

        // -------- CREATE MAPPING --------
        try {
          const newMapping = cvdTx.create({
            corporate,
            branch,
            vehicle,
            driver,
            isActive: true,
            createdBy: user,
            updatedBy: user
          });

          await cvdTx.save(newMapping);

          successCount++;
          mappedVehicleIds.add(vehicle.id);
          mappedDriverIds.add(driver.id);

        } catch (err: any) {
          failed.push({
            index: rowIndex,
            name: row.driverMobile,
            reason: err?.message || "Error saving mapping"
          });
        }
      }
    });

    const failedCount = failed.length;

    let message = "CVD Mapping upload completed";
    if (successCount > 0 && failedCount > 0) message = "Some records failed";
    if (successCount === 0) message = "All records failed";

    return standardResponse(true, message, 202, {
      successCount,
      failedCount,
      failed
    });

  } catch (error: any) {
    return standardResponse(false, error.message, 500);
  }
}


}
