import {
  IsString,
  IsObject,
  IsOptional,
  IsArray,
  ArrayNotEmpty,
} from 'class-validator';

export class DeviceNotificationDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  tokens: string[];

  @IsString()
  title: string;

  @IsString()
  body: string;

  @IsOptional()
  @IsObject()
  data?: Record<string, any>;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsString()
  image?: string;

  @IsOptional()
  @IsString()
  clickAction?: string;
}