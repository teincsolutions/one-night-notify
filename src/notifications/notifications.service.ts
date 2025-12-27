import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TopicNotificationDto } from '../common/dto/topic-notification.dto';
import { PersonalNotificationDto } from '../common/dto/personal-notification.dto';
import { PrismaService } from '../database/prisma.service';
import { FirebaseService, FCMMessage } from './firebase.service';
import { UserStatusService } from './user-status.service';

@Injectable()
export class NotificationsService {
  constructor(
    private prisma: PrismaService,
    private firebaseService: FirebaseService,
    private config: ConfigService,
    private userStatusService: UserStatusService,
  ) {}

  async sendTopicNotification(
    topicData: TopicNotificationDto,
    createdBy?: string,
  ) {
    // Create notification record
    const notification = await this.prisma.notification.create({
      data: {
        type: 'topic',
        title: topicData.title,
        body: topicData.body,
        data: topicData.data as any,
        topic: topicData.topic,
        createdBy,
      },
    });

    // Convert to FCM message format
    const fcmMessage: FCMMessage = {
      title: topicData.title,
      body: topicData.body,
      data: topicData.data
        ? this.convertDataToStringMap(topicData.data)
        : undefined,
      icon: topicData.icon,
      image: topicData.image,
      clickAction: topicData.clickAction,
    };

    try {
      // Send immediately via Firebase
      const fcmResponse = await this.firebaseService.sendTopicMessage(
        topicData.topic,
        fcmMessage,
      );

      // Log success
      console.log('Topic notification sent:', fcmResponse);
      return { notificationId: notification.id, fcmResponse };
    } catch (error) {
      console.error('Failed to send topic notification:', error);
      throw error;
    }
  }

  async sendPersonalNotification(
    personalData: PersonalNotificationDto,
    createdBy?: string,
  ) {
    // Get device tokens for the users
    const devices = await this.prisma.device.findMany({
      where: {
        userId: {
          in: personalData.userIds,
        },
      },
    });

    // Check which users should receive notifications immediately vs queue
    const userDeviceMap = new Map<string, typeof devices>();
    devices.forEach(device => {
      if (!userDeviceMap.has(device.userId!)) {
        userDeviceMap.set(device.userId!, []);
      }
      userDeviceMap.get(device.userId!)!.push(device);
    });

    // Separate devices by delivery status
    const immediateDevices: typeof devices = [];
    const queuedDevices: typeof devices = [];

    for (const [userId, userDevices] of userDeviceMap) {
      const shouldDeliver = await this.userStatusService.shouldDeliverNotifications(userId);
      if (shouldDeliver) {
        immediateDevices.push(...userDevices);
      } else {
        queuedDevices.push(...userDevices);
      }
    }

    // Create notification record
    const notification = await this.prisma.notification.create({
      data: {
        type: 'personal',
        title: personalData.title,
        body: personalData.body,
        data: personalData.data as any,
        createdBy,
      },
    });

    const results = {
      notificationId: notification.id,
      immediate: { count: 0, fcmResponses: [] },
      queued: { count: 0 },
    };

    // Handle immediate notifications
    if (immediateDevices.length > 0) {
      const deviceTokens = immediateDevices.map((device) => device.fcmToken);
      const deviceIds = immediateDevices.map((device) => device.id);

      // Create notification targets for immediate delivery
      const immediateTargets = deviceTokens.map((token, index) => ({
        notificationId: notification.id,
        deviceId: deviceIds[index],
        token,
        status: 'pending',
      }));

      await this.prisma.notificationTarget.createMany({
        data: immediateTargets,
      });

      try {
        // Send immediately via Firebase
        const fcmMessage: FCMMessage = {
          title: personalData.title,
          body: personalData.body,
          data: personalData.data
            ? this.convertDataToStringMap(personalData.data)
            : undefined,
          icon: personalData.icon,
          image: personalData.image,
          clickAction: personalData.clickAction,
        };

        const fcmResponses = await this.firebaseService.sendMulticastMessage(
          deviceTokens,
          fcmMessage,
        );

        // Update notification targets with results
        await this.updateNotificationTargetsWithResponse(
          notification.id,
          fcmResponses,
          deviceTokens,
        );

        results.immediate = {
          count: immediateDevices.length,
          fcmResponses,
        };
      } catch (error) {
        console.error('Failed to send immediate notifications:', error);
        // Mark targets as failed
        await this.prisma.notificationTarget.updateMany({
          where: { notificationId: notification.id, status: 'pending' },
          data: {
            status: 'failed',
            fcmResponse: { error: error.message } as any,
          },
        });
      }
    }

    // Handle queued notifications
    if (queuedDevices.length > 0) {
      const queueExpiryHours = parseInt(this.config.get('QUEUE_EXPIRY_HOURS', '24'));
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + queueExpiryHours);

      const queuedTargets = queuedDevices.map((device) => ({
        notificationId: notification.id,
        deviceId: device.id,
        token: device.fcmToken,
        status: 'queued',
        queuedAt: new Date(),
        expiresAt,
      }));

      await this.prisma.notificationTarget.createMany({
        data: queuedTargets,
      });

      results.queued.count = queuedDevices.length;
    }

