
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  UseGuards,
  Req,
  Logger,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { BranchService } from './branch.service';
import { JwtAuthGuard } from '@modules/auth/jwt-auth.guard';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Branches')
@Controller('branches')
export class BranchController {
  constructor(private readonly branchService: BranchService) { }

  @UseGuards(JwtAuthGuard)
  @Post('create')
  @ApiOperation({ summary: 'Create a new branch' })
  async create(@Body() body: any) {
    console.log('Branch CREATE payload:', body);
    return this.branchService.create(body);
  }

  @UseGuards(JwtAuthGuard)
  @Post('list')
  @ApiOperation({ summary: 'List branches' })
  async findAll(@Req() req: any) {
    return this.branchService.findAll(req);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  @ApiOperation({ summary: 'Get branch by ID' })
  async findOne(@Param('id') id: number) {
    return this.branchService.findById(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  @ApiOperation({ summary: 'Update branch' })
  async update(@Param('id') id: number, @Body() body: any) {
    return this.branchService.update(id, body);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @ApiOperation({ summary: 'Delete branch' })
  async remove(@Param('id') id: number) {
    return this.branchService.remove(id);
  }

  @Post('get-all-branches')
  async getAllBranches() {
    try {
      return await this.branchService.getAllBranches();
    } catch (error) {
      Logger.error(error.message);
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('toggle-status')
  async toggleStatus(@Body() body: any) {
    try {
      return await this.branchService.toggleStatus(body.id);
    } catch (error) {
      Logger.error(error.message);
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('getBranch')
  async getBranch() {
    try {
      return await this.branchService.getBranch();
    } catch (error) {
      Logger.error(error.message);
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post('branchBulkUpload')
  @ApiOperation({ summary: 'bulk upload of corporate' })
  async BulkUpload(@Body() reqBody: any) {
  console.log("bulk upload payload:", reqBody);
    return this.branchService.branchBulkUpload(reqBody);
  }
}
