import { Injectable, ConflictException } from '@nestjs/common';
import { DeviceRegisterDto } from '../common/dto/device-register.dto';
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
      throw new ConflictException('Device not found');
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

  async getDeviceByToken(token: string) {
    return this.prisma.device.findUnique({
      where: { fcmToken: token },
    });
  }
}
