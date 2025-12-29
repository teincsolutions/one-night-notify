import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ApiKeyGuard } from './api-key.guard';
import { ApiKeyService } from './api-key.service';
import { ApiKeysController } from './api-keys.controller';
import { DatabaseModule } from '../database/database.module';
import { TopicScopeGuard, PersonalScopeGuard, AdminScopeGuard, PersonalOrAdminScopeGuard } from './scope.guard';

@Module({
  imports: [ConfigModule, DatabaseModule],
  controllers: [ApiKeysController],
  providers: [
    ApiKeyService,
    ApiKeyGuard,
    TopicScopeGuard,
    PersonalScopeGuard,
    AdminScopeGuard,
    PersonalOrAdminScopeGuard,
  ],
  exports: [
    ApiKeyGuard,
    ApiKeyService,
    TopicScopeGuard,
    PersonalScopeGuard,
    AdminScopeGuard,
    PersonalOrAdminScopeGuard,
  ],
})
export class AuthModule {}
