
import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CvdMappingService } from './cvd-mapping.service';
import { JwtAuthGuard } from '@modules/auth/jwt-auth.guard';

@ApiTags('cvd-mapping')
@Controller('cvd-mapping')
export class CvdMappingController {
    constructor(private readonly cvdService: CvdMappingService) { }
    @UseGuards(JwtAuthGuard)
    @Post('create')
    @ApiOperation({ summary: "Create a new CVD Mapping" })
    create(@Body() body: any) {
        return this.cvdService.createMapping(body);
    }
    @UseGuards(JwtAuthGuard)
    @Get('list')
    @ApiOperation({ summary: "List all mappings" })
    list() {
        return this.cvdService.listMappings();
    }

    @UseGuards(JwtAuthGuard)
    @Get('by-corporate/:id')
    getCorporate(@Param('id') id: string) {
        return this.cvdService.getByCorporate(Number(id));
    }

    @UseGuards(JwtAuthGuard)
    @Get('by-vehicle/:id')
    getVehicle(@Param('id') id: string) {
        return this.cvdService.getByVehicle(Number(id));
    }

    @UseGuards(JwtAuthGuard)
    @Get('by-driver/:id')
    getDriver(@Param('id') id: string) {
        return this.cvdService.getByDriver(Number(id));
    }

    @UseGuards(JwtAuthGuard)
    @Patch('update/:id')
    update(@Param('id') id: string, @Body() body: any) {
        return this.cvdService.updateMapping(Number(id), body);
    }

    @UseGuards(JwtAuthGuard)
    @Patch('change-status/:id')
    changeStatus(@Param('id') id: string, @Body() body: { isActive: boolean }) {
        return this.cvdService.changeStatus(Number(id), body.isActive);
    }

    @UseGuards(JwtAuthGuard)
    @Delete('delete/:id')
    delete(@Param('id') id: string) {
        return this.cvdService.deleteMapping(Number(id));
    }
}
