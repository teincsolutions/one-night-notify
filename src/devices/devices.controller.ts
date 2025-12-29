import {
  Controller,
  Post,
  Body,
  HttpStatus,
  HttpCode,
  Put,
  Headers,
  UseGuards,
  Get,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { DevicesService } from './devices.service';
import { DeviceRegisterDto } from '../common/dto/device-register.dto';
import { PaginationQueryDto, PaginatedResponse } from '../common/dto/pagination.dto';
import { ApiKeyGuard } from '../auth/api-key.guard';
import { PersonalOrAdminScopeGuard, AdminScopeGuard } from '../auth/scope.guard';

@ApiTags('Devices')
@Controller('v1/devices')
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Post('register')
  @UseGuards(ApiKeyGuard, PersonalOrAdminScopeGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a device with FCM token' })
  @ApiBody({ type: DeviceRegisterDto })
  @ApiResponse({
    status: 201,
    description: 'Device registered successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        userId: { type: 'string', nullable: true },
        platform: { type: 'string', enum: ['ios', 'android'] },
        fcmToken: { type: 'string' },
        lastSeenAt: { type: 'string', format: 'date-time' },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  async register(@Body() deviceData: DeviceRegisterDto) {
    return this.devicesService.registerDevice(deviceData);
  }

  @Put('tokens/refresh')
  @UseGuards(ApiKeyGuard, PersonalOrAdminScopeGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh FCM token for device' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        oldToken: { type: 'string', description: 'Current FCM token' },
        newToken: { type: 'string', description: 'New FCM token' },
      },
      required: ['oldToken', 'newToken'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Token refreshed successfully',
  })
  async refreshToken(@Body() body: { oldToken: string; newToken: string }) {
    return this.devicesService.refreshToken(body.oldToken, body.newToken);
  }

  @Get('admin/all')
  @UseGuards(ApiKeyGuard, AdminScopeGuard)
  @ApiOperation({ summary: 'Get all devices (admin only)' })
  @ApiResponse({
    status: 200,
    description: 'All devices retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              userId: { type: 'string', nullable: true },
              platform: { type: 'string', enum: ['ios', 'android'] },
              fcmToken: { type: 'string' },
              lastSeenAt: { type: 'string', format: 'date-time' },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
          },
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
  async getAllDevices(
    @Query() paginationQuery: PaginationQueryDto,
  ): Promise<PaginatedResponse<any>> {
    return this.devicesService.getAllDevices(
      paginationQuery.page || 1,
      paginationQuery.limit || 10,
    );
  }
}
