import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class UserStatusService {
  constructor(private prisma: PrismaService) {}

  /**
   * Set user online status
   */
  async setUserOnline(userId: string): Promise<void> {
    await this.prisma.userStatus.upsert({
      where: { userId },
      update: {
        isOnline: true,
        lastSeenAt: new Date(),
        pausedUntil: null, // Clear any pause when user comes online
      },
      create: {
        userId,
        isOnline: true,
        lastSeenAt: new Date(),
      },
    });
  }

  /**
   * Set user offline status
   */
  async setUserOffline(userId: string): Promise<void> {
    await this.prisma.userStatus.upsert({
      where: { userId },
      update: {
        isOnline: false,
        lastSeenAt: new Date(),
      },
      create: {
        userId,
        isOnline: false,
        lastSeenAt: new Date(),
      },
    });
  }

  /**
   * Pause notification delivery for a user
   * @param userId User ID
   * @param durationMinutes How long to pause (default: 24 hours)
   */
  async pauseNotifications(userId: string, durationMinutes: number = 1440): Promise<void> {
    const pausedUntil = new Date();
    pausedUntil.setMinutes(pausedUntil.getMinutes() + durationMinutes);

    await this.prisma.userStatus.upsert({
      where: { userId },
      update: {
        isOnline: false,
        pausedUntil,
        lastSeenAt: new Date(),
      },
      create: {
        userId,
        isOnline: false,
        pausedUntil,
        lastSeenAt: new Date(),
      },
    });
  }

  /**
   * Resume notification delivery for a user
   */
  async resumeNotifications(userId: string): Promise<void> {
    await this.prisma.userStatus.upsert({
      where: { userId },
      update: {
        isOnline: true,
        pausedUntil: null,
        lastSeenAt: new Date(),
      },
      create: {
        userId,
        isOnline: true,
        lastSeenAt: new Date(),
      },
    });
  }

  /**
   * Check if user should receive notifications
   */
  async shouldDeliverNotifications(userId: string): Promise<boolean> {
    const userStatus = await this.prisma.userStatus.findUnique({
      where: { userId },
    });

    if (!userStatus) {
      // Default to online if no status exists
      return true;
    }

    // Check if notifications are paused
    if (userStatus.pausedUntil && userStatus.pausedUntil > new Date()) {
      return false;
    }

    return userStatus.isOnline;
  }

  /**
   * Get user status
   */
  async getUserStatus(userId: string) {
    const userStatus = await this.prisma.userStatus.findUnique({
      where: { userId },
    });

    if (!userStatus) {
      return {
        userId,
        isOnline: true,
        lastSeenAt: null,
        pausedUntil: null,
      };
    }

    return {
      userId: userStatus.userId,
      isOnline: userStatus.isOnline,
      lastSeenAt: userStatus.lastSeenAt,
      pausedUntil: userStatus.pausedUntil,
      isPaused: userStatus.pausedUntil && userStatus.pausedUntil > new Date(),
    };
  }

  /**
   * Clean up expired queued notifications
   */
  async cleanupExpiredQueuedNotifications(): Promise<number> {
    const result = await this.prisma.notificationTarget.updateMany({
      where: {
        status: 'queued',
        expiresAt: {
          lt: new Date(),
        },
      },
      data: {
        status: 'expired',
      },
    });

    return result.count;
  }
}