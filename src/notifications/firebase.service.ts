import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';

export interface FCMMessage {
  title: string;
  body: string;
  data?: Record<string, string>;
  icon?: string;
  image?: string;
  clickAction?: string;
}

interface FirebaseServiceAccount {
  project_id: string;
  client_email: string;
  private_key: string;
}

@Injectable()
export class FirebaseService implements OnModuleInit {
  private firebaseApp: admin.app.App | null = null;

  constructor(private config: ConfigService) {}

  onModuleInit() {
    const serviceAccountJson = this.config.get<string>(
      'FIREBASE_SERVICE_ACCOUNT_JSON',
    );
    
    if (!serviceAccountJson || serviceAccountJson.includes('...')) {
      console.warn(
        '⚠️  Firebase credentials not configured properly. Using mock mode.',
      );
      console.warn(
        '   Please set FIREBASE_SERVICE_ACCOUNT_JSON in .env with valid credentials',
      );
      return;
    }

    try {
      const serviceAccount = JSON.parse(serviceAccountJson) as FirebaseServiceAccount;

      this.firebaseApp = admin.initializeApp({
        credential: admin.credential.cert({
          projectId: serviceAccount.project_id,
          clientEmail: serviceAccount.client_email,
          privateKey: serviceAccount.private_key.replace(/\\n/g, '\n'),
        }),
      });
      console.log('✅ Firebase initialized successfully');
    } catch (error: any) {
      console.error('❌ Failed to initialize Firebase:', error?.message);
      console.warn('   Running in mock mode without Firebase');
    }
  }

  async sendTopicMessage(topic: string, message: FCMMessage): Promise<any> {
    if (!this.firebaseApp) {
      console.log(
        `[MOCK] Would send topic message to "${topic}":`,
        message.title,
      );
      return { messageId: 'mock-' + Date.now(), success: true };
    }

    try {
      const fcmMessage: admin.messaging.Message = {
        topic: topic,
        notification: {
          title: message.title,
          body: message.body,
          imageUrl: message.image,
        },
        data: message.data || {},
        webpush: message.clickAction
          ? {
              fcmOptions: {
                link: message.clickAction,
              },
            }
          : undefined,
      };

      const response = await admin.messaging().send(fcmMessage);
      return response;
    } catch (error) {
      console.error('FCM Topic Message Error:', error);
      throw error;
    }
  }

  async sendMulticastMessage(
    tokens: string[],
    message: FCMMessage,
  ): Promise<any> {
    if (!this.firebaseApp) {
      console.log(
        `[MOCK] Would send to ${tokens.length} tokens:`,
        message.title,
      );
      return {
        successCount: tokens.length,
        failureCount: 0,
        responses: tokens.map((token) => ({
          success: true,
          messageId: 'mock-' + token,
        })),
      };
    }

    try {
      const messages = tokens.map((token) => ({
        token,
        notification: {
          title: message.title,
          body: message.body,
          imageUrl: message.image,
        },
        data: message.data || {},
        webpush: message.clickAction
          ? {
              fcmOptions: {
                link: message.clickAction,
              },
            }
          : undefined,
      }));

      const results = await admin.messaging().sendEach(messages);
      return results;
    } catch (error) {
      console.error('FCM Multicast Message Error:', error);
      throw error;
    }
  }

  async sendToToken(token: string, message: FCMMessage): Promise<any> {
    if (!this.firebaseApp) {
      console.log(`[MOCK] Would send to token:`, token.substring(0, 20) + '...');
      return { messageId: 'mock-' + Date.now(), success: true };
    }

    try {
      const payload: admin.messaging.Message = {
        token,
        notification: {
          title: message.title,
          body: message.body,
          imageUrl: message.image,
        },
        data: message.data || {},
        webpush: message.clickAction
          ? {
              fcmOptions: {
                link: message.clickAction,
              },
            }
          : undefined,
      };

      return await admin.messaging().send(payload);
    } catch (error) {
      console.error('FCM Token Message Error:', error);
      throw error;
    }
  }
}
