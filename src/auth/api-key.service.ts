import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import * as argon2 from 'argon2';

@Injectable()
export class ApiKeyService {
  constructor(private prisma: PrismaService) {}

  async validateApiKey(apiKey: string): Promise<{ isValid: boolean; scopes?: string[] }> {
    try {
      // Find all API keys in database
      const apiKeyRecords = await this.prisma.apiKey.findMany();

      // Check if any stored hash matches the incoming API key
      for (const keyRecord of apiKeyRecords) {
        try {
          const isValid = await argon2.verify(keyRecord.keyHash, apiKey);
          if (isValid) {
            return {
              isValid: true,
              scopes: keyRecord.scopes as string[],
            };
          }
        } catch (error) {
          // Continue to next key if verification fails
          continue;
        }
      }

      return { isValid: false };
    } catch (error) {
      console.error('API Key validation error:', error);
      return { isValid: false };
    }
  }

  async validateScopes(requiredScopes: string[], userScopes: string[]): Promise<boolean> {
    // If no scopes required, allow access
    if (!requiredScopes || requiredScopes.length === 0) {
      return true;
    }

    // Check if user has at least one of the required scopes
    return requiredScopes.some(scope => userScopes.includes(scope));
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
