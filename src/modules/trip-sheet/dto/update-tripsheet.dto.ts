import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsDateString,
  IsArray,
} from 'class-validator';

export class UpdateTripSheetDto {
  @IsInt()
  tripSheetId: number;

  @IsOptional()
  @IsDateString()
  startTime?: string;

  @IsOptional()
  @IsDateString()
  endTime?: string;

//   @IsOptional()
  @IsNumber()
  startOdometer?: number;

  @IsOptional()
  @IsNumber()
  endOdometer?: number;

  @IsOptional()
  @IsString()
  sourceName?: string;

  @IsOptional()
  @IsString()
  destinationName?: string;

  // ---- Lat / Lng ----
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 7 })
  startLat?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 7 })
  startLng?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 7 })
  endLat?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 7 })
  endLng?: number;

  // ---- Signatures ----
  @IsOptional()
  @IsString()
  driverSign?: string;

  @IsOptional()
  @IsString()
  userSign?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 7 })
  driverSignLat?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 7 })
  driverSignLng?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 7 })
  userSignLat?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 7 })
  userSignLng?: number;

  // ---- Documents ----
  @IsOptional()
  documents?: any[];
}
