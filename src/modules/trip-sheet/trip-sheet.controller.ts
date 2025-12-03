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

}
