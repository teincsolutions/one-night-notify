import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NotificationsController } from './notifications.controller';
import { NotificationProcessor } from './notification.processor';
import { NotificationQueueService } from './notification.queue.service';
import { NotificationsService } from './notifications.service';
import { FirebaseService } from './firebase.service';
import { DatabaseModule } from '../database/database.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const redisUrl = configService.get(
          'REDIS_URL',
          'redis://localhost:6379',
        );
        // Parse Redis URL if it's a full URL
        const url = new URL(redisUrl);
        return {
          connection: {
            host: url.hostname || 'localhost',
            port: parseInt(url.port) || 6379,
          },
        };
      },
      inject: [ConfigService],
    }),
    BullModule.registerQueue({
      name: 'notification-send',
    }),
  ],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    FirebaseService,
    NotificationProcessor,
    NotificationQueueService,
  ],
  exports: [NotificationsService, FirebaseService, NotificationQueueService],
})
export class NotificationsModule {}
