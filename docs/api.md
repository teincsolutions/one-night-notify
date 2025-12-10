# 📚 API Reference

Complete API documentation for the Notifications Microservice with examples, request/response schemas, and error codes.

## 🔐 Authentication

All endpoints require API key authentication in the `X-API-Key` header, except for health check endpoints.

```bash
curl -H "X-API-Key: your-api-key-here" \
     https://api.example.com/v1/notifications
```

### API Key Scopes

| Scope      | Description                     | Endpoints                                               |
| ---------- | ------------------------------- | ------------------------------------------------------- |
| `topic`    | Topic notifications only        | `POST /v1/notifications/topic`                          |
| `personal` | Personal & device notifications | `POST /v1/devices/*`, `POST /v1/notifications/personal` |
| `admin`    | Full system access              | All endpoints + health metrics                          |

## 🚀 Base URL

```
https://api.example.com/v1
```

## 📋 API Endpoints

### Health & System Endpoints

#### GET /health

Simple health check endpoint. **No authentication required.**

**Response:**

```json
{
  "status": "ok",
  "timestamp": "2025-12-09T22:50:00.000Z"
}
```

**cURL Example:**

```bash
curl https://api.example.com/health
```

#### GET /health/metrics

System metrics and performance data. **Requires admin scope.**

**Response:**

```json
{
  "uptime": 3600,
  "memory": {
    "rss": 52428800,
    "heapTotal": 33554432,
    "heapUsed": 20971520,
    "external": 4194304
  }
}
```

**cURL Example:**

```bash
curl -H "X-API-Key: admin-api-key" \
     https://api.example.com/health/metrics
```

---

## 📱 Device Management

### POST /v1/devices/register

Register a device with FCM token for receiving notifications.

**Required Scope:** `personal` or `admin`

**Request Body:**

```json
{
  "platform": "ios|android",
  "fcmToken": "device-fcm-token",
  "userId": "optional-user-identifier",
  "meta": {
    "model": "iPhone 13",
    "version": "iOS 15.0"
  }
}
```

**Response (201 Created):**

```json
{
  "id": "device-uuid",
  "userId": "user-id",
  "platform": "ios",
  "fcmToken": "device-fcm-token",
  "lastSeenAt": "2025-12-09T22:50:00.000Z",
  "createdAt": "2025-12-09T22:50:00.000Z",
  "updatedAt": "2025-12-09T22:50:00.000Z"
}
```

**Error Responses:**

| Status | Error Code       | Description                       |
| ------ | ---------------- | --------------------------------- |
| 400    | VALIDATION_ERROR | Invalid platform or missing token |
| 401    | UNAUTHORIZED     | Invalid or missing API key        |
| 403    | FORBIDDEN        | Insufficient scope permissions    |

**cURL Example:**

```bash
curl -X POST https://api.example.com/v1/devices/register \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "platform": "ios",
    "fcmToken": "eAbCdEfG_hI:APA91bF...",
    "userId": "user123"
  }'
```

### PUT /v1/devices/tokens/refresh

Refresh FCM token when device token changes (e.g., app reinstall).

**Required Scope:** `personal` or `admin`

**Request Body:**

```json
{
  "oldToken": "previous-fcm-token",
  "newToken": "new-fcm-token"
}
```

**Response (200 OK):**

```json
{
  "id": "device-uuid",
  "userId": "user-id",
  "platform": "ios",
  "fcmToken": "new-fcm-token",
  "lastSeenAt": "2025-12-09T22:50:00.000Z",
  "updatedAt": "2025-12-09T22:50:00.000Z"
}
```

---

## 🔔 Notification Management

### POST /v1/notifications/topic

Send notification to all subscribers of a topic.

**Required Scope:** `topic` or `admin`

**Request Body:**

```json
{
  "topic": "news-updates",
  "title": "Breaking News",
  "body": "Important announcement from our team",
  "data": {
    "action": "open-article",
    "articleId": "12345"
  },
  "icon": "https://example.com/icon.png",
  "image": "https://example.com/banner.jpg",
  "clickAction": "https://example.com/article/12345"
}
```

**Response (200 OK):**

```json
{
  "notificationId": "notification-uuid",
  "fcmResponse": {
    "messageId": "projects/project-id/messages/123456789",
    "success": true
  }
}
```

**Error Responses:**

| Status | Error Code       | Description                |
| ------ | ---------------- | -------------------------- |
| 400    | VALIDATION_ERROR | Missing required fields    |
| 500    | FCM_ERROR        | Firebase messaging failure |

### POST /v1/notifications/personal

Send personalized notifications to specific users.

**Required Scope:** `personal` or `admin`

**Request Body:**

```json
{
  "userIds": ["user123", "user456"],
  "title": "Personal Message",
  "body": "Hello! You have a new message.",
  "data": {
    "type": "message",
    "senderId": "admin"
  }
}
```

**Response (200 OK):**

```json
{
  "notificationId": "notification-uuid",
  "fcmResponses": [
    {
      "messageId": "projects/project-id/messages/123456789",
      "success": true
    }
  ]
}
```

### GET /v1/notifications

Retrieve user's notification history.

**Required Scope:** `personal` or `admin`

**Query Parameters:**

- `userId` (required): User identifier
- `limit` (optional): Number of notifications (default: 50, max: 200)
- `offset` (optional): Pagination offset (default: 0)

**Request:**

```
GET /v1/notifications?userId=user123&limit=20&offset=0
```

**Response (200 OK):**

