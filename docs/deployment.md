# Deployment Guide

This guide covers deploying the Notifications Microservice in various environments.

## Table of Contents

- [Docker Deployment](#docker-deployment)
- [Production Considerations](#production-considerations)
- [Scaling Workers](#scaling-workers)
- [Environment Variables](#environment-variables)
- [Health Checks](#health-checks)
- [Monitoring](#monitoring)
- [Kubernetes Deployment](#kubernetes-deployment-optional)

---

## Docker Deployment

### Prerequisites

- Docker 20.10+
- Docker Compose 2.0+
- PostgreSQL instance (or use Docker)
- Redis instance (or use Docker)

### Project Structure

```
├── Dockerfile                 # Single Docker image for both API and Worker
├── docker-compose.yml         # Local development setup
└── .env                       # Environment variables
```

### Building Images

```bash
# Build the application (single image for both API and worker)
docker build -t notifications:latest .
```

**Note:** We use a single Docker image for both API and worker services. The docker-compose file runs different instances with the same image.

### Docker Compose (Development)

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Clean volumes (reset database)
docker-compose down -v
```

### Docker Compose Configuration

The `docker-compose.yml` includes:

```yaml
services:
  # PostgreSQL Database
  db:
    image: postgres:16
    environment:
      POSTGRES_USER: username
      POSTGRES_PASSWORD: password
      POSTGRES_DB: notifications_db
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - '5432:5432'

  # Redis for BullMQ
  redis:
    image: redis:7-alpine
    ports:
      - '6379:6379'
    volumes:
      - redis_data:/data

  # API Service
  api:
    build:
      context: .
      dockerfile: Dockerfile
    command: ['dumb-init', 'node', 'dist/main']
    ports:
      - '4000:4000'
    environment:
      DATABASE_URL: postgresql://username:password@db:5432/notifications_db
      REDIS_URL: redis://redis:6379
    depends_on:
      - db
      - redis

  # Worker Service (same image, runs as background worker)
  worker:
    build:
      context: .
      dockerfile: Dockerfile
    command: ['dumb-init', 'node', 'dist/main']
    environment:
      WORKER_MODE: 'true'
      DATABASE_URL: postgresql://username:password@db:5432/notifications_db
      REDIS_URL: redis://redis:6379
    depends_on:
      - db
      - redis
    deploy:
      replicas: 2 # Run 2 worker instances
```

---

## Production Considerations

### 1. Database

#### PostgreSQL Configuration

```bash
# Connection pooling
DATABASE_URL="postgresql://user:pass@host:5432/db?pool_timeout=30&connection_limit=20"

# SSL mode for production
DATABASE_URL="postgresql://user:pass@host:5432/db?sslmode=require"
```

#### Recommended Settings

- **Connection Pool**: 20-50 connections per API instance
- **Statement Timeout**: 30 seconds
- **Idle Timeout**: 10 minutes
- **Max Connections**: Scale with number of API instances

#### Backup Strategy

```bash
# Daily backups
pg_dump -h host -U user notifications_db > backup_$(date +%Y%m%d).sql

# Automated with cron
0 2 * * * pg_dump -h host -U user notifications_db | gzip > /backups/db_$(date +\%Y\%m\%d).sql.gz
```

### 2. Redis Configuration

#### Persistence

Enable AOF (Append-Only File) for durability:

```conf
# redis.conf
appendonly yes
appendfsync everysec
```

#### Memory Management

```conf
maxmemory 2gb
maxmemory-policy allkeys-lru
```

#### Replication (Optional)

For high availability, set up Redis Sentinel or Redis Cluster.

### 3. Environment Variables

#### Production .env Template

```bash
# Server
NODE_ENV=production
PORT=4000

# Database (use managed service in production)
DATABASE_URL=postgresql://user:password@db-host:5432/notifications_db?sslmode=require

# Redis (use managed service in production)
REDIS_URL=redis://:password@redis-host:6379

# Firebase
FIREBASE_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'

# Security
API_KEY_MASTER=CHANGE_THIS_IN_PRODUCTION
JWT_SECRET=CHANGE_THIS_IN_PRODUCTION

# Rate Limiting
RATE_LIMIT_POINTS=1000
RATE_LIMIT_DURATION=60

# Logging
LOG_LEVEL=info
```

#### Secrets Management

**Option 1: Environment Variables (Docker/K8s)**

```bash
docker run -e DATABASE_URL=$DATABASE_URL notifications-api
```

**Option 2: AWS Secrets Manager**

```typescript
import { SecretsManager } from 'aws-sdk';

const getSecret = async (secretName: string) => {
  const secretsManager = new SecretsManager();
  const data = await secretsManager
    .getSecretValue({ SecretId: secretName })
    .promise();
  return JSON.parse(data.SecretString);
};
```

**Option 3: HashiCorp Vault**

```bash
vault kv get secret/notifications/firebase
```

### 4. Scaling

#### Horizontal Scaling

**API Instances:**

```bash
# Multiple API instances behind load balancer
docker-compose up --scale api=3
```

**Worker Instances:**

```bash
# Multiple workers processing queue
docker-compose up --scale worker=5
```

#### Load Balancer Configuration (Nginx)

```nginx
upstream api_backend {
    least_conn;
    server api1:4000;
    server api2:4000;
    server api3:4000;
}

server {
    listen 80;
    server_name notifications.example.com;

    location / {
        proxy_pass http://api_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location /health {
        proxy_pass http://api_backend/health;
        access_log off;
    }
}
```

### 5. Resource Limits

#### Docker Compose with Limits

```yaml
services:
  api:
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M
      replicas: 3

  worker:
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 512M
      replicas: 5
```

---

## Scaling Workers

### Worker Scaling Strategies

#### 1. Vertical Scaling

Increase resources per worker:

```yaml
worker:
  deploy:
    resources:
      limits:
        cpus: '2.0'
        memory: 1G
```

#### 2. Horizontal Scaling

Add more worker instances:

```bash
# Scale to 10 workers
docker-compose up --scale worker=10
```

#### 3. Auto-Scaling (Kubernetes)

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: worker-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: notifications-worker
  minReplicas: 2
  maxReplicas: 20
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
```

### Queue Monitoring

Monitor queue depth to determine scaling needs:

```typescript
// Get queue metrics
const queue = new Queue('notification-send');
const jobCounts = await queue.getJobCounts();

console.log({
  waiting: jobCounts.waiting,
  active: jobCounts.active,
  completed: jobCounts.completed,
  failed: jobCounts.failed,
});

// Auto-scale if waiting > 1000
if (jobCounts.waiting > 1000) {
  // Trigger scaling event
}
```

---

## Health Checks

### Endpoints

```bash
# Basic health check
GET /health

# Detailed metrics
GET /health/metrics
```

### Docker Health Check

```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"
```

### Load Balancer Health Checks

Configure health check in your load balancer:

- **Path**: `/health`
- **Interval**: 30 seconds
- **Timeout**: 5 seconds
- **Healthy Threshold**: 2
- **Unhealthy Threshold**: 3

---

## Monitoring

### Metrics to Track

1. **API Metrics**
   - Request rate
   - Response time (p50, p95, p99)
   - Error rate
   - Active connections

2. **Queue Metrics**
   - Queue depth (waiting jobs)
   - Processing rate
   - Failed job rate
   - Average processing time

3. **Database Metrics**
   - Connection pool usage
   - Query duration
   - Lock wait time
   - Replication lag (if applicable)

4. **FCM Metrics**
   - Messages sent
   - Delivery rate
   - Invalid token rate
   - FCM errors

### Logging

#### Structured Logging

```typescript
import { Logger } from '@nestjs/common';

const logger = new Logger('NotificationsService');

logger.log({
  message: 'Notification sent',
  notificationId: notif.id,
  userId: userId,
  platform: 'android',
  success: true,
});
```

#### Log Aggregation

**Option 1: ELK Stack**

```yaml
services:
  logstash:
    image: logstash:8
    ports:
      - '5000:5000'

  elasticsearch:
    image: elasticsearch:8

  kibana:
    image: kibana:8
    ports:
      - '5601:5601'
```

**Option 2: Cloud Logging**

- AWS CloudWatch
- Google Cloud Logging
- Azure Monitor

---

## Kubernetes Deployment (Optional)

### Deployment Manifest

```yaml
# api-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: notifications-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: notifications-api
  template:
    metadata:
      labels:
        app: notifications-api
    spec:
      containers:
        - name: api
          image: notifications-api:latest
          ports:
            - containerPort: 4000
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: notifications-secrets
                  key: database-url
            - name: REDIS_URL
              valueFrom:
                secretKeyRef:
                  name: notifications-secrets
                  key: redis-url
          livenessProbe:
            httpGet:
              path: /health
              port: 4000
            initialDelaySeconds: 10
            periodSeconds: 30
          resources:
            requests:
              memory: '256Mi'
              cpu: '500m'
            limits:
              memory: '512Mi'
              cpu: '1000m'
---
# worker-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: notifications-worker
spec:
  replicas: 5
  selector:
    matchLabels:
      app: notifications-worker
  template:
    metadata:
      labels:
        app: notifications-worker
    spec:
      containers:
        - name: worker
          image: notifications-worker:latest
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: notifications-secrets
                  key: database-url
            - name: REDIS_URL
              valueFrom:
                secretKeyRef:
                  name: notifications-secrets
                  key: redis-url
          resources:
            requests:
              memory: '256Mi'
              cpu: '500m'
            limits:
              memory: '512Mi'
              cpu: '1000m'
---
# service.yaml
apiVersion: v1
kind: Service
metadata:
  name: notifications-api-service
spec:
  selector:
    app: notifications-api
  ports:
    - protocol: TCP
      port: 80
      targetPort: 4000
  type: LoadBalancer
```

### Deploy to Kubernetes

```bash
# Create namespace
kubectl create namespace notifications

# Apply secrets
kubectl create secret generic notifications-secrets \
  --from-literal=database-url="postgresql://..." \
  --from-literal=redis-url="redis://..." \
  -n notifications

# Deploy
kubectl apply -f api-deployment.yaml -n notifications
kubectl apply -f worker-deployment.yaml -n notifications
kubectl apply -f service.yaml -n notifications

# Check status
kubectl get pods -n notifications
kubectl get services -n notifications

# View logs
kubectl logs -f deployment/notifications-api -n notifications
```

---

## CI/CD Pipeline

### Example GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Build image
        run: |
          docker build -t notifications:${{ github.sha }} .

      - name: Push to registry
        run: |
          echo ${{ secrets.DOCKER_PASSWORD }} | docker login -u ${{ secrets.DOCKER_USERNAME }} --password-stdin
          docker push notifications:${{ github.sha }}

      - name: Deploy to production
        run: |
          # Update Kubernetes deployments (both use same image)
          kubectl set image deployment/notifications-api api=notifications:${{ github.sha }}
          kubectl set image deployment/notifications-worker worker=notifications:${{ github.sha }}
```

---

## Database Migrations in Production

### Safe Migration Process

```bash
# 1. Backup database
pg_dump -h $DB_HOST -U $DB_USER $DB_NAME > pre_migration_backup.sql

# 2. Run migrations (with downtime)
npm run prisma:migrate:deploy

# 3. Verify
npm run prisma:studio

# 4. Deploy new code
docker-compose up -d

# 5. Health check
curl http://localhost:4000/health
```

### Zero-Downtime Migrations

1. **Add new columns** as nullable first
2. **Deploy code** that writes to both old and new columns
3. **Backfill data** in background
4. **Deploy code** that reads from new column
5. **Remove old column** in next release

---

## Rollback Strategy

### Quick Rollback

```bash
# Docker Compose
docker-compose down
docker-compose up -d --build

# Kubernetes
kubectl rollout undo deployment/notifications-api
kubectl rollout undo deployment/notifications-worker

# Verify
kubectl rollout status deployment/notifications-api
```

### Database Rollback

```bash
# Restore from backup
psql -h $DB_HOST -U $DB_USER $DB_NAME < pre_migration_backup.sql

# Or use Prisma
npx prisma migrate resolve --rolled-back <migration-name>
```

---

## Security Checklist

- [ ] API keys rotated and secured
- [ ] Database uses SSL/TLS
- [ ] Redis password-protected
- [ ] Firebase service account limited permissions
- [ ] Rate limiting enabled
- [ ] CORS configured properly
- [ ] Secrets not in version control
- [ ] Security headers enabled
- [ ] Regular security audits
- [ ] Dependencies updated regularly

---

## Performance Tuning

### Database Optimization

```sql
-- Add indexes
CREATE INDEX idx_device_userid ON "Device"("userId");
CREATE INDEX idx_notification_target_deviceid ON "NotificationTarget"("deviceId");
CREATE INDEX idx_notification_target_read ON "NotificationTarget"("read");
CREATE INDEX idx_notification_createdat ON "Notification"("createdAt" DESC);
```

### Redis Optimization

```conf
# Increase max clients
maxclients 10000

# Set memory eviction
maxmemory 4gb
maxmemory-policy allkeys-lfu
```

### BullMQ Configuration

```typescript
const queue = new Queue('notification-send', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: {
      age: 3600, // Keep for 1 hour
      count: 1000, // Keep last 1000
    },
    removeOnFail: {
      age: 86400, // Keep for 24 hours
    },
  },
});
```

---

## Cost Optimization

1. **Use managed services** for PostgreSQL and Redis in production
2. **Auto-scale workers** based on queue depth
3. **Clean up old data** regularly
4. **Use spot instances** for non-critical workers
5. **Monitor resource usage** and right-size instances
6. **Implement caching** where appropriate

---

## Support and Maintenance

### Regular Tasks

- **Daily**: Monitor logs and metrics
- **Weekly**: Review failed jobs, check disk space
- **Monthly**: Update dependencies, rotate secrets
- **Quarterly**: Security audit, performance review

### Incident Response

1. Check health endpoints
2. Review recent logs
3. Check queue status
4. Verify database connectivity
5. Test FCM configuration
6. Check resource utilization

---

## Resources

- [Docker Documentation](https://docs.docker.com/)
- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [PostgreSQL Performance](https://www.postgresql.org/docs/current/performance-tips.html)
- [Redis Best Practices](https://redis.io/topics/admin)
- [BullMQ Guide](https://docs.bullmq.io/)
