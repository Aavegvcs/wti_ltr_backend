
// import {
//   Injectable,
//   Logger,
//   Inject,
//   forwardRef,
// } from '@nestjs/common';
// import { InjectRepository } from '@nestjs/typeorm';
// import { Repository, EntityManager, In } from 'typeorm';
// import { Branch } from './entities/branch.entity';
// import { User } from '@modules/user/user.entity';
// import { UserService } from '@modules/user/user.service';
// import { CvdMapping } from '@modules/cvd-mapping/enitites/cvd-mapping.entity';
// import { standardResponse } from 'src/utils/helper/response.helper';
// import { LoggedInsUserService } from '@modules/auth/logged-ins-user.service';
// import { State } from '@modules/states/entities/state.entity';
// import { Corporate } from '@modules/company/entities/corporate.entity';


// @Injectable()
// export class BranchService {
//   private readonly logger = new Logger(BranchService.name);

//   constructor(
//     @InjectRepository(Branch)
//     private readonly branchRepository: Repository<Branch>,

//     @InjectRepository(User)
//     private readonly employeeRepository: Repository<User>,

//     @InjectRepository(CvdMapping)
//     private readonly cvdRepository: Repository<CvdMapping>,

//     @InjectRepository(Corporate)
//     private readonly corporateRepository: Repository<Corporate>,

//     @InjectRepository(State)
//     private readonly stateRepository: Repository<State>,

//     @Inject(forwardRef(() => UserService))
//     private readonly userService: UserService,
//     private readonly loggedInsUserService: LoggedInsUserService,
//   ) { }
//   async create(body: any): Promise<Branch> {
//     const branch = this.branchRepository.create({
//       id: body.id,
//       branchCode: body.branchCode,
//       corporate: body.corporateId ? { id: body.corporateId } : undefined,
//       name: body.name,
//       state: body.stateId ? { id: body.stateId } : undefined,
//       city: body.city,
//       pincode: body.pincode,
//       address: body.address,
//       email: body.email,
//       phone: body.phone,
//       isActive: body.isActive ?? true,
//     });

//     return await this.branchRepository.save(branch);
//   }

//   async findAll(req: any): Promise<any> {
//     const query = this.branchRepository
//       .createQueryBuilder('branch')
//       .leftJoinAndSelect('branch.state', 'state')
//       .leftJoinAndSelect('branch.corporate', 'corporate')
//       .where('branch.deletedAt IS NULL');

//     if (req?.QUERY_STRING?.where) query.where(req.QUERY_STRING.where);
//     if (req?.QUERY_STRING?.skip) query.skip(req.QUERY_STRING.skip);
//     if (req?.QUERY_STRING?.limit) query.take(req.QUERY_STRING.limit);
//     const [items, total] = await query.getManyAndCount();


//     return {
//       items,
//       pagination: {
//         total,
//         page: req?.QUERY_STRING?.page || 1,
//         limit: req?.QUERY_STRING?.limit || items.length
//       }
//     }
//   }

//   // --------------------------------------------------------------------------
//   // FIND BY ID
//   // --------------------------------------------------------------------------
//   async findById(id: number): Promise<Branch> {
//     const branch = await this.branchRepository.findOne({
//       where: { id },
//       relations: ['state', 'corporate'],
//     });

//     if (!branch) throw new Error(`Branch with ID ${id} not found`);

//     return branch;
//   }

//   // --------------------------------------------------------------------------
//   // UPDATE
//   // --------------------------------------------------------------------------
//   //   async update(id: number, body: any): Promise < Branch > {
//   //   const branch = await this.findById(id);

//   //   Object.assign(branch, {
//   //     branchCode: body.branchCode,
//   //     name: body.name,
//   //     city: body.city,
//   //     pincode: body.pincode,
//   //     address: body.address,
//   //     email: body.email,
//   //     phone: body.phone,
//   //     corporate: body.corporateId ? { id: body.corporateId } : branch.corporate,
//   //     state: body.stateId ? { id: body.stateId } : branch.state,
//   //     isActive: body.isActive ?? true,
//   //   });

