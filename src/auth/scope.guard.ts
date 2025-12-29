import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ApiKeyService } from './api-key.service';

@Injectable()
export class ScopeGuard implements CanActivate {
  constructor(
    private apiKeyService: ApiKeyService,
    private reflector: Reflector,
    private requiredScopes: string[],
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userScopes = request.apiKeyScopes as string[];

    if (!userScopes) {
      throw new ForbiddenException('API key validation required before scope check');
    }

    const hasRequiredScopes = this.apiKeyService.validateScopes(this.requiredScopes, userScopes);
    if (!hasRequiredScopes) {
      throw new ForbiddenException(`Insufficient permissions. Required scopes: ${this.requiredScopes.join(', ')}`);
    }

    return true;
  }
}

// Specific scope guards
@Injectable()
export class TopicScopeGuard extends ScopeGuard {
  constructor(apiKeyService: ApiKeyService, reflector: Reflector) {
    super(apiKeyService, reflector, ['topic']);
  }
}

@Injectable()
export class PersonalScopeGuard extends ScopeGuard {
  constructor(apiKeyService: ApiKeyService, reflector: Reflector) {
    super(apiKeyService, reflector, ['personal']);
  }
}

@Injectable()
export class AdminScopeGuard extends ScopeGuard {
  constructor(apiKeyService: ApiKeyService, reflector: Reflector) {
    super(apiKeyService, reflector, ['admin']);
  }
}

@Injectable()
export class PersonalOrAdminScopeGuard extends ScopeGuard {
  constructor(apiKeyService: ApiKeyService, reflector: Reflector) {
    super(apiKeyService, reflector, ['personal', 'admin']);
  }
}

@Injectable()
export class PersonalOrAdminWithUserIdGuard implements CanActivate {
  constructor(private apiKeyService: ApiKeyService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userScopes = request.apiKeyScopes as string[];

    if (!userScopes) {
      throw new ForbiddenException('API key validation required before scope check');
    }

    const hasRequiredScopes = this.apiKeyService.validateScopes(['personal', 'admin'], userScopes);
    if (!hasRequiredScopes) {
      throw new ForbiddenException(`Insufficient permissions. Required scopes: personal, admin`);
    }

    const isAdmin = userScopes.includes('admin');
    const isPersonal = userScopes.includes('personal');

    // For personal scope without admin, userId is required
    if (isPersonal && !isAdmin && !request.query.userId) {
      throw new ForbiddenException('userId query parameter is required for personal scope');
    }

    return true;
  }
}