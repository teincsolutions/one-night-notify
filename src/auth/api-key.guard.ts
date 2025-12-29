import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ApiKeyService } from './api-key.service';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    private apiKeyService: ApiKeyService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'];

    // Health check doesn't require API key
    if (request.url.includes('/health')) {
      return true;
    }

    if (!apiKey) {
      throw new UnauthorizedException('API key is required');
    }

    const validation = await this.apiKeyService.validateApiKey(apiKey);
    if (!validation.isValid) {
      throw new UnauthorizedException('Invalid API key');
    }

    // Store scopes in request for use by scope guards
    request.apiKeyScopes = validation.scopes;
    request.apiKey = apiKey;

    return true;
  }
}