//   //   return await this.branchRepository.save(branch);
//   // }
//   async update(id: number, body: any): Promise<Branch> {
//     const branch = await this.findById(id);

//     const wasActive = branch.isActive;

//     // ✅✅✅ BLOCK: Cannot activate branch if corporate is inactive
//     if (
//       body.isActive === true &&
//       branch.corporate &&
//       branch.corporate.isActive === false
//     ) {
//       throw new Error('Cannot activate branch while corporate is inactive');
//     }

//     Object.assign(branch, {
//       branchCode: body.branchCode,
//       name: body.name,
//       city: body.city,
//       pincode: body.pincode,
//       address: body.address,
//       email: body.email,
//       phone: body.phone,
//       corporate: body.corporateId ? { id: body.corporateId } : branch.corporate,
//       state: body.stateId ? { id: body.stateId } : branch.state,
//       isActive: body.isActive ?? branch.isActive,
//     });

//     const updatedBranch = await this.branchRepository.save(branch);

//     // ✅✅✅ CASCADE: If branch becomes inactive → disable CVD
//     if (wasActive === true && updatedBranch.isActive === false) {
//       await this.cvdRepository.update(
//         { branch: { id } },
//         { isActive: false }
//       );
//     }

//     return updatedBranch;
//   }


//   // --------------------------------------------------------------------------
//   // SOFT DELETE
//   // --------------------------------------------------------------------------
//   async remove(id: number): Promise<any> {
//     await this.branchRepository.softDelete({ id });
//     return { message: 'Branch deleted successfully' };
//   }

//   async toggleStatus(id: number): Promise<Branch> {
//     const branch = await this.findById(id);

//     const newStatus = !branch.isActive;

//     // ✅✅✅ BLOCK: Cannot activate branch if corporate is inactive
//     if (
//       newStatus === true &&
//       branch.corporate &&
//       branch.corporate.isActive === false
//     ) {
//       throw new Error('Cannot activate branch while corporate is inactive');
//     }

//     branch.isActive = newStatus;

//     const updatedBranch = await this.branchRepository.save(branch);

//     // ✅✅✅ CASCADE WHEN TURNING INACTIVE
//     if (newStatus === false) {
//       await this.cvdRepository.update(
//         { branch: { id } },
//         { isActive: false }
//       );
//     }

//     return updatedBranch;
//   }


//   // --------------------------------------------------------------------------
//   // GET ONLY IDS
//   // --------------------------------------------------------------------------
//   async getAllBranches(): Promise<any> {
//     const result = await this.branchRepository.find({
//       select: ['id', 'name'],
//     });

//     return {
//       status: 'success',
//       result,
//     };
//   }

//   // --------------------------------------------------------------------------
//   // CALL STORED PROCEDURE
//   // --------------------------------------------------------------------------
//   async getBranch(): Promise<any> {
//     try {
//       const result = await this.branchRepository.query(`CALL get_branch()`);
//       return {
//         status: 'success',
//         message: 'Fetched successfully',
//         result: result[0],
//       };
//     } catch (error) {
//       this.logger.error(error.message);
//       throw error;
//     }
//   }
//   //   async branchBulkUpload(reqBody: any): Promise<any> {
//   //     const failed: { index: number; name: string; reason: string }[] = [];
//   //     const data = reqBody.data || [];
//   //     const startIndex = reqBody.startIndex;
//   //     const userEntity = await this.loggedInsUserService.getCurrentUser();

//   //     if (!userEntity) {
//   //       return standardResponse(false, 'Logged user not found', 404, null, null, 'branches/branchBulkUpload');
//   //     }

