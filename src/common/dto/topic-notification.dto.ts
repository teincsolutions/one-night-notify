import {
  IsString,
  IsObject,
  IsOptional,
  IsBoolean,
  IsArray,
} from 'class-validator';

export class TopicNotificationDto {
  @IsString()
  topic: string;

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
