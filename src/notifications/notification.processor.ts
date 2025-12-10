import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { FirebaseService, FCMMessage } from './firebase.service';
import { PrismaService } from '../database/prisma.service';

export interface NotificationJobData {
  notificationId: string;
  type: 'topic_send' | 'token_batch_send';
  topic?: string;
  tokens?: string[];
  message: FCMMessage;
}

@Injectable()
@Processor('notification-send')
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(
    private firebaseService: FirebaseService,
    private prisma: PrismaService,
  ) {
    super();
  }

  async process(job: Job<NotificationJobData>): Promise<any> {
    this.logger.log(`Processing job ${job.id}: ${job.data.type}`);

    const { notificationId, type, topic, tokens, message } = job.data;

    try {
      if (type === 'topic_send' && topic) {
        return await this.processTopicNotification(
          notificationId,
          topic,
          message,
        );
      } else if (type === 'token_batch_send' && tokens) {
        return await this.processTokenBatchNotification(
          notificationId,
          tokens,
          message,
        );
      }

      throw new Error(`Unknown notification type: ${type}`);
    } catch (error) {
      this.logger.error(`Job ${job.id} failed:`, error);
      throw error;
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job<NotificationJobData>) {
    this.logger.log(`Job ${job.id} completed successfully`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<NotificationJobData>, err: Error) {
    this.logger.error(`Job ${job.id} failed with error:`, err);
  }

  @OnWorkerEvent('active')
  onActive(job: Job<NotificationJobData>) {
    this.logger.log(`Job ${job.id} is now active`);
  }

  private async processTopicNotification(
    notificationId: string,
    topic: string,
    message: FCMMessage,
  ): Promise<any> {
    try {
      // Send topic notification via Firebase
      const result = await this.firebaseService.sendTopicMessage(
        topic,
        message,
      );

      this.logger.log(`Topic notification sent to ${topic}:`, result);
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to send topic notification ${notificationId}:`,
        error,
      );

      // Update notification status to failed
      await this.prisma.notification.update({
        where: { id: notificationId },
        data: { type: 'failed_topic' }, // Mark as failed
      });

      throw error;
    }
  }

  private async processTokenBatchNotification(
    notificationId: string,
    tokens: string[],
    message: FCMMessage,
  ): Promise<any> {
    try {
      // Send to multiple tokens (batched by Firebase service)
      const results = await this.firebaseService.sendMulticastMessage(
        tokens,
        message,
      );

      // Process results and update notification targets
      await this.updateNotificationTargetsWithFCMResults(
        notificationId,
        tokens,
        results,
      );

      this.logger.log(
        `Token batch notification sent to ${tokens.length} tokens`,
      );
      return results;
    } catch (error) {
      this.logger.error(
        `Failed to send token batch notification ${notificationId}:`,
        error,
      );

      // Mark targets as failed
      await this.prisma.notificationTarget.updateMany({
        where: {
          notificationId,
          token: { in: tokens },
        },
        data: {
          status: 'failed',
          fcmResponse: { error: error.message } as any,
        },
      });

      throw error;
    }
  }

  private async updateNotificationTargetsWithFCMResults(
    notificationId: string,
    tokens: string[],
    fcmResults: any[],
  ) {
    // This would need to be adapted based on Firebase response format
    // For simplicity, assuming successful sends

    const successfulTokens = tokens; // In real implementation, parse FCM response

    // Update successful sends
    for (const token of successfulTokens) {
      await this.prisma.notificationTarget.updateMany({
        where: {
          notificationId,
          token,
        },
        data: {
          status: 'sent',
          deliveredAt: new Date(),
          fcmResponse: fcmResults[0] as any, // Simplified
        },
      });
    }

    // Handle failed tokens if any
    const failedTokens = this.extractFailedTokens(fcmResults);
    for (const token of failedTokens) {
      await this.prisma.notificationTarget.updateMany({
        where: {
          notificationId,
          token,
        },
        data: {
          status: 'failed',
          fcmResponse: { error: 'FCM delivery failed' } as any,
        },
      });

      // Optionally, mark tokens as invalid for cleanup
      await this.markInvalidTokens([token]);
    }
  }

  private extractFailedTokens(fcmResults: any[]): string[] {
    // Parse Firebase response for failed tokens
    // This is placeholder - actual implementation depends on Firebase response format
    return [];
  }

  private async markInvalidTokens(tokens: string[]): Promise<void> {
    // Delete invalid tokens
    await this.prisma.device.deleteMany({
      where: {
        fcmToken: { in: tokens },
      },
    });
  }
}