//   //     try {
//   //       if (!Array.isArray(data) || data.length === 0) {
//   //         return standardResponse(
//   //           true,
//   //           'No data provided for bulk upload',
//   //           404,
//   //           {
//   //             successCount: 0,
//   //             failedCount: 0,
//   //             failed: []
//   //           },
//   //           null,
//   //           'branches/branchBulkUpload'
//   //         );
//   //       }

//   //       const incomingBranchCodes = data.map((item) => item.Code);
//   //       // console.log('incoming branch codes', incomingBranchCodes);

//   //       const existingBranches = await this.branchRepository.find({
//   //         where: { branchCode: In(incomingBranchCodes) }
//   //       });

//   //       const existingSet = new Set(existingBranches.map((b) => b.branchCode));
//   //       // console.log('existing branch set', existingSet);

//   //       const uniqueData = [];
//   //       const headerOffset = 1;

//   //       data.forEach((item, index) => {
//   //         const rowIndex = startIndex + index + headerOffset;

//   //         if (existingSet.has(item.Code)) {
//   //           failed.push({
//   //             index: rowIndex,
//   //             name: item.Code,
//   //             reason: `Branch '${item.Code}' already exists`
//   //           });
//   //         } else {
//   //           uniqueData.push(item);
//   //         }
//   //       });
//   //       console.log('failed data', failed);
//   //       console.log('unique data is here', uniqueData);

//   //       // -----------------------------
//   //       // INSERTING CLEAN DATA
//   //       // -----------------------------
//   //       for (let i = 0; i < uniqueData.length; i++) {
//   //         const item = uniqueData[i];
//   //         const rowIndex = startIndex + i + headerOffset;

//   //         try {
//   //           const corporate = await this.corporateRepository.findOne({
//   //             where: { id: item['corporateId'] }
//   //           });
//   //           const state = await this.stateRepository.findOne({
//   //             where: { name: item['State Name'] }
//   //           });

//   //           // const controlBranch = await this.branchRepository.findOne({
//   //           //     where: { branchCode: item['Contrl Br'] }
//   //           // });

//   //           const newBranch = this.branchRepository.create({
//   //             branchCode: item.Code,
//   //             name: item.Name,
//   //             city: item.City,
//   //             email: item.Email,
//   //             phone: item.Mobile,
//   //             pincode: item.Pincode,
//   //             address: item.Address || null,
//   //             state: state || null,
//   //             corporate: corporate, 
//   //             isActive: true,
//   //             createdAt: new Date()
//   //           });

//   //           // console.log('finally inserting data', newBranch);

//   //           await this.branchRepository.save(newBranch);
//   //         } catch (error) {
//   //           failed.push({
//   //             index: rowIndex,
//   //             name: item.Code,
//   //             reason: error.message || 'Database error'
//   //           });
//   //         }
//   //       }

//   //       const successCount = uniqueData.length - failed.length;
//   //       const failedCount = failed.length;

//   //       let message = 'Data inserted successfully.';
//   //       if (successCount > 0 && failedCount > 0) message = 'Data partially inserted!';
//   //       if (successCount === 0) message = 'Failed to insert data!';

//   //       return standardResponse(
//   //         true,
//   //         message,
//   //         200,
//   //         {
//   //           successCount,
//   //           failedCount,
//   //           failed
//   //         },
//   //         null,
//   //         'branches/branchBulkUpload'
//   //       );
//   //     } catch (error) {
//   //       return standardResponse(
//   //         false,
//   //         'Failed! to insert data',
//   //         500,
//   //         {
//   //           successCount: 0,
//   //           failedCount: data.length,
//   //           failed: data.map((item, index) => ({
//   //             index: startIndex + index,
//   //             name: item.Code,
//   //             reason: error.message
//   //           }))
//   //         },
//   //         null,
//   //         'branches/branchBulkUpload'
//   //       );
//   //     }
//   //   }
//   async branchBulkUpload(reqBody: any): Promise<any> {
//     const failed: { index: number; name: string; reason: string }[] = [];
//     const data = reqBody.data || [];
//     const startIndex = typeof reqBody.startIndex === 'number' ? reqBody.startIndex : 1;
//     const userEntity = await this.loggedInsUserService.getCurrentUser();

