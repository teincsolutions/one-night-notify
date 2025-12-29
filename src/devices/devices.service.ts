import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { DeviceRegisterDto } from '../common/dto/device-register.dto';
import { PaginationMeta, PaginatedResponse } from '../common/dto/pagination.dto';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class DevicesService {
  constructor(private prisma: PrismaService) {}

  async registerDevice(deviceData: DeviceRegisterDto) {
    // Check if token already exists
    const existingDevice = await this.prisma.device.findUnique({
      where: { fcmToken: deviceData.fcmToken },
    });

    if (existingDevice) {
      // Update existing device with new info
      const updateData: any = {
        userId: deviceData.userId || existingDevice.userId,
        platform: deviceData.platform,
        lastSeenAt: new Date(),
      };

      // Only include meta if it's not null
      if (deviceData.meta !== undefined) {
        updateData.meta = deviceData.meta;
      } else if (existingDevice.meta !== null) {
        updateData.meta = existingDevice.meta;
      }

      return this.prisma.device.update({
        where: { fcmToken: deviceData.fcmToken },
        data: updateData,
      });
    }

    // If userId is provided, ensure the user exists
    if (deviceData.userId) {
      const existingUser = await this.prisma.user.findUnique({
        where: { id: deviceData.userId },
      });

      if (!existingUser) {
        // Create the user if it doesn't exist
        await this.prisma.user.create({
          data: {
            id: deviceData.userId,
          },
        });
      }
    }

    // Create new device
    return this.prisma.device.create({
      data: {
        userId: deviceData.userId,
        platform: deviceData.platform,
        fcmToken: deviceData.fcmToken,
        meta: deviceData.meta,
        lastSeenAt: new Date(),
      },
    });
  }

  async refreshToken(oldToken: string, newToken: string) {
    const device = await this.prisma.device.findUnique({
      where: { fcmToken: oldToken },
    });

    if (!device) {
      throw new NotFoundException('oldToken Device not found');
    }

    // Check if new token already exists
    const existingDevice = await this.prisma.device.findUnique({
      where: { fcmToken: newToken },
    });

    if (existingDevice && existingDevice.id !== device.id) {
      // Update the existing device's info with current device's info
      await this.prisma.device.update({
        where: { fcmToken: newToken },
        data: {
          userId: device.userId,
          platform: device.platform,
          meta: device.meta !== null ? device.meta : undefined,
          lastSeenAt: new Date(),
        },
      });

      // Delete old device
      await this.prisma.device.delete({
        where: { fcmToken: oldToken },
      });

      return existingDevice;
    }

    // Update the device with new token
    return this.prisma.device.update({
      where: { fcmToken: oldToken },
      data: {
        fcmToken: newToken,
        lastSeenAt: new Date(),
      },
    });
  }

  async logoutDevice(fcmToken: string) {
    const device = await this.prisma.device.findUnique({
      where: { fcmToken },
    });

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    if (!device.isActive) {
      throw new ConflictException('Device is already logged out');
    }

    return this.prisma.device.update({
      where: { fcmToken },
      data: {
        isActive: false,
        loggedOutAt: new Date(),
      },
    });
  }

  async getAllDevices(
    page: number = 1,
    limit: number = 10,
  ): Promise<PaginatedResponse<any>> {
    const offset = (page - 1) * limit;

    // Get total count
    const total = await this.prisma.device.count();

    // Get devices
    const devices = await this.prisma.device.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      skip: offset,
    });

    const data = devices.map((device) => ({
      id: device.id,
      userId: device.userId,
      platform: device.platform,
      fcmToken: device.fcmToken,
      lastSeenAt: device.lastSeenAt,
      createdAt: device.createdAt,
      updatedAt: device.updatedAt,
    }));

    const totalPages = Math.ceil(total / limit);
    const meta: PaginationMeta = {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };

    return { data, meta };
  }
}
