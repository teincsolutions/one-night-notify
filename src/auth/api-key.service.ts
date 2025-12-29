import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { PaginationMeta, PaginatedResponse } from '../common/dto/pagination.dto';
import { ApiKeyResponseDto } from './dto/api-key.dto';
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

  async createApiKey(name: string, scopes: string[]): Promise<{ apiKey: string; keyData: ApiKeyResponseDto }> {
    // Generate a random API key
    const apiKey = this.generateRandomKey();

    // Hash the API key for validation
    const keyHash = await argon2.hash(apiKey);

    // Save to database
    const apiKeyRecord = await this.prisma.apiKey.create({
      data: {
        name,
        keyHash,
        scopes: scopes as any,
      },
    });

    const keyData: ApiKeyResponseDto = {
      id: apiKeyRecord.id,
      name: apiKeyRecord.name,
      scopes: apiKeyRecord.scopes as string[],
      createdAt: apiKeyRecord.createdAt.toISOString(),
    };

    return { apiKey, keyData };
  }

  async getAllApiKeys(
    page: number = 1,
    limit: number = 10,
  ): Promise<PaginatedResponse<ApiKeyResponseDto>> {
    const offset = (page - 1) * limit;

    // Get total count
    const total = await this.prisma.apiKey.count();

    // Get API keys
    const apiKeys = await this.prisma.apiKey.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      skip: offset,
    });

    const data = apiKeys.map((key) => ({
      id: key.id,
      name: key.name,
      scopes: key.scopes as string[],
      createdAt: key.createdAt.toISOString(),
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

  async updateApiKey(id: string, updateData: { name?: string; scopes?: string[] }): Promise<ApiKeyResponseDto> {
    try {
      const apiKey = await this.prisma.apiKey.update({
        where: { id },
        data: {
          ...(updateData.name && { name: updateData.name }),
          ...(updateData.scopes && { scopes: updateData.scopes as any }),
        },
      });

      return {
        id: apiKey.id,
        name: apiKey.name,
        scopes: apiKey.scopes as string[],
        createdAt: apiKey.createdAt.toISOString(),
      };
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException('API key not found');
      }
      throw error;
    }
  }

  async deleteApiKey(id: string): Promise<void> {
    try {
      await this.prisma.apiKey.delete({
        where: { id },
      });
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException('API key not found');
      }
      throw error;
    }
  }

  async regenerateApiKey(id: string): Promise<{ apiKey: string; keyData: ApiKeyResponseDto }> {
    // Generate a new API key
    const newApiKey = this.generateRandomKey();
    const newKeyHash = await argon2.hash(newApiKey);

    try {
      // Update the database record
      const apiKeyRecord = await this.prisma.apiKey.update({
        where: { id },
        data: {
          keyHash: newKeyHash,
        },
      });

      const keyData: ApiKeyResponseDto = {
        id: apiKeyRecord.id,
        name: apiKeyRecord.name,
        scopes: apiKeyRecord.scopes as string[],
        createdAt: apiKeyRecord.createdAt.toISOString(),
      };

      return { apiKey: newApiKey, keyData };
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException('API key not found');
      }
      throw error;
    }
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
