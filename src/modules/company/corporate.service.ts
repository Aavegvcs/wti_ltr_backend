import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthService } from '../auth/auth.service';
import { Corporate } from './entities/corporate.entity';
import { LogService } from '../log/log.service';
import { MediaService } from '../media/media.service';
import { User } from '../user/user.entity';
import { makeCorporateCode, orderByKey, orderByValue } from 'src/utils/app.utils';
// import { Action } from '../ability/ability.factory';
import { UserService } from '../user/user.service';
import { CreateCorporateDto } from './dto/company-create.dto';
import { UpdateCorporateDto } from './dto/update-company.dto';
import { ConflictException } from '@nestjs/common';
import { StandardResponse } from 'src/utils/helper/response.helper';
import { Branch } from '../branch/entities/branch.entity';
import { CvdMapping } from '../cvd-mapping/enitites/cvd-mapping.entity';
import { Country } from '@modules/countries/entities/country.entity';
import { State } from '@modules/states/entities/state.entity';
import { In } from 'typeorm';
import { standardResponse } from 'src/utils/helper/response.helper';
import { LoggedInsUserService } from '@modules/auth/logged-ins-user.service';
import { runInNewContext } from 'vm';

@Injectable()
export class CorporateService {
    constructor(
        @InjectRepository(Corporate)
        private corporateRepo: Repository<Corporate>,

        @InjectRepository(Branch)
        private branchRepo: Repository<Branch>,

        @InjectRepository(CvdMapping)
        private cvdRepo: Repository<CvdMapping>,

        @InjectRepository(Country)
        private countryRepo: Repository<Country>,

        @InjectRepository(State)
        private stateRepo: Repository<State>,

        private loggedInsUserService: LoggedInsUserService
    ) {}

    async companyList(req: any): Promise<any> {
        const query = this.corporateRepo
            .createQueryBuilder('company')
            .leftJoinAndSelect('company.state', 'state')
            .leftJoinAndSelect('company.country', 'country')
            .orderBy('company.id', 'DESC');

        if (req?.QUERY_STRING?.where) query.where(req.QUERY_STRING.where);
        if (req?.QUERY_STRING?.skip) query.skip(req.QUERY_STRING.skip);
        if (req?.QUERY_STRING?.limit) query.take(req.QUERY_STRING.limit);

        const [items, total] = await query.getManyAndCount();

        return {
            items,
            pagination: {
                total,
                page: req?.QUERY_STRING?.page || 1,
                limit: req?.QUERY_STRING?.limit || items.length
            }
        };
    }

    async createCorporate(dto: CreateCorporateDto) {
        const { country, state, ...rest } = dto;

        const corporate = this.corporateRepo.create({
            ...rest,
            country: country ? { id: country } : undefined,
            state: state ? { id: state } : undefined
        });

        return await this.corporateRepo.save(corporate);
    }

    async updateCorporate(dto: UpdateCorporateDto) {
        const { id, country, state, ...rest } = dto;

        const corporate = await this.corporateRepo.findOne({
            where: { id }
        });

        if (!corporate) {
            throw new ConflictException('Corporate not found');
        }

        const wasActive = corporate.isActive;

        await this.corporateRepo.update(id, {
            ...rest,
            country: country ? { id: country } : undefined,
            state: state ? { id: state } : undefined
        });

        const updatedCorporate = await this.findCorporateById(id);

        // ✅✅✅ CASCADE: IF CORPORATE TURNED INACTIVE
        if (wasActive === true && updatedCorporate.isActive === false) {
            // 1️⃣ Deactivate all branches under this corporate
            await this.branchRepo.update({ corporate: { id } }, { isActive: false });

            // 2️⃣ Deactivate all CVD mappings under this corporate
            await this.cvdRepo.update({ corporate: { id } }, { isActive: false });
        }

        return updatedCorporate;
    }

    async deleteCorporate(id: number) {
        return this.corporateRepo.softDelete(id);
    }

