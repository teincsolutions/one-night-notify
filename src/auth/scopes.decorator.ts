import { SetMetadata } from '@nestjs/common';

export const SCOPES_KEY = 'scopes';
export const REQUIRED_SCOPES = 'required_scopes';

export const Scopes = (...scopes: string[]) => SetMetadata(SCOPES_KEY, scopes);

export const RequireScopes = (...scopes: string[]) => SetMetadata(REQUIRED_SCOPES, scopes);

// Convenience decorators for common scopes
export const RequireTopicScope = () => RequireScopes('topic');
export const RequirePersonalScope = () => RequireScopes('personal');
export const RequireAdminScope = () => RequireScopes('admin');
export const RequirePersonalOrAdminScope = () => RequireScopes('personal', 'admin');