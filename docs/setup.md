# 🚀 Setup & Installation

Complete setup guide for the Notifications Microservice including installation, configuration, and deployment.

## 📋 Prerequisites

### System Requirements

- **Node.js**: 20.x or higher
- **npm**: 8.x or higher
- **PostgreSQL**: 15.x or higher
- **Redis**: 7.x or higher
- **Docker** & **Docker Compose**: Latest versions (optional, for containerized deployment)

### Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project
3. Enable Cloud Messaging
4. Generate a service account key:
   - Go to Project Settings → Service Accounts
   - Generate new private key
   - Download the JSON file

## 🛠️ Installation

### Development Setup

```bash
# Clone the repository
git clone <repository-url>
cd notifications-microservice

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env file (see Configuration section below)
```

### Firebase Configuration

1. **Copy your service account JSON** to your `.env` file:

```bash
# In your .env file
FIREBASE_SERVICE_ACCOUNT_JSON='{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxx@your-project-id.iam.gserviceaccount.com",
  "client_id": "...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xxx%40your-project-id.iam.gserviceaccount.com"
}'
```

### Database Setup

```bash
# Start PostgreSQL (if using local instance)
# Ubuntu/Debian:
sudo apt update && sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql

# macOS with Homebrew:
brew install postgresql
brew services start postgresql

# Create database
createdb notifications_db

# Or use the Docker option below
```

### Redis Setup

```bash
# Start Redis (if using local instance)
# Ubuntu/Debian:
sudo apt install redis-server
sudo systemctl start redis-server

# macOS with Homebrew:
brew install redis
brew services start redis

# Or use the Docker option below
```

## ⚙️ Configuration

### Environment Variables (.env)

**Required Variables:**

```bash
# Server
PORT=3000
NODE_ENV=development

# Database
DATABASE_URL=postgresql://username:password@localhost:5432/notifications_db

# Redis (for BullMQ)
REDIS_URL=redis://localhost:6379

# Firebase FCM
FIREBASE_SERVICE_ACCOUNT_JSON='{...}'

# Security
API_KEY_MASTER=your_master_key_here
JWT_SECRET=your_jwt_secret_here

# Rate Limiting
RATE_LIMIT_POINTS=100
RATE_LIMIT_DURATION=60
```

### Database Migration

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev --name init

# (Optional) View database
npx prisma studio
```

### Seed API Keys

```bash
# Generate initial API keys
npm run seed

# This will create API keys for:
# - Topic notifications only
# - Personal notifications only
# - Admin access (all scopes)
# - Full access (all scopes)

# Save the generated keys securely!!
```

## 🐳 Docker Setup

### Using Docker Compose (Recommended)

```bash
# Start all services
docker compose up -d

# This includes:
# - PostgreSQL database
# - Redis for queues
# - Notifications API
- Adminer (database GUI)

# View logs
docker compose logs -f

# Stop services
docker compose down
```

### Manual Container Commands

```bash
# Build the application image
docker build -t notifications-api .

# Run with environment variables
docker run -d \
  --name notifications-api \
  -p 3000:3000 \
  --env-file .env \
  notifications-api
```

### Development with Docker

```bash
# Start only database and Redis
docker compose up -d db redis

# Run API in development mode
npm run start:dev
```

## 🧪 Testing the Setup

### Quick Start Test

```bash
# Start the development server
npm run start:dev

# Check health endpoint
curl http://localhost:3000/health

# Expected response:
# {"status":"ok","timestamp":"2025-12-09T22:50:00.000Z"}

# Swagger UI should be available at:
# http://localhost:3000/swagger
```

### API Key Test

```bash
# Test API key authentication
curl -H "X-API-Key: your-api-key-here" \
     http://localhost:3000/v1/notifications?userId=test-user

# Should return empty array (no notifications yet)
```

### Device Registration Test

```bash
# Register a test device
curl -X POST http://localhost:3000/v1/devices/register \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-personal-api-key" \
  -d '{
    "platform": "ios",
    "fcmToken": "test-token-123",
    "userId": "test-user"
  }'
```

## 🔧 Troubleshooting

### Common Issues

**1. Prisma Connection Error**

```bash
# Check database is running
ps aux | grep postgres

# Verify DATABASE_URL format
# Should be: postgresql://username:password@host:port/database
```

**2. Redis Connection Error**

```bash
# Check Redis is running
redis-cli ping
# Should respond: PONG
```

**3. Firebase Authentication Error**

```bash
# Verify service account JSON format
# Common issue: private_key needs proper line breaks
node -e "
const fs = require('fs');
const key = JSON.parse(fs.readFileSync('.env', 'utf8')).FIREBASE_SERVICE_ACCOUNT_JSON;
console.log('Key format OK:', key.includes('BEGIN PRIVATE KEY'));
"
```

**4. API Key Authentication Fails**

```bash
# Run seed script again to generate new keys
npm run seed

# Check scopes in database
npx prisma studio
```

## 🎯 Production Deployment

### Environment Configuration

For production, ensure these settings:

```bash
NODE_ENV=production
DATABASE_URL=postgresql://prod-user:prod-password@prod-db-host:5432/prod-db
REDIS_URL=redis://prod-redis-host:6379
```

### Docker Production Build

```bash
# Build with minimal layers
docker build --target production -t notifications-prod .

# Run with production settings
docker run -d --restart unless-stopped notifications-prod
```

### Health Monitoring

```bash
# Health check endpoint
curl https://your-api.com/health

# Metrics endpoint
curl https://your-api.com/health/metrics
```

## 📚 Next Steps

After setup is complete:

1. **[API Documentation](./api.md)** - Complete API reference
2. **[Architecture Guide](./architecture.md)** - System design overview
3. **[Deployment Guide](./deployment.md)** - Production scaling and monitoring
4. **[FCM Integration](./fcm.md)** - Firebase messaging setup

## 🔧 Additional Commands

```bash
# Run tests
npm test

# Lint code
npm run lint

# Format code
npm run format

# Debug mode
npm run start:debug

# Build production
npm run build
```