    async findCorporateById(id: number) {
        return this.corporateRepo.findOne({ where: { id } });
    }
    async corporateBulkUpload(reqBody: any): Promise<any> {
        const failed: { index: number; name: string; reason: string }[] = [];
        const data = reqBody.data || [];
        const startIndex = reqBody.startIndex ?? 1;

        // 1️⃣ BASIC VALIDATION
        if (!Array.isArray(data) || data.length === 0) {
            return standardResponse(
                true,
                'No data provided for bulk upload',
                404,
                {
                    successCount: 0,
                    failedCount: 0,
                    failed: []
                },
                null,
                'companies/corporateBulkUpload'
            );
        }

        // 2️⃣ DUPLICATE CHECK (LIKE BRANCH)
        const incomingCodes = data.map((item: any) => item['Corporate Code']).filter((code: any) => !!code);

        const existingCorporates = incomingCodes.length
            ? await this.corporateRepo.find({
                  where: { corporateCode: In(incomingCodes) }
              })
            : [];

        const existingSet = new Set(existingCorporates.map((c) => c.corporateCode));

        const uniqueData: any[] = [];
        const headerOffset = 1;

        data.forEach((item: any, index: number) => {
            const rowIndex = startIndex + index + headerOffset;
            const code = item['Corporate Code'];
            const name = item['Corporate Name'];

            if (!code || !name) {
                failed.push({
                    index: rowIndex,
                    name: name || code || 'N/A',
                    reason: 'Corporate Code or Name missing'
                });
                return;
            }

            if (existingSet.has(code)) {
                failed.push({
                    index: rowIndex,
                    name: code,
                    reason: `Corporate '${code}' already exists`
                });
            } else {
                uniqueData.push(item);
            }
        });

        // 3️⃣ PRELOAD STATE & COUNTRY TO AVOID MANY QUERIES
        const allStates = await this.stateRepo.find();
        const allCountries = await this.countryRepo.find();

        const stateMap = new Map(allStates.map((s) => [s.name.trim().toLowerCase(), s.id]));
        const countryMap = new Map(allCountries.map((c) => [c.name.trim().toLowerCase(), c.id]));

        // 4️⃣ BUILD CORPORATE ENTITIES
        const toInsert: Corporate[] = [];

        for (let i = 0; i < uniqueData.length; i++) {
            const item = uniqueData[i];
            const rowIndex = startIndex + i + headerOffset;

            try {
                const corporateCode = item['Corporate Code'];
                const corporateName = item['Corporate Name'];
                const phoneNumber = item['Phone Number'];
                const adminName = item['Admin Name'];
                const email = item['Email'];
                const stateName = item['State'] || item['State Name'];
                const countryName = item['Country'] || item['Country Name'];
                const address = item['Address'];
                const isActiveRaw = item['IsActive'];

                // 🔹 Resolve state
                let stateId: number | undefined;
                if (stateName) {
                    const key = stateName.toString().trim().toLowerCase();
                    const id = stateMap.get(key);
                    if (!id) {
                        failed.push({
                            index: rowIndex,
                            name: corporateName,
                            reason: `State not found in DB: ${stateName}`
                        });
                        continue;
                    }
                    stateId = id;
                }

                // 🔹 Resolve country
                let countryId: number | undefined;
                if (countryName) {
                    const key = countryName.toString().trim().toLowerCase();
                    const id = countryMap.get(key);
                    if (!id) {
                        failed.push({
                            index: rowIndex,
                            name: corporateName,
                            reason: `Country not found in DB: ${countryName}`
                        });
                        continue;
                    }
                    countryId = id;
                }

                const corporate = this.corporateRepo.create({
                    corporateCode,
                    corporateName,
                    phoneNumber: phoneNumber ? String(phoneNumber) : null,
                    adminName,
                    email,
                    address,
                    isActive: isActiveRaw == null ? true : String(isActiveRaw).toLowerCase() === 'true',
                    state: stateId ? ({ id: stateId } as any) : undefined,
                    country: countryId ? ({ id: countryId } as any) : undefined
                });

                toInsert.push(corporate);
            } catch (err: any) {
                failed.push({
                    index: rowIndex,
                    name: item['Corporate Name'] || item['Corporate Code'] || 'N/A',
                    reason: err?.message || 'Internal processing error'
                });
            }
        }

        // 5️⃣ SAVE ALL VALID ONES
        if (toInsert.length) {
            await this.corporateRepo.save(toInsert);
        }

        const successCount = toInsert.length;
        const failedCount = failed.length;

        let message = 'Data inserted successfully.';
        if (successCount > 0 && failedCount > 0) message = 'Data partially inserted!';
        if (successCount === 0) message = 'Failed to insert data!';

        return standardResponse(
            true,
            message,
            200,
            {
                successCount,
                failedCount,
                failed
            },
            null,
            'companies/corporateBulkUpload'
        );
    }

    // async corporateBulkUpload1(reqBody: any): Promise<any> {
    //     const failed: { index: number; name: string; reason: string }[] = [];
    //     const data = reqBody.data || [];
    //     const startIndex = reqBody.startIndex || 1;
    //     const userEntity = await this.loggedInsUserService.getCurrentUser();

    //     if (!userEntity) {
    //         return standardResponse(false, 'Logged user not found', 404, null, null, 'corporate/corporateBulkUpload');
    //     }
    //     try {
    //         if (!Array.isArray(data) || data.length === 0) {
    //             const result = {
    //                 successCount: 0,
    //                 failedCount: 0,
    //                 failed: [],
    //                 message: 'No data provided for bulk upload'
    //             };
    //             return standardResponse(
    //                 true,
    //                 'No data provided for bulk upload',
    //                 404,
    //                 result,
    //                 null,
    //                 'corporate/corporateBulkUpload'
    //             );
    //         }

