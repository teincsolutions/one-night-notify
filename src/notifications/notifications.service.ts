import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TopicNotificationDto } from '../common/dto/topic-notification.dto';
import { PersonalNotificationDto } from '../common/dto/personal-notification.dto';
import { PrismaService } from '../database/prisma.service';
import { FirebaseService, FCMMessage } from './firebase.service';

@Injectable()
export class NotificationsService {
  constructor(
    private prisma: PrismaService,
    private firebaseService: FirebaseService,
    private config: ConfigService,
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

    if (devices.length === 0) {
      throw new Error('No devices found for the specified user IDs');
    }

    const deviceTokens = devices.map((device) => device.fcmToken);
    const deviceIds = devices.map((device) => device.id);

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

    // Create notification targets for tracking
    const notificationTargets = deviceTokens.map((token, index) => ({
      notificationId: notification.id,
      deviceId: deviceIds[index],
      token,
      status: 'pending',
    }));

    await this.prisma.notificationTarget.createMany({
      data: notificationTargets,
    });

    // Convert to FCM message format
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

    try {
      // Send via Firebase multicast
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

      return { notificationId: notification.id, fcmResponses };
    } catch (error) {
      console.error('Failed to send personal notification:', error);
      // Mark targets as failed
      await this.prisma.notificationTarget.updateMany({
        where: { notificationId: notification.id },
        data: {
          status: 'failed',
          fcmResponse: { error: error.message } as any,
        },
      });
      throw error;
    }
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
