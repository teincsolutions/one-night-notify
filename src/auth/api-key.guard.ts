import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiKeyService } from './api-key.service';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    private config: ConfigService,
    private apiKeyService: ApiKeyService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'];

    if (!apiKey) {
      return false;
    }

    try {
      const isValid = await this.apiKeyService.validateApiKey(
        apiKey,
        request.url,
        request.method,
      );
      if (isValid) {
        request.apiKey = apiKey;
      }
      return isValid;
    } catch (error) {
      return false;
    }
  }
}
