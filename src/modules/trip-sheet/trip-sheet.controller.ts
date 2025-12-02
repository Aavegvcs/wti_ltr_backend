import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { TripSheetService } from './trip-sheet.service';
import { JwtAuthGuard } from '@modules/auth/jwt-auth.guard';
import { UpdateTripSheetDto } from './dto/update-tripsheet.dto';

@ApiTags('trip-sheet')
@Controller('tripsheet')
export class TripSheetController {
    constructor(private readonly tripSheetService: TripSheetService) {}

    @Post('newTripsheetApi')
    @ApiOperation({ summary: 'Get or create trip sheet by driver mobile & date' })
    async newTripsheetApi(@Body() body: any) {
        return this.tripSheetService.newTripsheetApi(body);
    }
    @Patch('updateTripsheetApi')
    @ApiOperation({ summary: 'Get or udpate trip sheet by driver mobile & date' })
    async updateTripsheetApi(@Body() body: any) {
        return this.tripSheetService.updateTripsheetByDriver(body);
    }
    @UseGuards(JwtAuthGuard)
    @Patch('updateTripSheetByAdmin')
    @ApiOperation({ summary: 'Get or udpate trip sheet by admin' })
    async updateTripSheetByAdmin(@Body() body: any) {
        // console.log("in controller ----------", body);

        return this.tripSheetService.updateTripSheetByAdmin(body);
    }

    @UseGuards(JwtAuthGuard)
    @Patch('updateStatusByAdmin')
    @ApiOperation({ summary: 'udpate trip status by admin' })
    async updateStatusByAdmin(@Body() body: any) {
        // console.log("in controller ----------", body);

        return this.tripSheetService.updateStatusByAdmin(body);
    }

    @UseGuards(JwtAuthGuard)
    @Post('getTripSheetForAdmin')
    @ApiOperation({ summary: 'Get trip sheet for corporate admin' })
    async getTripSheetForAdmin(@Body() body: any) {
        return this.tripSheetService.getTripSheetForAdmin(body);
    }
    @UseGuards(JwtAuthGuard)
    @Post('getTripSheetForOperations')
    @ApiOperation({ summary: 'Get trip sheet for corporate admin' })
    async getTripSheetForOperations(@Body() body: any) {

        return this.tripSheetService.getTripSheetForOperations(body);
    }

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
