# Production Deployment Guide

This guide covers deploying the Notifications Microservice in production using `docker-compose.production.yml`.

## Prerequisites

### Required External Services

The production setup requires external managed services for:

1. **PostgreSQL Database** (v14+)
   - AWS RDS, Google Cloud SQL, Azure Database, or self-hosted
   - With SSL enabled (recommended)
2. **Redis** (v7+)
   - AWS ElastiCache, Google Cloud Memorystore, Azure Cache for Redis, or self-hosted
   - With persistence enabled (AOF recommended)

3. **Firebase Project**
   - Service account with FCM permissions
   - APNs certificates configured (for iOS)

### Server Requirements

- Docker 20.10+
- Docker Compose 2.0+
- 2GB+ RAM
- 2+ CPU cores
- 10GB+ disk space

---

## Setup Instructions

### 1. Prepare Environment Variables

```bash
# Copy the example file
cp .env.production.example .env.production

# Edit with your actual values
nano .env.production
```

**Required Variables:**

```bash
# Database (external managed PostgreSQL)
DATABASE_URL=postgresql://user:pass@your-db-host:5432/notifications_db?sslmode=require

# Redis (external managed Redis)
REDIS_URL=redis://your-redis-host:6379

# Firebase (single-line JSON from Firebase Console)
FIREBASE_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'

# Security (generate strong random strings)
API_KEY_MASTER=your-secure-master-key
JWT_SECRET=your-secure-jwt-secret

# Optional configurations
RATE_LIMIT_POINTS=1000
RATE_LIMIT_DURATION=60
WORKER_REPLICAS=2
LOG_LEVEL=info
```

### 2. Build the Docker Image

```bash
# Build production image
docker build -t notifications:latest .

# Or tag with version
docker build -t notifications:v1.0.0 .
```

### 3. Run Database Migrations

Before starting the services, run migrations on your external database:

```bash
# Set DATABASE_URL temporarily
export DATABASE_URL="postgresql://user:pass@your-db-host:5432/notifications_db?sslmode=require"

# Run migrations
npx prisma migrate deploy

# Or using Docker
docker run --rm \
  -e DATABASE_URL="$DATABASE_URL" \
  notifications:latest \
  npx prisma migrate deploy
```

### 4. Seed Initial Data (First Time Only)

```bash
# Create API keys
npm run seed

# Or using Docker
docker run --rm \
  -e DATABASE_URL="$DATABASE_URL" \
  notifications:latest \
  npm run seed
```

**Save the generated API keys!** They will be displayed in the output.

### 5. Start Production Services

```bash
# Load environment variables and start services
docker-compose -f docker-compose.production.yml --env-file .env.production up -d

# View logs
docker-compose -f docker-compose.production.yml logs -f

# Check status
docker-compose -f docker-compose.production.yml ps
```

### 6. Verify Deployment

```bash
# Health check
curl http://localhost:3000/health

# Expected response:
# {"status":"ok","timestamp":"2025-12-10T00:00:00.000Z"}

# Check Swagger docs
curl http://localhost:3000/swagger
```

---

## Scaling

### Scale Worker Instances

```bash
# Scale workers to 5 instances
docker-compose -f docker-compose.production.yml up -d --scale worker=5

# Or set in .env.production
WORKER_REPLICAS=5
```

### Scale API Instances

For multiple API instances, use a load balancer:

```bash
# Scale API to 3 instances
docker-compose -f docker-compose.production.yml up -d --scale api=3
```

Then configure nginx/haproxy to load balance:

```nginx
upstream api_backend {
    least_conn;
    server localhost:3001;
    server localhost:3002;
    server localhost:3003;
}

server {
    listen 80;
    location / {
        proxy_pass http://api_backend;
    }
}
```

---

## Monitoring

### View Logs

```bash
# All services
docker-compose -f docker-compose.production.yml logs -f

# Specific service
docker-compose -f docker-compose.production.yml logs -f api
docker-compose -f docker-compose.production.yml logs -f worker

# Last 100 lines
docker-compose -f docker-compose.production.yml logs --tail=100 -f
```

### Check Service Status

```bash
# Service status
docker-compose -f docker-compose.production.yml ps

# Resource usage
docker stats notifications-api notifications-worker
```

### Health Checks

```bash
# API health
curl http://localhost:3000/health

# Detailed metrics
curl http://localhost:3000/health/metrics
```

---

## Maintenance

### Update Deployment

```bash
# 1. Build new image
docker build -t notifications:v1.0.1 .

# 2. Update docker-compose.production.yml image version
# Change: image: notifications:latest
# To:     image: notifications:v1.0.1

# 3. Pull new image and restart
docker-compose -f docker-compose.production.yml up -d

# 4. Clean old images
docker image prune -f
```

### Database Migrations

```bash
# 1. Backup database first!
# 2. Run new migrations
docker run --rm \
  -e DATABASE_URL="$DATABASE_URL" \
  notifications:v1.0.1 \
  npx prisma migrate deploy

# 3. Restart services
docker-compose -f docker-compose.production.yml restart
```

### Rollback

