import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsArray, IsOptional, IsNotEmpty } from 'class-validator';

export class CreateApiKeyDto {
  @ApiProperty({
    description: 'Name or description for the API key',
    example: 'Mobile App Key',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Scopes to assign to the API key',
    example: ['personal', 'topic'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  scopes: string[];
}

export class UpdateApiKeyDto {
  @ApiPropertyOptional({
    description: 'Updated name or description for the API key',
    example: 'Updated Mobile App Key',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiPropertyOptional({
    description: 'Updated scopes for the API key',
    example: ['personal', 'admin'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  scopes?: string[];
}

export class ApiKeyResponseDto {
  @ApiProperty({
    description: 'Unique identifier for the API key',
    example: 'api-key-uuid',
  })
  id: string;

  @ApiProperty({
    description: 'Name or description of the API key',
    example: 'Mobile App Key',
  })
  name: string;

  @ApiProperty({
    description: 'Scopes assigned to the API key',
    example: ['personal', 'topic'],
    type: [String],
  })
  scopes: string[];

  @ApiProperty({
    description: 'When the API key was created',
    example: '2025-12-09T22:50:00.000Z',
  })
  createdAt: string;
}