import { UpdateBranchDto } from './../branch/dto/update-branch.dto';
import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { CorporateService } from './corporate.service';
import { JwtAuthGuard } from '@modules/auth/jwt-auth.guard';
import { CreateCorporateDto } from './dto/company-create.dto';
import { UpdateCorporateDto } from './dto/update-company.dto';

@Controller('companies')
export class CorporateController {
    constructor(private readonly corporateService: CorporateService) { }

    @UseGuards(JwtAuthGuard)
    @Post('list')
    getList(@Body() body: any) {
        return this.corporateService.companyList(body);
    }

    @UseGuards(JwtAuthGuard)
    @Post('create')
    create(@Body() createDto: CreateCorporateDto) {
        return this.corporateService.createCorporate(createDto);
    }

    @UseGuards(JwtAuthGuard)
    @Put('update')
    update(@Body() updateDto: UpdateCorporateDto) {
        return this.corporateService.updateCorporate(updateDto);
    }

    @UseGuards(JwtAuthGuard)
    @Post('delete')
    delete(@Body() body: { id: number }) {
        return this.corporateService.deleteCorporate(body.id);
    }

    @UseGuards(JwtAuthGuard)
    @Get(':id')
    findOne(@Param('id') id: number) {
        return this.corporateService.findCorporateById(id);
    }
  

}
