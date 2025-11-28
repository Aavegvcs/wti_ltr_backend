
import { ApiProperty } from '@nestjs/swagger';

export class CreateCorporateDto {

  @ApiProperty()
  corporateCode: string;

  @ApiProperty()
  corporateName: string;

  @ApiProperty({ required: false })
  timezone?: string;

  @ApiProperty({ required: false })
  corporateLogo?: string;

  @ApiProperty({ required: false })
  dateFormat?: string;

  @ApiProperty({ required: false })
  currency?: string;

  @ApiProperty({ required: false })
  phoneNumber?: string;

  @ApiProperty({ required: false })
  secondaryPhoneNumber?: string;

  @ApiProperty({ required: false })
  adminName?: string;

  @ApiProperty({ required: false })
  numberOfVehicle?: string;

  @ApiProperty({ required: false })
  gst?: string;

  @ApiProperty({ required: false })
  panNumber?: string;

  @ApiProperty({ required: false })
  po_number?: string;

  @ApiProperty({ required: false })
  po_date?: Date;

  @ApiProperty({ required: false })
  po_validity?: Date;

  @ApiProperty({ required: false })
  documents?: any;

  @ApiProperty({ required: false })
  address?: string;

  @ApiProperty({ required: false })
  fax?: string;

  @ApiProperty({ required: false })
  email?: string;

  @ApiProperty({ example: true })
  isActive?: boolean;

  @ApiProperty()
  country: number;

  @ApiProperty()
  state: number;
}
