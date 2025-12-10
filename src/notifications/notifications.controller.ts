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
import { ApiKeyGuard } from '../auth/api-key.guard';

@ApiTags('Notifications')
@Controller('v1/notifications')
@UseGuards(ApiKeyGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('topic')
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

  @Get()
  @ApiOperation({ summary: 'Get user notifications history' })
  @ApiQuery({ name: 'userId', required: true, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 50 })
  @ApiQuery({ name: 'offset', required: false, type: Number, example: 0 })
  @ApiResponse({
    status: 200,
    description: 'Notifications retrieved successfully',
    schema: {
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
          deliveredAt: { type: 'string', format: 'date-time', nullable: true },
        },
      },
    },
  })
  async getUserNotifications(
    @Query('userId') userId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 50;
    const offsetNum = offset ? parseInt(offset, 10) : 0;
    return this.notificationsService.getNotificationsForUser(
      userId,
      limitNum,
      offsetNum,
    );
  }

  @Patch(':id/mark-read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark notification as read' })
  @ApiParam({ name: 'id', description: 'Notification target ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        userId: {
          type: 'string',
          description: 'User ID who read the notification',
        },
      },
      required: ['userId'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Notification marked as read',
  })
  async markAsRead(
    @Param('id') targetId: string,
    @Body() body: { userId: string },
  ) {
    return this.notificationsService.markNotificationRead(
      targetId,
      body.userId,
    );
  }

  @Post('sync')
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
    // Simplified to return all notifications for user
    return this.notificationsService.getNotificationsForUser(body.userId);
  }
}
