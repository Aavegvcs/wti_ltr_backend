
import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@modules/auth/jwt-auth.guard';

@ApiTags('first-trip-sheet')
@Controller('first-tripsheet')
export class TripSheetController {
    constructor() {}

    // @UseGuards(JwtAuthGuard)
    // @Post('createClaim')
    // @ApiOperation({ summary: 'this api create new cliam' })
    // async createClaim(@Body() reqBody: any) {
    //     const response = await this._claimService.createClaim(reqBody);
    //     return response;
    // }

}
