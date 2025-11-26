import { Controller, Get, Post, Body, Param, Req, UseGuards, Put } from '@nestjs/common';
import { CorporateService } from './corporate.service';
import { AuthService } from '../auth/auth.service';
import { MediaService } from '../media/media.service';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@modules/auth/jwt-auth.guard';
@ApiTags('Company')
@Controller('companies')
export class CorporateController {
    constructor(
        private readonly corporateService: CorporateService,
    ) { }

    // @UseGuards(JwtAuthGuard)
    // @Post('create')
    // async create(@Body() createCompanyDto: CompanyCreateDto, @Req() req: any) {
    //     await this.corporateService.create(createCompanyDto, req);
    // }

    @UseGuards(JwtAuthGuard)
    @Post('list')
    async companyList(@Req() req: any): Promise<any> {
        const { res, qb } = await this.corporateService.companyList(req);

        return {
            items: res,
            qb
        };
    }

    @UseGuards(JwtAuthGuard)
    @Post('edit')
    async findOne(@Req() req: any) {
        return await this.corporateService.findOneById(req.body.id);
    }

    // @UseGuards(JwtAuthGuard)
    // @Put('update')
    // async updateOne(@Body(SETTINGS.VALIDATION_PIPE) updateCompanyDto: CompanyUpdateDto, @Req() req: any) {
    //     return await this.corporateService.updateCompany(updateCompanyDto, req);
    // }

    // @UseGuards(JwtAuthGuard)
    // @Post('delete')
    // async deleteCompany(@Req() req: any) {
    //     return await this.corporateService.deleteCompany(req);
    // }

    @UseGuards(JwtAuthGuard)
    @Get(':id')
    async findOneById(@Param() params: any) {
        await this.corporateService.findCorporateById(params.id);
    }
    @UseGuards(JwtAuthGuard)
    @Get()
    async getAllCompanies() {
        return await this.corporateService.getAllCompanies();
    }

}
