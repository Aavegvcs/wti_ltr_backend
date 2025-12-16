
import { Body, Controller, Get, Param, Patch, Post, Query, Delete, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { DriverService } from './driver.service';
import { JwtAuthGuard } from '@modules/auth/jwt-auth.guard';


@ApiTags('driver')
@Controller('driver')
export class DriverController {
    constructor(private readonly driverService: DriverService) { }
    @UseGuards(JwtAuthGuard)
    @Post('create')
    @ApiOperation({ summary: 'Create a new driver' })
    async createDriver(@Body() reqBody: any) {
        return this.driverService.createDriver(reqBody);
    }
    @UseGuards(JwtAuthGuard)
    @Get('list')
    @ApiOperation({ summary: 'Get all drivers' })
    async getDrivers(
        @Query('page') page: number,
        @Query('limit') limit: number,
        @Query('search') search: string
    ) {
        return this.driverService.getAllDrivers(page, limit, search);
    }


    @UseGuards(JwtAuthGuard)
    @Patch('update/:id')
    @ApiOperation({ summary: 'Update driver details' })
    async updateDriver(@Param('id') id: number, @Body() reqBody: any) {
        return this.driverService.updateDriver(id, reqBody);
    }
    @UseGuards(JwtAuthGuard)
    @Delete('delete/:id')
    @ApiOperation({ summary: 'Delete driver (soft delete)' })
    async deleteDriver(@Param('id') id: number) {
        return this.driverService.deleteDriver(id);
    }

    @UseGuards(JwtAuthGuard)
    @Patch('change-status/:id')
    async changeStatus(@Param('id') id: string, @Body() body: { isActive: boolean }) {
        return this.driverService.changeStatus(Number(id), body.isActive);
    }
    @UseGuards(JwtAuthGuard)
    @Get(':mobileNumber')
    @ApiOperation({ summary: 'Get driver by Mobile Number' })
    async getDriver(@Param('mobileNumber') mobileNumber: string) {
        return this.driverService.getDriverByMobileNumber(mobileNumber);
    }

    @UseGuards(JwtAuthGuard)
    @Post('bulkUpload')
    @ApiOperation({ summary: 'Bulk upload of drivers' })
    async bulkUpload(@Body() reqBody: any) {
        return this.driverService.bulkUpload(reqBody);
    }   

}