//     if (!userEntity) {
//       return standardResponse(false, 'Logged user not found', 404, null, null, 'branches/branchBulkUpload');
//     }

//     if (!Array.isArray(data) || data.length === 0) {
//       return standardResponse(true, 'No data provided for bulk upload', 404, {
//         successCount: 0,
//         failedCount: 0,
//         failed: []
//       }, null, 'branches/branchBulkUpload');
//     }

//     const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//     const incomingCodes = data.map((item: any) => (item.Code || '').trim()).filter((v) => v);

//     let existingCodes = new Set<string>();
//     if (incomingCodes.length > 0) {
//       const existing = await this.branchRepository.find({
//         where: { branchCode: In(incomingCodes) },
//         select: ['branchCode']
//       });
//       existingCodes = new Set(existing.map((x) => (x.branchCode || '').trim()));
//     }

//     const headerOffset = 1;
//     const uniqueData: any[] = [];

//     // ------------------------------------
//     // VALIDATION — EXACTLY SAME FLOW AS CORPORATE
//     // ------------------------------------
//     data.forEach((item: any, index: number) => {
//       const rowIndex = startIndex + index + headerOffset;

//       const branchCode = (item.Code || '').trim();
//       const branchName = (item.Name || '').trim();

//       if (!branchCode) {
//         failed.push({ index: rowIndex, name: 'Unknown', reason: 'Branch Code missing' });
//         return;
//       }

//       if (existingCodes.has(branchCode)) {
//         failed.push({
//           index: rowIndex,
//           name: branchCode,
//           reason: `Branch '${branchCode}' already exists`
//         });
//         return;
//       }

//       if (item.Email && !emailRegex.test(item.Email)) {
//         failed.push({
//           index: rowIndex,
//           name: branchCode,
//           reason: `Invalid email format: ${item.Email}`
//         });
//         return;
//       }

//       uniqueData.push({
//         _rowIndex: rowIndex,
//         branchCode,
//         branchName,
//         city: item.City || null,
//         email: item.Email || null,
//         phone: item.Mobile || null,
//         pincode: item.Pincode || null,
//         address: item.Address || null,
//         corporateId: item.corporateId,
//         stateName: (item['State Name'] || '').trim(),
//       });
//     });

//     if (uniqueData.length === 0) {
//       return standardResponse(true, 'No valid data to insert', 200, {
//         successCount: 0,
//         failedCount: failed.length,
//         failed
//       }, null, 'branches/branchBulkUpload');
//     }

//     try {
//       // Fetch states only once
//       const stateNames = Array.from(
//         new Set(uniqueData.map((d) => d.stateName).filter((v) => v))
//       );

//       const stateMap = new Map<string, State>();
//       if (stateNames.length > 0) {
//         const states = await this.stateRepository.find({
//           where: { name: In(stateNames) }
//         });
//         states.forEach((s) => stateMap.set(s.name.trim().toLowerCase(), s));
//       }

//       const successCount = await this.branchRepository.manager.transaction(async (manager) => {
//         const branchRepoTx = manager.getRepository(Branch);
//         let success = 0;

//         for (const row of uniqueData) {
//           const rowIndex = row._rowIndex;

//           try {
//             let stateEntity: State | undefined = undefined;

//             if (row.stateName) {
//               stateEntity = stateMap.get(row.stateName.toLowerCase());
//               if (!stateEntity) {
//                 failed.push({
//                   index: rowIndex,
//                   name: row.branchCode,
//                   reason: `State '${row.stateName}' not found`
//                 });
//                 continue;
//               }
//             }

