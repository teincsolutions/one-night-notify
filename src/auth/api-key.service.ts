import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import * as argon2 from 'argon2';

@Injectable()
export class ApiKeyService {
  constructor(private prisma: PrismaService) {}

  async validateApiKey(
    apiKey: string,
    url: string,
    method: string,
  ): Promise<boolean> {
    try {
      // Hash the incoming API key
      const keyHash = await argon2.hash(apiKey);

      // Find the API key in database
      const apiKeyRecord = await this.prisma.apiKey.findMany({
        where: { keyHash },
      });

      if (!apiKeyRecord || apiKeyRecord.length === 0) {
        return false;
      }

      // Get first matching key (should be unique)
      const key = apiKeyRecord[0];

      // Validate scopes based on the endpoint
      const scopes = key.scopes as string[];

      // Determine required scope based on URL and method
      if (url.includes('/health')) {
        return true; // Health check doesn't require API key
      }

      if (url.includes('/notifications/topic') && method === 'POST') {
        return scopes.includes('topic');
      }

      if (
        (url.includes('/notifications/personal') && method === 'POST') ||
        (url.includes('/notifications/') && method === 'PATCH')
      ) {
        return scopes.includes('personal');
      }

      if (url.includes('/devices') || url.includes('/tokens')) {
        return scopes.includes('personal') || scopes.includes('admin');
      }

      // Admin endpoints
      if (url.includes('/admin') || url.includes('/metrics')) {
        return scopes.includes('admin');
      }

      return false;
    } catch (error) {
      console.error('API Key validation error:', error);
      return false;
    }
  }

  async createApiKey(name: string, scopes: string[]): Promise<string> {
    // Generate a random API key
    const apiKey = this.generateRandomKey();

    // Hash the API key
    const keyHash = await argon2.hash(apiKey);

    // Save to database
    await this.prisma.apiKey.create({
      data: {
        name,
        keyHash,
        scopes: scopes as any,
      },
    });

    return apiKey;
  }

  private generateRandomKey(length: number = 32): string {
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}