```bash
# Rollback to previous version
docker-compose -f docker-compose.production.yml down
# Edit docker-compose.production.yml to use previous image version
docker-compose -f docker-compose.production.yml up -d
```

---

## Backup & Recovery

### Database Backup

```bash
# Backup using pg_dump
pg_dump -h your-db-host -U username notifications_db > backup_$(date +%Y%m%d).sql

# Automated daily backups (add to crontab)
0 2 * * * pg_dump -h your-db-host -U username notifications_db | gzip > /backups/db_$(date +\%Y\%m\%d).sql.gz
```

### Redis Backup

```bash
# If using Redis persistence (RDB)
redis-cli --host your-redis-host BGSAVE

# Copy dump.rdb file
scp user@redis-host:/var/lib/redis/dump.rdb ./redis_backup_$(date +%Y%m%d).rdb
```

### Application Logs Backup

```bash
# Archive logs
tar -czf logs_$(date +%Y%m%d).tar.gz logs/

# Rotate logs (add to logrotate.d)
/app/logs/*.log {
    daily
    rotate 7
    compress
    delaycompress
    notifempty
    create 0640 nestjs nodejs
}
```

---

## Troubleshooting

### Services Won't Start

```bash
# Check logs for errors
docker-compose -f docker-compose.production.yml logs

# Verify environment variables
docker-compose -f docker-compose.production.yml config

# Check external services
# Test database connection
psql "$DATABASE_URL" -c "SELECT 1"

# Test Redis connection
redis-cli -h your-redis-host ping
```

### High Memory Usage

```bash
# Check resource usage
docker stats

# Adjust memory limits in docker-compose.production.yml
resources:
  limits:
    memory: 1G  # Increase if needed
```

### Worker Not Processing Jobs

```bash
# Check worker logs
docker-compose -f docker-compose.production.yml logs worker

# Verify Redis connection
docker-compose -f docker-compose.production.yml exec worker sh
# Inside container:
redis-cli -h your-redis-host ping

# Check queue status (from app)
curl -H "X-API-Key: YOUR_ADMIN_KEY" http://localhost:3000/health/metrics
```

### Database Connection Issues

```bash
# Test connection from container
docker-compose -f docker-compose.production.yml exec api sh
# Inside container:
npx prisma db push --skip-generate

# Check SSL requirements
# Ensure ?sslmode=require is in DATABASE_URL for production databases
```

---

## Security Best Practices

### 1. Use Secrets Management

Instead of .env files in production, use:

- **Docker Secrets** (Swarm mode)
- **Kubernetes Secrets**
- **AWS Secrets Manager**
- **HashiCorp Vault**
- **Azure Key Vault**

### 2. Network Security

```yaml
# docker-compose.production.yml
services:
  api:
    networks:
      - internal
      - external
  worker:
    networks:
      - internal # No external network needed

networks:
  internal:
    driver: bridge
  external:
    driver: bridge
```

### 3. Firewall Rules

```bash
# Only allow API port from load balancer
ufw allow from LOAD_BALANCER_IP to any port 3000

# Block direct access to other services
ufw deny 5432  # PostgreSQL
ufw deny 6379  # Redis
```

### 4. SSL/TLS

Use a reverse proxy (nginx/traefik) with SSL:

```nginx
server {
    listen 443 ssl http2;
    server_name notifications.example.com;

    ssl_certificate /etc/ssl/certs/cert.pem;
    ssl_certificate_key /etc/ssl/private/key.pem;

    location / {
        proxy_pass http://localhost:3000;
    }
}
```

---

## Performance Optimization

### 1. Resource Allocation

```yaml
# Optimize based on load
api:
  deploy:
    replicas: 3
    resources:
      limits:
        cpus: '2.0'
        memory: 1G

worker:
  deploy:
    replicas: 5
    resources:
      limits:
        cpus: '1.0'
        memory: 512M
```

### 2. Database Connection Pool

Adjust in application code or via DATABASE_URL:

```bash
DATABASE_URL="postgresql://user:pass@host:5432/db?connection_limit=20&pool_timeout=30"
```

### 3. Redis Optimization

```bash
# Use Redis cluster for high availability
REDIS_URL="redis://node1:6379,redis://node2:6379,redis://node3:6379"
```

---

## Production Checklist

- [ ] External PostgreSQL configured with SSL
- [ ] External Redis configured with persistence
- [ ] Firebase service account created and tested
- [ ] Strong API keys and secrets generated
- [ ] Environment variables secured (not in git)
- [ ] Database migrations run successfully
- [ ] Initial API keys seeded
- [ ] Health checks responding
- [ ] Logs being collected and rotated
- [ ] Backups configured and tested
- [ ] Monitoring and alerts set up
- [ ] Firewall rules configured
- [ ] SSL/TLS certificates installed
- [ ] Load balancer configured (if multi-instance)
- [ ] Documentation updated with production URLs

---

## Support

For issues or questions:

1. Check logs: `docker-compose -f docker-compose.production.yml logs`
2. Verify configuration: `docker-compose -f docker-compose.production.yml config`
3. Test external services connectivity
4. Review [docs/deployment.md](./docs/deployment.md) for detailed troubleshooting