//             const corporateEntity = await this.corporateRepository.findOne({
//               where: { id: row.corporateId }
//             });

//             if (!corporateEntity) {
//               failed.push({
//                 index: rowIndex,
//                 name: row.branchCode,
//                 reason: `Corporate ID '${row.corporateId}' not found`
//               });
//               continue;
//             }

//             const newBranch = branchRepoTx.create({
//               branchCode: row.branchCode,
//               name: row.branchName,
//               city: row.city,
//               email: row.email,
//               phone: row.phone,
//               pincode: row.pincode,
//               address: row.address,
//               state: stateEntity,
//               corporate: corporateEntity,
//               isActive: true,
//               createdBy: userEntity
//             });

//             await branchRepoTx.save(newBranch);
//             success++;

//           } catch (err: any) {
//             failed.push({
//               index: rowIndex,
//               name: row.branchCode,
//               reason: err?.message || 'Error saving branch'
//             });
//           }
//         }
//         return success;
//       });

//       const failedCount = failed.length;

//       let message = 'Data inserted successfully.';
//       if (successCount > 0 && failedCount > 0) message = 'Data partially inserted!';
//       else if (successCount === 0 && failedCount > 0) message = 'Failed to insert data';

//       return standardResponse(true, message, 202, {
//         successCount,
//         failedCount,
//         failed
//       }, null, 'branches/branchBulkUpload');

//     } catch (error: any) {
//       return standardResponse(false, 'Failed to insert data', 500, {
//         successCount: 0,
//         failedCount: uniqueData.length,
//         failed: uniqueData.map((item) => ({
//           index: item._rowIndex,
//           name: item.branchCode,
//           reason: error?.message || 'Unexpected server error'
//         }))
//       }, null, 'branches/branchBulkUpload');
//     }
//   }


// }

import {
  Injectable,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Branch } from './entities/branch.entity';
import { User } from '@modules/user/user.entity';
import { UserService } from '@modules/user/user.service';
import { CvdMapping } from '@modules/cvd-mapping/enitites/cvd-mapping.entity';
import { standardResponse } from 'src/utils/helper/response.helper';
import { LoggedInsUserService } from '@modules/auth/logged-ins-user.service';
import { State } from '@modules/states/entities/state.entity';
import { Corporate } from '@modules/company/entities/corporate.entity';
import { makeBranchCode } from 'src/utils/app.utils';

@Injectable()
export class BranchService {
  private readonly logger = new Logger(BranchService.name);

  constructor(
    @InjectRepository(Branch)
    private readonly branchRepository: Repository<Branch>,

    @InjectRepository(User)
    private readonly employeeRepository: Repository<User>,

    @InjectRepository(CvdMapping)
    private readonly cvdRepository: Repository<CvdMapping>,

    @InjectRepository(Corporate)
    private readonly corporateRepository: Repository<Corporate>,

    @InjectRepository(State)
    private readonly stateRepository: Repository<State>,

    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService,

    private readonly loggedInsUserService: LoggedInsUserService,
  ) { }

