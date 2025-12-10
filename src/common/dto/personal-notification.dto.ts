import {
  IsString,
  IsObject,
  IsOptional,
  IsArray,
  IsUUID,
  ArrayNotEmpty,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class PersonalNotificationDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('all', { each: true })
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  userIds: string[];

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
