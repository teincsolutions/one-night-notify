import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Patch,
  Query,
  HttpStatus,
  HttpCode,
  UseGuards,
  Headers,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { TopicNotificationDto } from '../common/dto/topic-notification.dto';
import { PersonalNotificationDto } from '../common/dto/personal-notification.dto';
import { DeviceNotificationDto } from '../common/dto/device-notification.dto';
import {
  PaginationQueryDto,
  PaginatedResponse,
} from '../common/dto/pagination.dto';
import { PrismaService } from '../database/prisma.service';
import { ApiKeyGuard } from '../auth/api-key.guard';
import {
  TopicScopeGuard,
  PersonalScopeGuard,
  AdminScopeGuard,
  PersonalOrAdminScopeGuard,
  PersonalOrAdminWithUserIdGuard,
} from '../auth/scope.guard';
import {
  RequireTopicScope,
  RequirePersonalScope,
} from '../auth/scopes.decorator';
import { UserStatusService } from './user-status.service';
import { RequireAdminScope } from '../auth/scopes.decorator';

@ApiTags('Notifications')
@Controller('v1/notifications')
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly userStatusService: UserStatusService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('topic')
  @UseGuards(ApiKeyGuard, TopicScopeGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send notification to topic subscribers' })
  @ApiBody({ type: TopicNotificationDto })
  @ApiResponse({
    status: 200,
    description: 'Topic notification sent successfully',
    schema: {
      type: 'object',
      properties: {
        notificationId: { type: 'string' },
        fcmResponse: { type: 'object' },
      },
    },
  })
  async sendToTopic(
    @Body() topicData: TopicNotificationDto,
    @Headers() headers: any,
  ) {
    return this.notificationsService.sendTopicNotification(
      topicData,
      headers['x-api-key'], // creator identifier
    );
  }

  @Post('personal')
  @UseGuards(ApiKeyGuard, PersonalScopeGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send personal notification to specific users' })
  @ApiBody({ type: PersonalNotificationDto })
  @ApiResponse({
    status: 200,
    description: 'Personal notification sent successfully',
    schema: {
      type: 'object',
      properties: {
        notificationId: { type: 'string' },
        fcmResponses: { type: 'array' },
      },
    },
  })
  async sendPersonal(
    @Body() personalData: PersonalNotificationDto,
    @Headers() headers: any,
  ) {
    return this.notificationsService.sendPersonalNotification(
      personalData,
      headers['x-api-key'], // creator identifier
    );
  }

  @Post('device')
  @UseGuards(ApiKeyGuard, PersonalScopeGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send notification directly to specific device tokens' })
  @ApiBody({ type: DeviceNotificationDto })
  @ApiResponse({
    status: 200,
    description: 'Device notification sent successfully',
    schema: {
      type: 'object',
      properties: {
        notificationId: { type: 'string' },
        sent: {
          type: 'object',
          properties: {
            count: { type: 'number' },
            fcmResponses: { type: 'array' },
          },
        },
        invalidTokens: {
          type: 'array',
          items: { type: 'string' },
        },
      },
    },
  })
  async sendToDevices(
    @Body() deviceData: DeviceNotificationDto,
    @Headers() headers: any,
  ) {
    return this.notificationsService.sendDeviceNotification(
      deviceData,
      headers['x-api-key'], // creator identifier
    );
  }

  @Get('user/:userId/history')
  @UseGuards(ApiKeyGuard, PersonalOrAdminScopeGuard)
  @ApiOperation({ summary: 'Get user notifications history' })
  @ApiParam({ name: 'userId', description: 'User ID', type: String })
  @ApiResponse({
    status: 200,
    description: 'Notifications retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              targetId: { type: 'string' },
              type: { type: 'string', enum: ['topic', 'personal'] },
              title: { type: 'string' },
              body: { type: 'string' },
              data: { type: 'object' },
              topic: { type: 'string', nullable: true },
              createdAt: { type: 'string', format: 'date-time' },
              read: { type: 'boolean' },
              deliveredAt: {
                type: 'string',
                format: 'date-time',
                nullable: true,
              },
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
  async getUserNotifications(
    @Param('userId') userId: string,
    @Query() paginationQueryDto: PaginationQueryDto,
  ): Promise<PaginatedResponse<any>> {
    await this.checkUserExists(userId);
    return this.notificationsService.getNotificationsForUser(
      userId,
      paginationQueryDto.page || 1,
      paginationQueryDto.limit || 10,
    );
  }

  @Get('device/:deviceId/history')
  @UseGuards(ApiKeyGuard, PersonalScopeGuard)
  @ApiOperation({ summary: 'Get device notifications history by device ID' })
  @ApiParam({ name: 'deviceId', description: 'Device ID', type: String })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number (default: 1)',
    type: Number,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Items per page (default: 10, max: 100)',
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Device notifications retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              targetId: { type: 'string' },
              type: { type: 'string', enum: ['topic', 'personal', 'device'] },
              title: { type: 'string' },
              body: { type: 'string' },
              data: { type: 'object' },
              topic: { type: 'string', nullable: true },
              createdAt: { type: 'string', format: 'date-time' },
              read: { type: 'boolean' },
              deliveredAt: {
                type: 'string',
                format: 'date-time',
                nullable: true,
              },
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
  @ApiResponse({
    status: 404,
    description: 'Device not found',
  })
  async getDeviceNotifications(
    @Param('deviceId') deviceId: string,
    @Query() paginationQueryDto: PaginationQueryDto,
  ): Promise<PaginatedResponse<any>> {
    return this.notificationsService.getNotificationsForDevice(
      deviceId,
      paginationQueryDto.page || 1,
      paginationQueryDto.limit || 10,
      false, // byToken = false
    );
  }

  @Get('device/token/:fcmToken/history')
  @UseGuards(ApiKeyGuard, PersonalScopeGuard)
  @ApiOperation({ summary: 'Get device notifications history by FCM token' })
  @ApiParam({ name: 'fcmToken', description: 'FCM token', type: String })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number (default: 1)',
    type: Number,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Items per page (default: 10, max: 100)',
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Device notifications retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              targetId: { type: 'string' },
              type: { type: 'string', enum: ['topic', 'personal', 'device'] },
              title: { type: 'string' },
              body: { type: 'string' },
              data: { type: 'object' },
              topic: { type: 'string', nullable: true },
              createdAt: { type: 'string', format: 'date-time' },
              read: { type: 'boolean' },
              deliveredAt: {
                type: 'string',
                format: 'date-time',
                nullable: true,
              },
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
  @ApiResponse({
    status: 404,
    description: 'Device not found',
  })
  async getDeviceNotificationsByToken(
    @Param('fcmToken') fcmToken: string,
    @Query() paginationQueryDto: PaginationQueryDto,
  ): Promise<PaginatedResponse<any>> {
    return this.notificationsService.getNotificationsForDevice(
      fcmToken,
      paginationQueryDto.page || 1,
      paginationQueryDto.limit || 10,
      true, // byToken = true
    );
  }

  @Get(':id')
  @UseGuards(ApiKeyGuard, PersonalOrAdminWithUserIdGuard)
  @ApiOperation({ summary: 'Get specific notification by target ID' })
  @ApiParam({ name: 'id', description: 'Notification target ID' })
  @ApiQuery({
    name: 'userId',
    required: false,
    description:
      'User ID (required for personal scope, optional for admin scope)',
  })
  @ApiResponse({
    status: 200,
    description: 'Notification retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        targetId: { type: 'string' },
        type: { type: 'string', enum: ['topic', 'personal'] },
        title: { type: 'string' },
        body: { type: 'string' },
        data: { type: 'object' },
        topic: { type: 'string', nullable: true },
        createdAt: { type: 'string', format: 'date-time' },
        read: { type: 'boolean' },
        deliveredAt: { type: 'string', format: 'date-time', nullable: true },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Notification not found',
  })
  async getNotificationById(
    @Param('id') targetId: string,
    @Query('userId') userId?: string,
  ) {
    return this.notificationsService.getNotificationByTargetId(
      targetId,
      userId,
    );
  }

  @Patch('user/:userId/mark-read/:targetId')
  @UseGuards(ApiKeyGuard, PersonalScopeGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark notification as read' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiParam({
    name: 'targetId',
    description: 'Notification target ID (from notification history)',
  })
  @ApiResponse({
    status: 200,
    description: 'Notification marked as read',
  })
  async markAsRead(
    @Param('userId') userId: string,
    @Param('targetId') targetId: string,
  ) {
    await this.checkUserExists(userId);
    return this.notificationsService.markNotificationRead(targetId, userId);
  }

  @Patch('user/:userId/mark-read')
  @UseGuards(ApiKeyGuard, PersonalScopeGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark multiple notifications as read' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        targetIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of notification target IDs to mark as read',
        },
      },
      required: ['targetIds'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Notifications marked as read',
    schema: {
      type: 'object',
      properties: {
        markedAsRead: { type: 'number' },
        targetIds: {
          type: 'array',
          items: { type: 'string' },
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description:
      'Some notification targets not found or do not belong to the user',
  })
  async markMultipleAsRead(
    @Param('userId') userId: string,
    @Body() body: { targetIds: string[] },
  ) {
    await this.checkUserExists(userId);
    return this.notificationsService.markNotificationsRead(
      body.targetIds,
      userId,
    );
  }

  @Patch('device/:deviceId/mark-read/:targetId')
  @UseGuards(ApiKeyGuard, PersonalScopeGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark device notification as read' })
  @ApiParam({ name: 'deviceId', description: 'Device ID' })
  @ApiParam({
    name: 'targetId',
    description: 'Notification target ID (from device notification history)',
  })
  @ApiResponse({
    status: 200,
    description: 'Notification marked as read',
  })
  @ApiResponse({
    status: 404,
    description: 'Device or notification target not found',
  })
  async markDeviceNotificationAsRead(
    @Param('deviceId') deviceId: string,
    @Param('targetId') targetId: string,
  ) {
    return this.notificationsService.markDeviceNotificationRead(
      targetId,
      deviceId,
      false, // byToken = false
    );
  }

  @Patch('device/token/:fcmToken/mark-read/:targetId')
  @UseGuards(ApiKeyGuard, PersonalScopeGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark device notification as read by FCM token' })
  @ApiParam({ name: 'fcmToken', description: 'FCM token' })
  @ApiParam({
    name: 'targetId',
    description: 'Notification target ID (from device notification history)',
  })
  @ApiResponse({
    status: 200,
    description: 'Notification marked as read',
  })
  @ApiResponse({
    status: 404,
    description: 'Device or notification target not found',
  })
  async markDeviceNotificationAsReadByToken(
    @Param('fcmToken') fcmToken: string,
    @Param('targetId') targetId: string,
  ) {
    return this.notificationsService.markDeviceNotificationRead(
      targetId,
      fcmToken,
      true, // byToken = true
    );
  }

  @Patch('device/:deviceId/mark-read')
  @UseGuards(ApiKeyGuard, PersonalScopeGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark multiple device notifications as read' })
  @ApiParam({ name: 'deviceId', description: 'Device ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        targetIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of notification target IDs to mark as read',
        },
      },
      required: ['targetIds'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Notifications marked as read',
    schema: {
      type: 'object',
      properties: {
        markedAsRead: { type: 'number' },
        targetIds: {
          type: 'array',
          items: { type: 'string' },
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Device not found or some notification targets not found',
  })
  async markDeviceNotificationsAsRead(
    @Param('deviceId') deviceId: string,
    @Body() body: { targetIds: string[] },
  ) {
    return this.notificationsService.markDeviceNotificationsRead(
      body.targetIds,
      deviceId,
      false, // byToken = false
    );
  }

  @Patch('device/token/:fcmToken/mark-read')
  @UseGuards(ApiKeyGuard, PersonalScopeGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark multiple device notifications as read by FCM token' })
  @ApiParam({ name: 'fcmToken', description: 'FCM token' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        targetIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of notification target IDs to mark as read',
        },
      },
      required: ['targetIds'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Notifications marked as read',
    schema: {
      type: 'object',
      properties: {
        markedAsRead: { type: 'number' },
        targetIds: {
          type: 'array',
          items: { type: 'string' },
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Device not found or some notification targets not found',
  })
  async markDeviceNotificationsAsReadByToken(
    @Param('fcmToken') fcmToken: string,
    @Body() body: { targetIds: string[] },
  ) {
    return this.notificationsService.markDeviceNotificationsRead(
      body.targetIds,
      fcmToken,
      true, // byToken = true
    );
  }

  @Post('sync')
  @UseGuards(ApiKeyGuard, PersonalScopeGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sync notifications for client (optional)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        userId: { type: 'string' },
        lastSyncTimestamp: { type: 'string', format: 'date-time' },
      },
      required: ['userId'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Notifications synced',
  })
  async syncNotifications(
    @Body() body: { userId: string; lastSyncTimestamp?: string },
  ) {
    // For implementation, this would return notifications since lastSyncTimestamp
    // Simplified to return all notifications for user with default pagination
    return this.notificationsService.getNotificationsForUser(
      body.userId,
      1,
      50,
    );
  }

  @Post('user/:userId/status/pause')
  @UseGuards(ApiKeyGuard, PersonalScopeGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Pause notification delivery for a user' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        durationMinutes: {
          type: 'number',
          description:
            'Duration to pause in minutes (default: 1440 = 24 hours)',
          default: 1440,
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Notification delivery paused',
    schema: {
      type: 'object',
      properties: {
        pausedUntil: { type: 'string', format: 'date-time' },
      },
    },
  })
  async pauseNotifications(
    @Param('userId') userId: string,
    @Body() body: { durationMinutes?: number },
  ) {
    await this.checkUserExists(userId);
    const duration = body.durationMinutes || 1440; // Default 24 hours
    await this.userStatusService.pauseNotifications(userId, duration);
    const status = await this.userStatusService.getUserStatus(userId);
    return { pausedUntil: status.pausedUntil };
  }

  @Post('user/:userId/status/resume')
  @UseGuards(ApiKeyGuard, PersonalScopeGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resume notification delivery for a user' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'User set online',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
      },
    },
  })
  async resumeNotifications(@Param('userId') userId: string) {
    await this.checkUserExists(userId);
    await this.userStatusService.resumeNotifications(userId);
    return { success: true };
  }

  @Get('user-status/:userId')
  @UseGuards(ApiKeyGuard, PersonalScopeGuard)
  @ApiOperation({ summary: 'Get user notification status' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'User status retrieved',
    schema: {
      type: 'object',
      properties: {
        userId: { type: 'string' },
        lastSeenAt: { type: 'string', format: 'date-time', nullable: true },
        pausedUntil: { type: 'string', format: 'date-time', nullable: true },
        isPaused: { type: 'boolean' },
      },
    },
  })
  async getUserStatus(@Param('userId') userId: string) {
    await this.checkUserExists(userId);
    return this.userStatusService.getUserStatus(userId);
  }

  @Get('admin/all')
  @UseGuards(ApiKeyGuard, AdminScopeGuard)
  @ApiOperation({ summary: 'Get all notifications (admin only)' })
  @ApiResponse({
    status: 200,
    description: 'All notifications retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              type: { type: 'string', enum: ['topic', 'personal'] },
              title: { type: 'string' },
              body: { type: 'string' },
              data: { type: 'object' },
              topic: { type: 'string', nullable: true },
              createdAt: { type: 'string', format: 'date-time' },
              createdBy: { type: 'string', nullable: true },
              targetsCount: { type: 'number' },
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
  async getAllNotifications(
    @Query() paginationQuery: PaginationQueryDto,
  ): Promise<PaginatedResponse<any>> {
    return this.notificationsService.getAllNotifications(
      paginationQuery.page || 1,
      paginationQuery.limit || 10,
    );
  }

  private async checkUserExists(userId: string): Promise<void> {
    const userDevices = await this.prisma.device.findMany({
      where: { userId },
      select: { id: true },
    });

    if (userDevices.length === 0) {
      throw new NotFoundException('User not found');
    }
  }
}
