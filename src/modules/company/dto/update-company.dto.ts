
import { PartialType } from '@nestjs/swagger';
import { CreateCorporateDto } from './company-create.dto';

export class UpdateCorporateDto extends PartialType(CreateCorporateDto) {
  id: number;
}