```json
[
  {
    "id": "notification-uuid",
    "targetId": "target-uuid",
    "type": "personal",
    "title": "Personal Message",
    "body": "Hello! You have a new message.",
    "data": {
      "type": "message",
      "senderId": "admin"
    },
    "createdAt": "2025-12-09T22:50:00.000Z",
    "read": false,
    "deliveredAt": "2025-12-09T22:50:05.000Z"
  }
]
```

### PATCH /v1/notifications/:id/mark-read

Mark a specific notification as read.

**Required Scope:** `personal` or `admin`
**Ownership:** User can only mark their own notifications

**Request Body:**

```json
{
  "userId": "user123"
}
```

**Response (200 OK):**

```json
{
  "id": "target-uuid",
  "notificationId": "notification-uuid",
  "userId": "user123",
  "read": true,
  "deliveredAt": "2025-12-09T22:50:05.000Z"
}
```

### POST /v1/notifications/sync

Sync notifications for clients (optional implementation).

**Required Scope:** `personal` or `admin`

**Request Body:**

```json
{
  "userId": "user123",
  "lastSyncTimestamp": "2025-12-09T20:00:00.000Z"
}
```

---

## 📋 Request/Response Schemas

### Common Notification Fields

```typescript
interface NotificationPayload {
  title: string; // Notification title (required)
  body: string; // Notification body (required)
  data?: object; // Custom data payload
  icon?: string; // Icon URL
  image?: string; // Banner image URL
  clickAction?: string; // Click action URL
}
```

### Device Registration Schema

```typescript
interface DeviceRegistration {
  platform: 'ios' | 'android'; // Device platform
  fcmToken: string; // FCM registration token
  userId?: string; // Optional user association
  meta?: object; // Additional metadata
}
```

### Notification Target Schema

```typescript
interface NotificationTarget {
  id: string; // Unique target ID
  notificationId: string; // Parent notification ID
  deviceId?: string; // Associated device ID
  token: string; // FCM token used
  status: 'pending' | 'sent' | 'failed' | 'invalid';
  fcmResponse?: object; // FCM API response
  deliveredAt?: string; // ISO timestamp
  read: boolean; // Read status
  createdAt: string; // ISO timestamp
}
```

---

## ❗ Error Responses

All errors follow this standard format:

```json
{
  "statusCode": 400,
  "message": "Validation Error",
  "error": "VALIDATION_ERROR",
  "timestamp": "2025-12-09T22:50:00.000Z"
}
```

### HTTP Status Codes

| Code | Meaning                          |
| ---- | -------------------------------- |
| 200  | Success                          |
| 201  | Created                          |
| 400  | Bad Request (validation error)   |
| 401  | Unauthorized (invalid API key)   |
| 403  | Forbidden (insufficient scope)   |
| 404  | Not Found                        |
| 429  | Too Many Requests (rate limited) |
| 500  | Internal Server Error            |

### Common Error Codes

- `VALIDATION_ERROR`: Invalid request data
- `UNAUTHORIZED`: Missing or invalid API key
- `FORBIDDEN`: Insufficient permissions
- `NOT_FOUND`: Resource not found
- `RATE_LIMITED`: API rate limit exceeded
- `FCM_ERROR`: Firebase messaging failure
- `DATABASE_ERROR`: Database operation failed

---

## 🎯 Rate Limiting

API calls are rate limited per API key:

- **Default**: 100 requests per minute
- **Header**: `X-RateLimit-Remaining` shows remaining calls
- **Header**: `X-RateLimit-Reset` shows reset timestamp

```bash
# Check rate limit status
curl -I https://api.example.com/v1/notifications \
  -H "X-API-Key: your-api-key"

# Response headers:
# X-RateLimit-Remaining: 97
# X-RateLimit-Reset: 1733781150000
```

---

## 🧪 Testing Examples

### 1. Complete Workflow Test

```bash
# 1. Register device
curl -X POST https://api.example.com/v1/devices/register \
  -H "Content-Type: application/json" \
  -H "X-API-Key: personal-key" \
  -d '{"platform": "ios", "fcmToken": "test-token", "userId": "test-user"}'

# 2. Send personal notification
curl -X POST https://api.example.com/v1/notifications/personal \
  -H "Content-Type: application/json" \
  -H "X-API-Key: personal-key" \
  -d '{"userIds": ["test-user"], "title": "Test", "body": "Hello from API!"}'

# 3. Get notification history
curl "https://api.example.com/v1/notifications?userId=test-user" \
  -H "X-API-Key: personal-key"

# 4. Mark as read
curl -X PATCH https://api.example.com/v1/notifications/target-id/mark-read \
  -H "Content-Type: application/json" \
  -H "X-API-Key: personal-key" \
  -d '{"userId": "test-user"}'
```

### 2. Topic Notification Test

```bash
# Send topic notification
curl -X POST https://api.example.com/v1/notifications/topic \
  -H "Content-Type: application/json" \
  -H "X-API-Key: topic-key" \
  -d '{
    "topic": "announcements",
    "title": "Scheduled Maintenance",
    "body": "Server maintenance tonight from 2-4 AM EST",
    "data": {"maintenanceStart": "2025-12-10T02:00:00Z"},
    "clickAction": "https://status.example.com"
  }'
```

---

## 🔗 Related Topics

- **[Setup Guide](./setup.md)** - Environment setup and configuration
- **[Architecture](./architecture.md)** - System design and data flow
- **[Notifications Flow](./notifications-flow.md)** - End-to-end message lifecycle
- **[FCM Integration](./fcm.md)** - Firebase Cloud Messaging setup
