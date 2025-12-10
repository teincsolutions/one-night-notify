# 🚀 Notifications Microservice

A production-ready **Notifications Microservice** built with NestJS, Prisma, BullMQ, and Firebase Cloud Messaging (FCM). This scalable solution provides comprehensive notification management with support for topic-based and personal notifications, background job processing, and full API documentation.

## 🏗️ Architecture Overview

- **Framework**: NestJS v10 (TypeScript)
- **Database**: PostgreSQL with Prisma ORM
- **Message Queue**: BullMQ with Redis
- **Notifications**: Firebase Cloud Messaging (FCM)
- **Documentation**: Swagger/OpenAPI
- **Deployment**: Docker & docker compose
- **Security**: API Key authentication with scopes

## 📋 Key Features

✨ **Full API Coverage**

- Device registration & FCM token management
- Topic-based notifications to multiple subscribers
- Personal notifications to specific users
- Notification history & inbox management
- Mark as read functionality & sync

🔄 **Background Processing**

- BullMQ job queues for reliable delivery
- Exponential backoff retry logic
- Failed job handling & dead-letter queues
- Automatic FCM token cleanup

🔒 **Security & Performance**

- API key authentication with granular scopes
- Rate limiting per API key
- Input validation with class-validator
- Health checks & system metrics

📖 **Developer Experience**

- Complete Swagger UI documentation
- Comprehensive API testing capabilities
- Database migrations & seed scripts
- Docker containerization ready

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- Docker & Docker Compose
- PostgreSQL (for local development)

### Development Setup

```bash
# Clone the repository
git clone <repository-url>
cd notifications-microservice

# Install dependencies
npm install

# Environment configuration
cp .env.example .env
# Edit .env file with your Firebase credentials and database settings

# Database setup
npx prisma migrate dev --name init
npm run prisma:seed

# Start development server
npm run start:dev

# The API will be available at http://localhost:3000
# Swagger documentation: http://localhost:3000/swagger
```

### Docker Deployment

```bash
# Start all services (API, Postgres, Redis, Adminer)
docker compose up -d

# Check logs
docker compose logs -f api

# Stop services
docker compose down
```

## 📚 Documentation

📖 **[Complete Documentation](./docs/)**

| Document                                               | Description                                      |
| ------------------------------------------------------ | ------------------------------------------------ |
| **[Setup Guide](./docs/setup.md)**                     | Installation, configuration, and deployment      |
| **[API Reference](./docs/api.md)**                     | Complete API documentation with examples         |
| **[Architecture](./docs/architecture.md)**             | System design, data flow, and components         |
| **[Notifications Flow](./docs/notifications-flow.md)** | End-to-end lifecycle from send to delivery       |
| **[FCM Integration](./docs/fcm.md)**                   | Firebase Cloud Messaging configuration           |
| **[Deployment](./docs/deployment.md)**                 | Docker, scaling, and production considerations   |
| **[Examples](./docs/examples.md)**                     | Sample payloads for different notification types |

## 🛠️ API Endpoints

### Device Management

- `POST /v1/devices/register` - Register device with FCM token
- `PUT /v1/devices/tokens/refresh` - Refresh FCM token

### Notifications

- `POST /v1/notifications/topic` - Send topic notification
- `POST /v1/notifications/personal` - Send personal notification
- `GET /v1/notifications` - Get user notification history
- `PATCH /v1/notifications/:id/mark-read` - Mark notification as read
- `POST /v1/notifications/sync` - Sync notifications for client

### System

- `GET /health` - Health check
- `GET /health/metrics` - System metrics
- `GET /swagger` - Swagger API documentation

## 🔐 Authentication

All endpoints require API key authentication (except `/health`):

```
X-API-Key: your-api-key-here
```

**Scope-based Access Control:**

- `topic` - Send topic notifications
- `personal` - Send personal/device notifications
- `admin` - Access metrics and admin endpoints

## 🧪 Testing

```bash
# Run all tests
npm test

# Run e2e tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## 🔧 Configuration

### Environment Variables (.env)

```bash
PORT=3000
DATABASE_URL=postgresql://user:pass@localhost:5432/notifications
REDIS_URL=redis://localhost:6379
FIREBASE_SERVICE_ACCOUNT_JSON='{...}'
API_KEY_MASTER=...
JWT_SECRET=...
RATE_LIMIT_POINTS=100
RATE_LIMIT_DURATION=60
```

## 📊 Database Schema

- **User**: Optional user information
- **Device**: FCM tokens and device metadata
- **Notification**: Notification templates and data
- **NotificationTarget**: Individual notification deliveries
- **ApiKey**: API authentication keys with scopes

## 🚀 Production Deployment

```bash
# Build and deploy
docker compose -f docker-compose.prod.yml up -d

# Scale worker processes
docker compose up -d --scale worker=3

# View logs
docker compose logs -f api worker
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/new-feature`)
3. Commit changes (`git commit -am 'Add new feature'`)
4. Push to branch (`git push origin feature/new-feature`)
5. Create Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [NestJS](https://nestjs.com/)
- Database ORM: [Prisma](https://prisma.io)
- Job Queue: [BullMQ](https://docs.bullmq.io/)
- FCM: [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)

---

**For detailed setup and usage instructions, please refer to the [documentation](./docs/).**
