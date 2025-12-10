import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { NotificationJobData } from './notification.processor';
import { FCMMessage } from './firebase.service';

@Injectable()
export class NotificationQueueService {
  constructor(
    @InjectQueue('notification-send')
    private readonly notificationQueue: Queue<NotificationJobData>,
  ) {}

  async addTopicJob(
    notificationId: string,
    topic: string,
    message: FCMMessage,
  ) {
    return this.notificationQueue.add(
      'topic_send',
      {
        notificationId,
        type: 'topic_send',
        topic,
        message,
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    );
  }

  async addTokenBatchJob(
    notificationId: string,
    tokens: string[],
    message: FCMMessage,
  ) {
    return this.notificationQueue.add(
      'token_batch_send',
      {
        notificationId,
        type: 'token_batch_send',
        tokens,
        message,
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    );
  }

  async getJobCounts() {
    return this.notificationQueue.getJobCounts();
  }

  async getActiveJobs() {
    const jobs = await this.notificationQueue.getActive();
    return jobs.map((job) => ({
      id: job.id,
      data: job.data,
      progress: job.progress,
      attemptsMade: job.attemptsMade,
    }));
  }

  async getFailedJobs(limit = 10) {
    const jobs = await this.notificationQueue.getFailed(0, limit);
    return jobs.map((job) => ({
      id: job.id,
      data: job.data,
      failedReason: job.failedReason,
      finishedOn: job.finishedOn,
    }));
  }
}
