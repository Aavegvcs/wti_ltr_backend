
import { Body, Controller, Get, Param, Patch, Post, Query, Delete, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { VehicleService } from './vehicle.service';
import { JwtAuthGuard } from '@modules/auth/jwt-auth.guard';

@ApiTags('vehicle')
@Controller('vehicle')
export class VehicleController {
    constructor(private readonly vehicleService: VehicleService) {}

    @Post('create')
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Create a new vehicle' })
    async createVehicle(@Body() body: any) {
        return this.vehicleService.createVehicle(body);
    }

    @Get('list')
    @ApiOperation({ summary: 'Get all vehicles' })
    async listVehicles(
        @Query('page') page: number,
        @Query('limit') limit: number,
        @Query('search') search: string
    ) {
        return this.vehicleService.getAllVehicles(page, limit, search);
    }

    @Get(':vehicleNumber')
    @ApiOperation({ summary: 'Get vehicle by vehicle number' })
    async getVehicle(@Param('vehicleNumber') vehicleNumber: string) {
        return this.vehicleService.getVehicleByNumber(vehicleNumber);
    }

    @Patch('update/:id')
    @ApiOperation({ summary: 'Update vehicle' })
    async updateVehicle(@Param('id') id: string, @Body() body: any) {
        return this.vehicleService.updateVehicle(Number(id), body);
    }

    @Delete('delete/:id')
    @ApiOperation({ summary: 'Delete vehicle' })
    async deleteVehicle(@Param('id') id: string) {
        return this.vehicleService.deleteVehicle(Number(id));
    }

    @Patch('change-status/:id')
    @ApiOperation({ summary: 'Activate/Deactivate vehicle' })
    async changeStatus(@Param('id') id: string, @Body() body: { isActive: boolean }) {
        return this.vehicleService.changeStatus(Number(id), body.isActive);
    }
}