    //         const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    //         const incomingNames = data.map((item) => item.companyName);
    //         const existingCompanies = await this.corporateRepo.find({
    //             where: { corporateName: In(incomingNames) },
    //             select: ['corporateName']
    //         });

    //         const existingNames = new Set(existingCompanies.map((c) => c.corporateName));
    //         const uniqueData = [];
    //         const headerOffset = 1;
    //         data.forEach((item, index) => {
    //             const rowIndex = startIndex + index + headerOffset;

    //             if (existingNames.has(item.corporateName)) {
    //                 failed.push({
    //                     index: rowIndex,
    //                     name: item.corporateName,
    //                     reason: `Corporate with name ${item.corporateName} already exists`
    //                 });
    //                 return;
    //             }

    //             if (item.email && !emailRegex.test(item.email)) {
    //                 failed.push({
    //                     index: rowIndex,
    //                     name: item.corporateName || 'Unknown',
    //                     reason: `Invalid email format: ${item.email}`
    //                 });
    //                 return;
    //             }

    //             uniqueData.push(item);
    //         });

    //         // Step 4: Bulk insert only unique data if any
    //         if (uniqueData.length > 0) {
    //             try {
    //                 const insertData = uniqueData.map((item) => ({
    //                     ...item,
    //                     createdBy: userEntity // or whatever field represents the user in your table
    //                 }));
    //                 await this.corporateRepo
    //                     .createQueryBuilder()
    //                     .insert()
    //                     .into(this.corporateRepo.metadata.tableName)
    //                     .values(insertData)
    //                     .execute();
    //             } catch (error) {
    //                 uniqueData.forEach((item, index) => {
    //                     failed.push({
    //                         index: startIndex + data.indexOf(item),
    //                         name: item.corporateName,
    //                         reason: error.message || 'Database insert error'
    //                     });
    //                 });
    //             }
    //         }

    //         let message = null;
    //         const successCount = uniqueData.length - failed.length;
    //         const failedCount = failed.length;
    //         console.log('before set message in corporate bulk upload', successCount, failedCount);
    //         if (successCount > 0 && failedCount > 0) {
    //             message = 'Data partialy inserted!';
    //         } else if (successCount < 0 && failedCount > 0) message = 'Failed to inserted data';
    //         else {
    //             console.log('else part in corporate bulk upload', successCount, failedCount);

