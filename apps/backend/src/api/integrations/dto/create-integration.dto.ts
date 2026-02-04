import { IsString, IsEnum, IsOptional, IsObject, IsNumber } from 'class-validator';

export enum IntegrationType {
  TMS = 'TMS',
  HOS_ELD = 'HOS_ELD',
  FUEL_PRICE = 'FUEL_PRICE',
  WEATHER = 'WEATHER',
  TELEMATICS = 'TELEMATICS',
}

export enum IntegrationVendor {
  MCLEOD_TMS = 'MCLEOD_TMS',
  TMW_TMS = 'TMW_TMS',
  PROJECT44_TMS = 'PROJECT44_TMS',
  SAMSARA_ELD = 'SAMSARA_ELD',
  KEEPTRUCKIN_ELD = 'KEEPTRUCKIN_ELD',
  MOTIVE_ELD = 'MOTIVE_ELD',
  GASBUDDY_FUEL = 'GASBUDDY_FUEL',
  FUELFINDER_FUEL = 'FUELFINDER_FUEL',
  OPENWEATHER = 'OPENWEATHER',
}

export class CreateIntegrationDto {
  @IsEnum(IntegrationType)
  integration_type: IntegrationType;

  @IsEnum(IntegrationVendor)
  vendor: IntegrationVendor;

  @IsString()
  display_name: string;

  @IsObject()
  @IsOptional()
  credentials?: Record<string, any>;

  @IsNumber()
  @IsOptional()
  sync_interval_seconds?: number;
}