  // ===========================================================================
  // CREATE BRANCH (AUTO CODE)
  // ===========================================================================
  async create(body: any): Promise<Branch> {
    const user = await this.loggedInsUserService.getCurrentUser();

    const tempCode = `TEMP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const branch = this.branchRepository.create({
      branchCode: tempCode,
      name: body.name,
      city: body.city,
      pincode: body.pincode,
      address: body.address,
      email: body.email,
      phone: body.phone,
      isActive: body.isActive ?? true,
      corporate: body.corporateId ? { id: body.corporateId } : undefined,
      state: body.stateId ? { id: body.stateId } : undefined,
      createdBy: user,
    });

    // 1️⃣ Save first
    const saved = await this.branchRepository.save(branch);

    // 2️⃣ Generate final branch code
    saved.branchCode = makeBranchCode(saved.name, saved.id);

    // 3️⃣ Save again
    return await this.branchRepository.save(saved);
  }

  // ===========================================================================
  // FIND ALL
  // ===========================================================================
  async findAll(req: any): Promise<any> {
    const query = this.branchRepository
      .createQueryBuilder('branch')
      .leftJoinAndSelect('branch.state', 'state')
      .leftJoinAndSelect('branch.corporate', 'corporate')
      .where('branch.deletedAt IS NULL');

    if (req?.QUERY_STRING?.where) query.where(req.QUERY_STRING.where);
    if (req?.QUERY_STRING?.skip) query.skip(req.QUERY_STRING.skip);
    if (req?.QUERY_STRING?.limit) query.take(req.QUERY_STRING.limit);

    const [items, total] = await query.getManyAndCount();

    return {
      items,
      pagination: {
        total,
        page: req?.QUERY_STRING?.page || 1,
        limit: req?.QUERY_STRING?.limit || items.length,
      },
    };
  }

  // ===========================================================================
  // FIND BY ID
  // ===========================================================================
  async findById(id: number): Promise<Branch> {
    const branch = await this.branchRepository.findOne({
      where: { id },
      relations: ['state', 'corporate'],
    });

    if (!branch) throw new Error(`Branch with ID ${id} not found`);
    return branch;
  }

  async getBranch(corporateId: number): Promise<any> {
    try {

      if (!corporateId) {
        throw new Error('corporateId is required');
      }
      const query = 'CALL get_branch(?)';
      const result = await this.branchRepository.query(query, [corporateId]);
      return {
        status: 'success',
        message: 'Fetched successfully',
        result: result[0],
      };
    } catch (error) {
      this.logger.error(error.message);
      throw error;
    }
  }

  // ===========================================================================
  // UPDATE
  // ===========================================================================

  async toggleStatus(id: number): Promise<Branch> {
    const branch = await this.findById(id);

    const newStatus = !branch.isActive;

    // ✅✅✅ BLOCK: Cannot activate branch if corporate is inactive
    if (
      newStatus === true &&
      branch.corporate &&
      branch.corporate.isActive === false
    ) {
      throw new Error('Cannot activate branch while corporate is inactive');
    }

    branch.isActive = newStatus;

    const updatedBranch = await this.branchRepository.save(branch);

    // ✅✅✅ CASCADE WHEN TURNING INACTIVE
    if (newStatus === false) {
      await this.cvdRepository.update(
        { branch: { id } },
        { isActive: false }
      );
    }

    return updatedBranch;
  }

  async update(id: number, body: any): Promise<Branch> {
    const branch = await this.findById(id);
    const wasActive = branch.isActive;

    if (
      body.isActive === true &&
      branch.corporate &&
      branch.corporate.isActive === false
    ) {
      throw new Error('Cannot activate branch while corporate is inactive');
    }

    Object.assign(branch, {
      name: body.name,
      city: body.city,
      pincode: body.pincode,
      address: body.address,
      email: body.email,
      phone: body.phone,
      corporate: body.corporateId ? { id: body.corporateId } : branch.corporate,
      state: body.stateId ? { id: body.stateId } : branch.state,
      isActive: body.isActive ?? branch.isActive,
    });

    const updated = await this.branchRepository.save(branch);

    if (wasActive && updated.isActive === false) {
      await this.cvdRepository.update(
        { branch: { id } },
        { isActive: false },
      );
    }

    return updated;
  }
  async getAllBranches(): Promise<any> {
    const result = await this.branchRepository.find({
      select: ['id', 'name'],
    });

    return {
      status: 'success',
      result,
    };
  }
  async remove(id: number): Promise<any> {
    await this.branchRepository.softDelete({ id });
    return { message: 'Branch deleted successfully' };
  }



  // ===========================================================================
  // BULK UPLOAD (AUTO CODE)
  // ===========================================================================
  async branchBulkUpload(reqBody: any): Promise<any> {
    const failed: { index: number; name: string; reason: string }[] = [];
    const data = reqBody.data || [];
    const startIndex = typeof reqBody.startIndex === 'number' ? reqBody.startIndex : 1;
    const user = await this.loggedInsUserService.getCurrentUser();

    if (!user) {
      return standardResponse(false, 'Logged user not found', 404);
    }

    if (!Array.isArray(data) || data.length === 0) {
      return standardResponse(true, 'No data provided', 200, {
        successCount: 0,
        failedCount: 0,
        failed,
      });
    }

    const headerOffset = 1;
    const uniqueData: any[] = [];

    // -----------------------------------------------------------------------
    // DUPLICATE CHECK BY (BRANCH NAME + CORPORATE)
    // -----------------------------------------------------------------------
    const incomingNames = data.map((d: any) => (d.Name || '').trim()).filter(Boolean);

    const existing = await this.branchRepository.find({
      where: { name: In(incomingNames) },
      relations: ['corporate'],
    });

    const existingSet = new Set(
      existing.map((b) => `${b.name.toLowerCase()}-${b.corporate?.id}`)
    );

    data.forEach((item: any, index: number) => {
      const rowIndex = startIndex + index + headerOffset;
      const name = (item.Name || '').trim();
      const corporateId = item.corporateId;

      if (!name) {
        failed.push({ index: rowIndex, name: 'Unknown', reason: 'Branch name missing' });
        return;
      }

      if (!corporateId) {
        failed.push({ index: rowIndex, name, reason: 'Corporate ID missing' });
        return;
      }

      const key = `${name.toLowerCase()}-${corporateId}`;
      if (existingSet.has(key)) {
        failed.push({ index: rowIndex, name, reason: 'Branch already exists under this corporate' });
        return;
      }

      uniqueData.push({
        _rowIndex: rowIndex,
        name,
        city: item.City || null,
        email: item.Email || null,
        phone: item.Mobile || null,
        pincode: item.Pincode || null,
        address: item.Address || null,
        stateName: (item['State Name'] || '').trim(),
        corporateId,
      });
    });

    if (!uniqueData.length) {
      return standardResponse(true, 'No valid data', 200, {
        successCount: 0,
        failedCount: failed.length,
        failed,
      });
    }

    const stateNames = [...new Set(uniqueData.map((d) => d.stateName).filter(Boolean))];
    const states = await this.stateRepository.find({ where: { name: In(stateNames) } });
    const stateMap = new Map(states.map((s) => [s.name.toLowerCase(), s]));

    let successCount = 0;

    await this.branchRepository.manager.transaction(async (manager) => {
      const repo = manager.getRepository(Branch);

      for (const row of uniqueData) {
        try {
          const corporate = await this.corporateRepository.findOne({
            where: { id: row.corporateId },
          });

          if (!corporate) {
            failed.push({
              index: row._rowIndex,
              name: row.name,
              reason: `Corporate ID ${row.corporateId} not found`,
            });
            continue;
          }

          const temp = repo.create({
            branchCode: `TEMP-${Date.now()}-${Math.random()}`,
            name: row.name,
            city: row.city,
            email: row.email,
            phone: row.phone,
            pincode: row.pincode,
            address: row.address,
            state: row.stateName ? stateMap.get(row.stateName.toLowerCase()) : undefined,
            corporate,
            isActive: true,
            createdBy: user,
          });

          const saved = await repo.save(temp);
          saved.branchCode = makeBranchCode(saved.name, saved.id);
          await repo.save(saved);

          successCount++;
        } catch (err: any) {
          failed.push({
            index: row._rowIndex,
            name: row.name,
            reason: err?.message || 'Error saving branch',
          });
        }
      }
    });

    return standardResponse(true, 'Bulk upload completed', 200, {
      successCount,
      failedCount: failed.length,
      failed,
    });
  }
}
