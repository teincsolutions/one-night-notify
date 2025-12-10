import { IsString, IsIn, IsOptional, IsObject } from 'class-validator';

export class DeviceRegisterDto {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsString()
  @IsIn(['ios', 'android'])
  platform: string;

  @IsString()
  fcmToken: string;

  @IsOptional()
  @IsObject()
  meta?: Record<string, any>;
}
