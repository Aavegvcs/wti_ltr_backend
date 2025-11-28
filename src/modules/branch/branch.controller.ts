// import {
//     Controller,
//     Get,
//     Post,
//     Body,
//     Param,
//     Patch,
//     Delete,
//     UseGuards,
//     Req,
//     Query,
//     Logger,
//     HttpStatus,
//     HttpException
// } from '@nestjs/common';
// import { BranchService } from './branch.service';
// import { UpdateBranchDto } from './dto/update-branch.dto';
// import { ApiTags, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';
// import { CorporateService } from '@modules/company/corporate.service';
// import { JwtAuthGuard } from '@modules/auth/jwt-auth.guard';

// @ApiTags('Branches')
// @Controller('branches')
// export class BranchController {
//     constructor(private readonly branchService: BranchService) { }

//     // @UseGuards(JwtAuthGuard)
//     // @Post('create')
//     // @ApiOperation({ summary: 'Create a new branch' })
//     // async create(@Body() createBranchDto: CreateBranchDto) {
//     //     return this.branchService.create(createBranchDto);
//     // }

//     @UseGuards(JwtAuthGuard)
//     @ApiOperation({ summary: 'Get all branches' })
//     @Post('list')
//     async findAll(@Req() req: any) {
//         console.log("hamara kaam ho gya")
//         return this.branchService.findAll(req);
//     }

//     @UseGuards(JwtAuthGuard)
//     @Get(':id')
//     @ApiOperation({ summary: 'Get a branch by ID' })
//     async findOne(@Param('id') id: string) {
//         return this.branchService.findById(id);
//     }

//     @UseGuards(JwtAuthGuard)
//     @Patch(':id')
//     @ApiOperation({ summary: 'Update a branch' })
//     async update(@Param('id') id: string, @Body() updateBranchDto: UpdateBranchDto) {
//         return this.branchService.update(id, updateBranchDto);
//     }

//     @UseGuards(JwtAuthGuard)
//     @Delete(':id')
//     @ApiOperation({ summary: 'Delete a branch' })
//     async remove(@Param('id') id: string) {
//         return this.branchService.remove(id);
//     }


//     @Post('get-all-branches')
//     async getAllBranches(@Body() body: any): Promise<any> {
//         try {
//             return await this.branchService.getAllBranches()
//         } catch (error) {
//             Logger.error(`Error fetching control branch and regional managers: ${error.message}`);
//             throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
//         }
//     }


//     @Post('toggle-status')
//     async toggleStatus(@Body() body: any): Promise<any> {
//         try {
//             return await this.branchService.toggleStatus(body.id)
//         } catch (error) {
//             Logger.error
//         }

//     }

    
//     @Post('getBranch')
//     async getBranch(@Body() body: any){
//         try {
//             return await this.branchService.getBranch()
//         } catch (error) {
//             Logger.error(`Error fetching control branch and regional managers: ${error.message}`);
//             throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
//         }
//     }


// }
import { Controller, Post, Body, Patch, Param, Delete, UseGuards, Req, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { BranchService } from './branch.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { JwtAuthGuard } from '@modules/auth/jwt-auth.guard';

@ApiTags('Branches')
@Controller('branches')
export class BranchController {
  constructor(private readonly branchService: BranchService) {}

  // list with pagination/filter expects body with QUERY_STRING
  @UseGuards(JwtAuthGuard)
  @Post('list')
  @ApiOperation({ summary: 'List branches (paginated/filter)' })
  async list(@Req() req: any) {
    return this.branchService.findAll(req);
  }

    // @UseGuards(JwtAuthGuard)
    // @Get(':id')
    // @ApiOperation({ summary: 'Get a branch by ID' })
    // async findOne(@Param('id') id: string) {
    //     return this.branchService.findById(id);
    // }

    // @UseGuards(JwtAuthGuard)
    // @Patch(':id')
    // @ApiOperation({ summary: 'Update a branch' })
    // async update(@Param('id') id: string, @Body() updateBranchDto: UpdateBranchDto) {
    //     return this.branchService.update(id, updateBranchDto);
    // }

    // @UseGuards(JwtAuthGuard)
    // @Delete(':id')
    // @ApiOperation({ summary: 'Delete a branch' })
    // async remove(@Param('id') id: string) {
    //     return this.branchService.remove(id);
    // }

  @UseGuards(JwtAuthGuard)
  @Post('toggle-status')
  @ApiOperation({ summary: 'Toggle branch active status' })
  async toggleStatus(@Body() body: { id: string }) {
    return this.branchService.toggleStatus(body.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('get-all-branches')
  @ApiOperation({ summary: 'Get branches (id, name) for dropdowns' })
  async getAllBranches() {
    return this.branchService.getAllBranches();
  }

  @UseGuards(JwtAuthGuard)
  @Post('branchBulkUpload')
  @ApiOperation({ summary: 'Bulk upload branches' })
  async branchBulkUpload(@Body() body: any) {
    return this.branchService.branchBulkUpload(body);
  }
}
