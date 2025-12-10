# Notifications Microservice Documentation

This comprehensive documentation covers the complete Notifications Microservice built with NestJS.

## 📚 Documentation Index

### 📖 Core Documentation

- **[Setup Guide](./setup.md)** - Installation, configuration, and deployment
- **[API Reference](./api.md)** - Complete API documentation with examples
- **[Architecture](./architecture.md)** - System overview, data flow, and design patterns

### 🔧 Technical Details

- **[Notifications Flow](./notifications-flow.md)** - End-to-end notification lifecycle
- **[FCM Integration](./fcm.md)** - Firebase Cloud Messaging configuration
- **[Deployment](./deployment.md)** - Docker, scaling, and production deployment

### 📋 Additional Resources

- **[Examples](./examples.md)** - Sample payloads and use cases

## 🏗️ Quick Start

### Development Setup

```bash
# Clone repository
git clone <repository-url>
cd notifications-microservice

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your configuration

# Setup database
npx prisma migrate dev --name init

# Start development server
npm run start:dev
```

### API Access

- **API URL**: http://localhost:3000
- **Swagger UI**: http://localhost:3000/swagger
- **Health Check**: http://localhost:3000/health

### Docker Deployment

```bash
docker compose up -d
```

## 📊 API Key Management

To create API keys for different scopes:

```bash
npm run seed  # Creates default API keys
```

Available scopes:

- `topic` - Send topic notifications
- `personal` - Send personal notifications to users
- `admin` - Access admin endpoints and metrics

## 🔐 Authentication

All API endpoints (except `/health`) require API key authentication:

```
X-API-Key: your-api-key-here
```

## 🎯 Key Features

- ✅ **Multi-platform FCM** support (iOS & Android)
- ✅ **Topic & Personal** notifications
- ✅ **Background Job Processing** with BullMQ
- ✅ **Rate Limiting** and security
- ✅ **Comprehensive API Documentation** with Swagger
- ✅ **Production-ready** Docker deployment
- ✅ **Database Tracking** and notification history
- ✅ **Token Cleanup** and retry logic

For detailed information, see the individual documentation files in this folder.