    //             message = 'Data inserted successfully.';
    //         }
    //         return standardResponse(
    //             true,
    //             message,
    //             202,
    //             {
    //                 successCount: successCount,
    //                 failedCount: failedCount,
    //                 failed
    //             },
    //             null,
    //             'corporate/corporateBulkUpload'
    //         );
    //     } catch (error) {
    //         return standardResponse(
    //             true,
    //             'Failed! to insert data',
    //             404,
    //             {
    //                 successCount: 0,
    //                 failedCount: data.length,
    //                 failed: data.map((item, index) => ({
    //                     index: startIndex + index,
    //                     name: item.corporateName || 'Unknown',
    //                     reason: error.message || 'Unexpected server error'
    //                 }))
    //             },
    //             null,
    //             'corporate/corporateBulkUpload'
    //         );
    //     }
    // }

async corporateBulkUpload1(reqBody: any): Promise<any> {

    const failed: { index: number; name: string; reason: string }[] = [];
    const data = reqBody.data || [];
    const startIndex = typeof reqBody.startIndex === 'number' ? reqBody.startIndex : 1;
    const userEntity = await this.loggedInsUserService.getCurrentUser();

    if (!userEntity) {
      return standardResponse(false, 'Logged user not found', 404, null, null, 'corporate/corporateBulkUpload');
    }

    if (!Array.isArray(data) || data.length === 0) {
      return standardResponse(true, 'No data provided for bulk upload', 404, {
        successCount: 0,
        failedCount: 0,
        failed: [],
        message: 'No data provided for bulk upload'
      }, null, 'corporate/corporateBulkUpload');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const incomingNames = data
      .map((item: any) => (item.corporateName || item.companyName || '').trim())
      .filter((n: string) => n);
    let existingNames = new Set<string>();
    if (incomingNames.length > 0) {
      const existingCompanies = await this.corporateRepo.find({
        where: { corporateName: In(incomingNames) },
        select: ['corporateName']
      });
      existingNames = new Set(existingCompanies.map((c) => (c.corporateName || '').trim()));
    }
    const headerOffset = 1;
    const uniqueData: any[] = [];
    data.forEach((item: any, index: number) => {
      const rowIndex = startIndex + index + headerOffset;
      const name = (item.corporateName || '').trim();

      if (!name) {
        failed.push({
          index: rowIndex,
          name: 'Unknown',
          reason: 'Corporate name missing'
        });
        return;
      }

      if (existingNames.has(name)) {
        failed.push({
          index: rowIndex,
          name,
          reason: `Corporate with name '${name}' already exists`
        });
        return;
      }

      if (item.email && !emailRegex.test(item.email)) {
        failed.push({
          index: rowIndex,
          name,
          reason: `Invalid email format: ${item.email}`
        });
        return;
      }

      uniqueData.push({
        _rowIndex: rowIndex,
        corporateName: name,
        phoneNumber: item.phoneNumber || null,
        adminName: item.adminName,
        isActive:true,
        address: item.address || null,
        stateName: (item.state || '').trim(),
        countryName: (item.country || '').trim(),
        email: item.email || null,
        raw: item
      });
    });

    if (uniqueData.length === 0) {
      return standardResponse(true, 'No valid data to insert', 200, {
        successCount: 0,
        failedCount: failed.length,
        failed
      }, null, 'corporate/corporateBulkUpload');
    }

    try {
      const stateNames = Array.from(new Set(uniqueData.map((d) => d.stateName).filter((s) => s)));
      const countryNames = Array.from(new Set(uniqueData.map((d) => d.countryName).filter((s) => s)));

      const stateMap = new Map<string, State>();
      if (stateNames.length > 0) {
        const states = await this.stateRepo.find({ where: { name: In(stateNames) } });
        states.forEach((s) => stateMap.set((s.name || '').trim().toLowerCase(), s));
      }

      const countryMap = new Map<string, Country>();
      if (countryNames.length > 0) {
        const countries = await this.countryRepo.find({ where: { name: In(countryNames) } });
        countries.forEach((c) => countryMap.set((c.name || '').trim().toLowerCase(), c));
      }
      const successCount = await this.corporateRepo.manager.transaction<number>(async (manager) => {
        const corpRepoTx = manager.getRepository(Corporate);
        let success = 0;

        for (const row of uniqueData) {
          const rowIndex = row._rowIndex;
          const corporateName = row.corporateName;

          try {
            let stateEntity: State | undefined = undefined;
            if (row.stateName) {
              stateEntity = stateMap.get(row.stateName.toLowerCase());
              if (!stateEntity) {
                failed.push({
                  index: rowIndex,
                  name: corporateName,
                  reason: `State '${row.stateName}' not found`
                });
                continue;
              }
            }

            let countryEntity: Country | undefined = undefined;
            if (row.countryName) {
              countryEntity = countryMap.get(row.countryName.toLowerCase());
              if (!countryEntity) {
                failed.push({
                  index: rowIndex,
                  name: corporateName,
                  reason: `Country '${row.countryName}' not found`
                });
                continue;
              }
            }
            const tempCode = `TEMP-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
            const corporateEntity = corpRepoTx.create({
              corporateName: corporateName,
              corporateCode: tempCode,
              phoneNumber: row.phoneNumber,
              adminName: row.adminName,
              isActive: row.isActive,
              address: row.address,
              email: row.email,
              createdBy: userEntity,
              ...(stateEntity ? { state: stateEntity } : {}),
              ...(countryEntity ? { country: countryEntity } : {})
            } as Partial<Corporate>);

            const saved = await corpRepoTx.save(corporateEntity);

            let generatedCode: string | undefined;

              generatedCode = await makeCorporateCode(saved.corporateName, saved.id);

            if (generatedCode) {
              saved.corporateCode = generatedCode;
              await corpRepoTx.save(saved);
            }

            success++;
          } catch (err: any) {
            failed.push({
              index: rowIndex,
              name: corporateName,
              reason: err?.message || 'Error saving corporate'
            });
          }
        }

        return success;
      });

      const failedCount = failed.length;
      let message = 'Data inserted successfully.';
      if (successCount > 0 && failedCount > 0) message = 'Data partially inserted!';
      else if (successCount <= 0 && failedCount > 0) message = 'Failed to insert data';

      return standardResponse(true, message, 202, {
        successCount,
        failedCount,
        failed
      }, null, 'corporate/corporateBulkUpload');

    } catch (error: any) {
      return standardResponse(false, 'Failed to insert data', 500, {
        successCount: 0,
        failedCount: uniqueData.length,
        failed: uniqueData.map((item) => ({
          index: item._rowIndex,
          name: item.corporateName,
          reason: error?.message || 'Unexpected server error'
        }))
      }, null, 'corporate/corporateBulkUpload');
    }
  }


}
