import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
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
      return false;
    }

    return this.apiKeyService.validateScopes(this.requiredScopes, userScopes);
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