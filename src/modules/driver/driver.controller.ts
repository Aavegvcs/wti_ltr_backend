
// import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
// import { ApiOperation, ApiTags } from '@nestjs/swagger';
// import { JwtAuthGuard } from '@modules/auth/jwt-auth.guard';

// @ApiTags('driver')
// @Controller('driver')
// export class DriverController {
//     constructor() {}

//     // @UseGuards(JwtAuthGuard)
//     // @Post('createClaim')
//     // @ApiOperation({ summary: 'this api create new cliam' })
//     // async createClaim(@Body() reqBody: any) {
//     //     const response = await this._claimService.createClaim(reqBody);
//     //     return response;
//     // }

// }
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

    @Get('list')
    @ApiOperation({ summary: 'Get all drivers' })
    async getDrivers(
        @Query('page') page: number,
        @Query('limit') limit: number,
        @Query('search') search: string
    ) {
        return this.driverService.getAllDrivers(page, limit, search);
    }



    @Patch('update/:id')
    @ApiOperation({ summary: 'Update driver details' })
    async updateDriver(@Param('id') id: number, @Body() reqBody: any) {
        return this.driverService.updateDriver(id, reqBody);
    }

    @Delete('delete/:id')
    @ApiOperation({ summary: 'Delete driver (soft delete)' })
    async deleteDriver(@Param('id') id: number) {
        return this.driverService.deleteDriver(id);
    }

    // @Patch('change-status/:id')
    // @ApiOperation({ summary: 'Activate/Deactivate driver' })
    // async changeStatus(@Param('id') id: number, @Body() body: { isActive: boolean }) {
    //     return this.driverService.changeStatus(id, body.isActive);
    // }
    @Patch('change-status/:id')
    async changeStatus(@Param('id') id: string, @Body() body: { isActive: boolean }) {
        return this.driverService.changeStatus(Number(id), body.isActive);
    }
    @Get(':mobileNumber')
    @ApiOperation({ summary: 'Get driver by Mobile Number' })
    async getDriver(@Param('mobileNumber') mobileNumber: string) {
        return this.driverService.getDriverByMobileNumber(mobileNumber);
    }

}
