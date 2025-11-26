
import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@modules/auth/jwt-auth.guard';
import { DriverService } from './driver.service';

@ApiTags('driver')
@Controller('driver')
export class DriverController {
    constructor(private readonly driverService: DriverService) {}

    @UseGuards(JwtAuthGuard)
    @Post('create')
    @ApiOperation({ summary: 'this api create new driver' })
    async createDriver(@Body() reqBody: any) {
        const response = await this.driverService.createDriver(reqBody);
        return response;
    }

}
