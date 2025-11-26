import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { TripSheetService } from './trip-sheet.service';
import { JwtAuthGuard } from '@modules/auth/jwt-auth.guard';

@ApiTags('trip-sheet')
@Controller('tripsheet')
export class TripSheetController {
    constructor(private readonly tripSheetService: TripSheetService) {}

    @Post('get-or-create')
    @ApiOperation({ summary: 'Get or create trip sheet by driver mobile & date' })
    async getOrCreateTripSheet(@Body() body: any) {
        return this.tripSheetService.getTripSheetByMobile(body);
    }

    @Patch('save/:id')
    @ApiOperation({ summary: 'Save draft / update trip sheet (status remains OPEN)' })
    async saveTripSheet(@Param('id') id: number, @Body() body: any) {
        return this.tripSheetService.saveTripSheet(id, body);
    }

    @Patch('submit/:id')
    @ApiOperation({ summary: 'Submit trip sheet (status = SUBMITTED)' })
    async submitTripSheet(@Param('id') id: number) {
        return this.tripSheetService.submitTripSheet(id);
    }

    @Patch('close/:id')
    @ApiOperation({ summary: 'Close trip sheet (status = CLOSED)' })
    async closeTripSheet(@Param('id') id: number) {
        return this.tripSheetService.closeTripSheet(id);
    }

    @Patch('reopen/:id')
    @ApiOperation({ summary: 'Reopen trip sheet (status = OPEN)' })
    async reopenTripSheet(@Param('id') id: number) {
        return this.tripSheetService.reopenTripSheet(id);
    }

    @Get('driver/:id')
    @ApiOperation({ summary: 'Get all trip sheets for a driver' })
    async getTripsByDriver(@Param('id') driverId: number) {
        return this.tripSheetService.getTripsByDriver(driverId);
    }
}