    return results;
  }

  async getNotificationsForUser(
    userId: string,
    limit: number = 50,
    offset: number = 0,
  ) {
    // Get devices for user
    const devices = await this.prisma.device.findMany({
      where: { userId },
    });

    const deviceIds = devices.map((d) => d.id);

    // Get notifications targeted to user's devices
    const notifications = await this.prisma.notificationTarget.findMany({
      where: {
        deviceId: {
          in: deviceIds,
        },
      },
      include: {
        notification: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      skip: offset,
    });

    return notifications.map((target) => ({
      id: target.notificationId,
      targetId: target.id,
      type: target.notification.type,
      title: target.notification.title,
      body: target.notification.body,
      data: target.notification.data,
      topic: target.notification.topic,
      createdAt: target.notification.createdAt,
      read: target.read,
      deliveredAt: target.deliveredAt,
    }));
  }

  async markNotificationRead(targetId: string, userId: string) {
    // Verify ownership
    const target = await this.prisma.notificationTarget.findFirst({
      where: {
        id: targetId,
        device: {
          userId,
        },
      },
    });

    if (!target) {
      throw new Error('Notification not found');
    }

    return this.prisma.notificationTarget.update({
      where: { id: targetId },
      data: {
        read: true,
        deliveredAt: target.deliveredAt || new Date(),
      },
    });
  }

  private async updateNotificationTargetsWithResponse(
    notificationId: string,
    fcmResponses: any,
    tokens: string[],
  ) {
    // FCM responses handling - this depends on the exact format from Firebase
    // For simplicity, mark all as sent if no errors
    const updates = tokens.map((token) => ({
      where: { notificationId_token: { notificationId, token } },
      data: {
        status: 'sent' as const,
        deliveredAt: new Date(),
        fcmResponse: fcmResponses[0] as any, // Simplified
      },
    }));

    for (const update of updates) {
      await this.prisma.notificationTarget.update(update);
    }
  }

  /**
   * Deliver queued notifications for a user when they come back online
   */
  async deliverQueuedNotifications(userId: string): Promise<number> {
    // Get all queued notifications for the user that haven't expired
    const queuedTargets = await this.prisma.notificationTarget.findMany({
      where: {
        device: {
          userId,
        },
        status: 'queued',
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        notification: true,
      },
    });

    if (queuedTargets.length === 0) {
      return 0;
    }

    let deliveredCount = 0;

    // Group by notification for batch processing
    const notificationMap = new Map<string, typeof queuedTargets>();
    queuedTargets.forEach(target => {
      if (!notificationMap.has(target.notificationId)) {
        notificationMap.set(target.notificationId, []);
      }
      notificationMap.get(target.notificationId)!.push(target);
    });

    for (const [notificationId, targets] of notificationMap) {
      const notification = targets[0].notification;
      const tokens = targets.map(t => t.token);

      try {
        // Send the notification
        const fcmMessage: FCMMessage = {
          title: notification.title,
          body: notification.body,
          data: notification.data
            ? this.convertDataToStringMap(notification.data as any)
            : undefined,
        };

        const fcmResponses = await this.firebaseService.sendMulticastMessage(
          tokens,
          fcmMessage,
        );

        // Update targets as sent
        await this.updateNotificationTargetsWithResponse(
          notificationId,
          fcmResponses,
          tokens,
        );

        deliveredCount += targets.length;
      } catch (error) {
        console.error(`Failed to deliver queued notification ${notificationId}:`, error);
        // Mark as failed
        await this.prisma.notificationTarget.updateMany({
          where: {
            notificationId,
            token: { in: tokens },
            status: 'queued',
          },
          data: {
            status: 'failed',
            fcmResponse: { error: error.message } as any,
          },
        });
      }
    }

    return deliveredCount;
  }

  private convertDataToStringMap(
    data: Record<string, any>,
  ): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(data)) {
      result[key] = typeof value === 'string' ? value : JSON.stringify(value);
    }
    return result;
  }
}
