import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpStatus,
  HttpCode,
  UseGuards,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { ApiKeyService } from './api-key.service';
import { AdminScopeGuard } from './scope.guard';
import { ApiKeyGuard } from './api-key.guard';
import { CreateApiKeyDto, UpdateApiKeyDto, ApiKeyResponseDto } from './dto/api-key.dto';
import { PaginationQueryDto, PaginatedResponse } from '../common/dto/pagination.dto';

@ApiTags('API Keys')
@Controller('v1/api-keys')
export class ApiKeysController {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  @Post()
  @UseGuards(ApiKeyGuard, AdminScopeGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new API key' })
  @ApiBody({ type: CreateApiKeyDto })
  @ApiResponse({
    status: 201,
    description: 'API key created successfully',
    schema: {
      type: 'object',
      properties: {
        apiKey: { type: 'string', description: 'The generated API key (save this securely!)' },
        keyData: { $ref: '#/components/schemas/ApiKeyResponseDto' },
      },
    },
  })
  async createApiKey(@Body() createDto: CreateApiKeyDto) {
    return this.apiKeyService.createApiKey(createDto.name, createDto.scopes);
  }

  @Get()
  @UseGuards(ApiKeyGuard, AdminScopeGuard)
  @ApiOperation({ summary: 'List all API keys with pagination' })
  @ApiResponse({
    status: 200,
    description: 'API keys retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: { $ref: '#/components/schemas/ApiKeyResponseDto' },
        },
        meta: {
          type: 'object',
          properties: {
            page: { type: 'number' },
            limit: { type: 'number' },
            total: { type: 'number' },
            totalPages: { type: 'number' },
            hasNext: { type: 'boolean' },
            hasPrev: { type: 'boolean' },
          },
        },
      },
    },
  })
  async getAllApiKeys(
    @Query() paginationQuery: PaginationQueryDto,
  ): Promise<PaginatedResponse<ApiKeyResponseDto>> {
    return this.apiKeyService.getAllApiKeys(
      paginationQuery.page || 1,
      paginationQuery.limit || 10,
    );
  }

  @Get(':id')
  @UseGuards(ApiKeyGuard, AdminScopeGuard)
  @ApiOperation({ summary: 'Get a specific API key by ID' })
  @ApiParam({ name: 'id', description: 'API key ID' })
  @ApiResponse({
    status: 200,
    description: 'API key retrieved successfully',
    schema: { $ref: '#/components/schemas/ApiKeyResponseDto' },
  })
  async getApiKey(@Param('id') id: string): Promise<ApiKeyResponseDto> {
    return this.apiKeyService.getApiKeyById(id);
  }

  @Put(':id')
  @UseGuards(ApiKeyGuard, AdminScopeGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update an API key' })
  @ApiParam({ name: 'id', description: 'API key ID' })
  @ApiBody({ type: UpdateApiKeyDto })
  @ApiResponse({
    status: 200,
    description: 'API key updated successfully',
    schema: { $ref: '#/components/schemas/ApiKeyResponseDto' },
  })
  async updateApiKey(
    @Param('id') id: string,
    @Body() updateDto: UpdateApiKeyDto,
  ): Promise<ApiKeyResponseDto> {
    return this.apiKeyService.updateApiKey(id, updateDto);
  }

  @Delete(':id')
  @UseGuards(ApiKeyGuard, AdminScopeGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an API key' })
  @ApiParam({ name: 'id', description: 'API key ID' })
  @ApiResponse({
    status: 204,
    description: 'API key deleted successfully',
  })
  async deleteApiKey(@Param('id') id: string): Promise<void> {
    return this.apiKeyService.deleteApiKey(id);
  }

  @Post(':id/regenerate')
  @UseGuards(ApiKeyGuard, AdminScopeGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Regenerate an API key (creates new key, invalidates old one)' })
  @ApiParam({ name: 'id', description: 'API key ID' })
  @ApiResponse({
    status: 200,
    description: 'API key regenerated successfully',
    schema: {
      type: 'object',
      properties: {
        apiKey: { type: 'string', description: 'The new generated API key (save this securely!)' },
        keyData: { $ref: '#/components/schemas/ApiKeyResponseDto' },
      },
    },
  })
  async regenerateApiKey(@Param('id') id: string) {
    return this.apiKeyService.regenerateApiKey(id);
  }
}