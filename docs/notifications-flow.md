# Notification Flow Documentation

This document explains the complete flow of notifications from registration to delivery and tracking.

## Overview

The notification system supports two types of notifications:

1. **Topic Notifications**: Broadcast to all devices subscribed to a topic
2. **Personal Notifications**: Targeted to specific users/devices

---

## Flow 1: Device Registration

### Step-by-Step Process

```
┌─────────────┐
│ Mobile App  │
│             │
│ 1. Obtain   │
│ FCM Token   │
└──────┬──────┘
       │
       │ POST /v1/devices/register
       │ {
       │   "fcmToken": "...",
       │   "platform": "android",
       │   "userId": "uuid",
       │   "meta": {...}
       │ }
       │
┌──────▼────────┐
│ API Gateway   │
│ (ApiKeyGuard) │
└──────┬────────┘
       │
       │ Validate API Key
       │
┌──────▼──────────┐
│ DevicesController│
└──────┬──────────┘
       │
┌──────▼──────────┐
│ DevicesService  │
│                 │
│ Check if token  │
│ exists          │
└──────┬──────────┘
       │
   ┌───┴───┐
   │       │
┌──▼─────┐ │
│ Exists │ │
│ Update │ │
│ record │ │
└────────┘ │
           │
      ┌────▼─────┐
      │ New      │
      │ Create   │
      │ record   │
      └──────────┘
       │
┌──────▼─────────┐
│   Database     │
│   Device       │
│   Table        │
└────────────────┘
```

### Request Example

```bash
curl -X POST http://localhost:3000/v1/devices/register \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "fcmToken": "eXjDqS_8QiG...",
    "platform": "android",
    "userId": "123e4567-e89b-12d3-a456-426614174000",
    "meta": {
      "appVersion": "1.0.0",
      "osVersion": "14.0",
      "deviceModel": "Pixel 7"
    }
  }'
```

### Response

```json
{
  "id": "device-uuid",
  "userId": "123e4567-e89b-12d3-a456-426614174000",
  "platform": "android",
  "fcmToken": "eXjDqS_8QiG...",
  "lastSeenAt": "2025-12-09T23:00:00.000Z",
  "createdAt": "2025-12-09T23:00:00.000Z",
  "updatedAt": "2025-12-09T23:00:00.000Z"
}
```

---

## Flow 2: Topic Notification

### Step-by-Step Process

```
┌─────────────┐
│ Backend App │
│             │
│ Send to     │
│ "news"      │
│ topic       │
└──────┬──────┘
       │
       │ POST /v1/notifications/topic
       │ {
       │   "topic": "news",
       │   "title": "Breaking News",
       │   "body": "...",
       │   "data": {...}
       │ }
       │
┌──────▼────────────┐
│ NotificationsCtrl │
└──────┬────────────┘
       │
┌──────▼─────────────┐
│ NotificationsService│
│                     │
│ 1. Create Notif.    │
│    record in DB     │
└──────┬──────────────┘
       │
┌──────▼─────────────┐
│   Database         │
│   Notification     │
│   Table            │
└──────┬─────────────┘
       │
┌──────▼─────────────┐
│ Firebase Service   │
│                    │
│ 2. Send to Topic   │
│    via FCM         │
└──────┬─────────────┘
       │
┌──────▼──────────────┐
│ Firebase Cloud      │
│ Messaging           │
│                     │
│ 3. Deliver to all   │
│    subscribed       │
│    devices          │
└──────┬──────────────┘
       │
┌──────▼──────────────┐
│ Mobile Devices      │
│ (subscribed to      │
│  "news" topic)      │
└─────────────────────┘
```

### Request Example

```bash
curl -X POST http://localhost:3000/v1/notifications/topic \
  -H "X-API-Key: YOUR_TOPIC_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "news",
    "title": "Breaking News",
    "body": "Major announcement today!",
    "data": {
      "articleId": "12345",
      "category": "technology"
    },
    "image": "https://example.com/image.jpg",
    "clickAction": "https://example.com/news/12345"
  }'
```

### Response

```json
{
  "notificationId": "notif-uuid",
  "fcmResponse": {
    "messageId": "projects/myproject/messages/0:1234567890",
    "success": true
  }
}
```

---

## Flow 3: Personal Notification (with User Status & Queuing)

### Step-by-Step Process

```
┌─────────────┐
│ Backend App │
│             │
│ Send to     │
│ User(s)     │
└──────┬──────┘
       │
       │ POST /v1/notifications/personal
       │ {
       │   "userIds": ["uuid1", "uuid2"],
       │   "title": "You have a message",
       │   "body": "..."
       │ }
       │
┌──────▼────────────┐
│ NotificationsCtrl │
└──────┬────────────┘
       │
┌──────▼─────────────┐
│ NotificationsService│
│                     │
│ 1. Query devices    │
│    for userIds      │
└──────┬──────────────┘
       │
┌──────▼──────────────┐
│   Database          │
│   Device Query      │
│   WHERE userId IN   │
│   (userIds)         │
└──────┬──────────────┘
       │
       │ tokens: [token1, token2, ...]
       │
┌──────▼──────────────┐
│ NotificationsService│
│                     │
│ 2. Check User Status│
│    for each userId  │
└──────┬──────────────┘
       │
┌──────▼──────────────┐
│   Database          │
│   UserStatus Query  │
│   WHERE userId IN   │
│   (userIds)         │
└──────┬──────────────┘
       │
       │ status: [{userId, status: 'online'|'offline'|'paused'}, ...]
       │
┌──────▼──────────────┐
│ NotificationsService│
│                     │
│ 3. Split users:     │
│    - Online: send now│
│    - Offline: queue  │
└──────┬──────────────┘
       │
       ├─ Online Users ──┐
       │                 │
┌──────▼──────────────┐ │
│ Firebase Service    │ │
│                     │ │
│ Send multicast      │ │
│ to online tokens    │ │
└──────┬──────────────┘ │
       │                 │
┌──────▼──────────────┐ │
│ Firebase Cloud      │ │
│ Messaging           │ │
│                     │ │
│ sendEach(online)    │ │
└──────┬──────────────┘ │
       │                 │
       │ responses: [{success, messageId}, ...]
       │                 │
       └─────────────────┘
       ├─ Offline Users ─┐
       │                 │
┌──────▼──────────────┐ │
│ NotificationsService│ │
│                     │ │
│ 4. Create Notif.    │ │
│    + Queue targets   │ │
│    (status: queued)  │ │
└──────┬──────────────┘ │
       │                 │
┌──────▼──────────────┐ │
│   Database          │ │
│   Notification +    │ │
│   NotificationTarget│ │
│   (status: queued,  │ │
│    expiresAt: +24h) │ │
└──────┬──────────────┘ │
       │                 │
       └─────────────────┘
┌──────▼──────────────┐
│ NotificationsService│
│                     │
│ 5. Update online    │
│    targets status   │
└──────┬──────────────┘
       │
┌──────▼──────────────┐
│   Database          │
│   NotificationTarget│
│   status: sent      │
└──────┬──────────────┘
       │
┌──────▼──────────────┐
│ Mobile Devices      │
│ (online users only) │
└─────────────────────┘
```

### User Status Management Flow

```
┌─────────────┐
│ Mobile App  │
│             │
│ User goes   │
│ online      │
└──────┬──────┘
       │
       │ POST /v1/notifications/user-status/online
       │ {"userId": "uuid"}
       │
┌──────▼────────────┐
│ NotificationsCtrl │
└──────┬────────────┘
       │
┌──────▼─────────────┐
│ UserStatusService  │
│                    │
│ 1. Update status   │
│    to 'online'     │
└──────┬─────────────┘
       │
┌──────▼─────────────┐
│   Database         │
│   UserStatus       │
│   status: online   │
└──────┬─────────────┘
       │
┌──────▼─────────────┐
│ NotificationsService│
│                     │
│ 2. Find queued     │
│    notifications   │
└──────┬─────────────┘
       │
┌──────▼─────────────┐
│   Database         │
│   NotificationTarget│
│   WHERE userId=uuid │
│   AND status=queued │
│   AND expiresAt>now │
└──────┬─────────────┘
       │
       │ queued: [target1, target2, ...]
       │
┌──────▼─────────────┐
│ NotificationsService│
│                     │
│ 3. Send queued     │
│    notifications   │
└──────┬─────────────┘
       │
┌──────▼─────────────┐
│ Firebase Service   │
│                    │
│ Send to device     │
└──────┬─────────────┘
       │
┌──────▼─────────────┐
│ Firebase Cloud     │
│ Messaging          │
└──────┬─────────────┘
       │
┌──────▼─────────────┐
│ NotificationsService│
│                     │
│ 4. Update targets  │
│    status: sent     │
└──────┬─────────────┘
       │
┌──────▼──────────────┐
│   Database          │
│   NotificationTarget│
│   status: sent      │
└──────┬──────────────┘
       │
┌──────▼──────────────┐
│ Mobile Device       │
│ (receives queued    │
│  notifications)     │
└─────────────────────┘
```

### Request Example

```bash
curl -X POST http://localhost:3000/v1/notifications/personal \
  -H "X-API-Key: YOUR_PERSONAL_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "userIds": [
      "123e4567-e89b-12d3-a456-426614174000",
      "223e4567-e89b-12d3-a456-426614174001"
    ],
    "title": "Payment Received",
    "body": "You received $50.00 from John Doe",
    "data": {
      "transactionId": "tx_12345",
      "amount": "50.00",
      "sender": "John Doe"
    }
  }'
```

### Response

```json
{
  "notificationId": "notif-uuid",
  "fcmResponses": {
    "successCount": 1,
    "failureCount": 0,
    "responses": [
      {
        "success": true,
        "messageId": "projects/myproject/messages/0:1234567890"
      }
    ]
  },
  "queuedForUsers": ["223e4567-e89b-12d3-a456-426614174001"],
  "deliveredToUsers": ["123e4567-e89b-12d3-a456-426614174000"]
}
```

**Note:** The response now includes `queuedForUsers` and `deliveredToUsers` arrays to indicate which users received immediate delivery vs. queuing based on their current status.

---

## Flow 4: Fetching Notification History

### Step-by-Step Process

```
┌─────────────┐
│ Mobile App  │
│             │
│ Fetch inbox │
└──────┬──────┘
       │
       │ GET /v1/notifications?userId=uuid&limit=50&offset=0
       │
┌──────▼────────────┐
│ NotificationsCtrl │
└──────┬────────────┘
       │
┌──────▼─────────────┐
│ NotificationsService│
│                     │
│ 1. Find devices     │
│    for userId       │
└──────┬──────────────┘
       │
┌──────▼──────────────┐
│   Database          │
│   Device Query      │
└──────┬──────────────┘
       │
       │ deviceIds: [id1, id2, ...]
       │
┌──────▼──────────────┐
│ NotificationsService│
│                     │
│ 2. Query targets    │
│    with notif. join │
└──────┬──────────────┘
       │
┌──────▼──────────────┐
│   Database          │
│   NotificationTarget│
│   JOIN Notification │
│   WHERE deviceId IN │
│   ORDER BY createdAt│
│   LIMIT, OFFSET     │
└──────┬──────────────┘
       │
       │ Results with notification details
       │
┌──────▼──────────────┐
│ Mobile App          │
│ Display inbox       │
└─────────────────────┘
```

### Request Example

```bash
curl -X GET "http://localhost:3000/v1/notifications?userId=123e4567-e89b-12d3-a456-426614174000&limit=20&offset=0" \
  -H "X-API-Key: YOUR_API_KEY"
```

### Response

```json
[
  {
    "id": "notif-uuid-1",
    "targetId": "target-uuid-1",
    "type": "personal",
    "title": "Payment Received",
    "body": "You received $50.00 from John Doe",
    "data": {
      "transactionId": "tx_12345",
      "amount": "50.00"
    },
    "topic": null,
    "createdAt": "2025-12-09T23:00:00.000Z",
    "read": false,
    "deliveredAt": "2025-12-09T23:00:01.000Z"
  },
  {
    "id": "notif-uuid-2",
    "targetId": "target-uuid-2",
    "type": "topic",
    "title": "Breaking News",
    "body": "Major announcement today!",
    "data": {},
    "topic": "news",
    "createdAt": "2025-12-09T22:00:00.000Z",
    "read": true,
    "deliveredAt": "2025-12-09T22:00:01.000Z"
  }
]
```

---

## Flow 5: Mark Notification as Read

### Step-by-Step Process

```
┌─────────────┐
│ Mobile App  │
│             │
│ User views  │
│ notification│
└──────┬──────┘
       │
       │ PATCH /v1/notifications/:targetId/mark-read
       │ { "userId": "uuid" }
       │
┌──────▼────────────┐
│ NotificationsCtrl │
└──────┬────────────┘
       │
┌──────▼─────────────┐
│ NotificationsService│
│                     │
│ 1. Verify ownership │
│    (targetId +      │
│     userId match)   │
└──────┬──────────────┘
       │
┌──────▼──────────────┐
│   Database          │
│   Query target      │
│   with device join  │
└──────┬──────────────┘
       │
       │ If found...
       │
┌──────▼──────────────┐
│ NotificationsService│
│                     │
│ 2. Update target    │
│    read = true      │
└──────┬──────────────┘
       │
┌──────▼──────────────┐
│   Database          │
│   NotificationTarget│
│   UPDATE read=true  │
└──────┬──────────────┘
       │
┌──────▼──────────────┐
│ Mobile App          │
│ Update UI           │
└─────────────────────┘
```

### Request Example

```bash
curl -X PATCH http://localhost:3000/v1/notifications/target-uuid-1/mark-read \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "123e4567-e89b-12d3-a456-426614174000"
  }'
```

### Response

```json
{
  "id": "target-uuid-1",
  "notificationId": "notif-uuid-1",
  "deviceId": "device-uuid",
  "read": true,
  "deliveredAt": "2025-12-09T23:00:01.000Z"
}
```

---

## Flow 6: Token Refresh

When a device's FCM token changes (app reinstall, token rotation), the client must update it.

### Request Example

```bash
curl -X PUT http://localhost:3000/v1/devices/tokens/refresh \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "oldToken": "old_fcm_token_here",
    "newToken": "new_fcm_token_here"
  }'
```

### Response

```json
{
  "id": "device-uuid",
  "fcmToken": "new_fcm_token_here",
  "updatedAt": "2025-12-09T23:10:00.000Z"
}
```

---

## Invalid Token Handling

### Automatic Cleanup Flow

```
┌─────────────────┐
│ FCM Send Attempt│
└────────┬────────┘
         │
         │ Response: invalid-token
         │
┌────────▼────────┐
│ Firebase Service│
│ Detects error   │
└────────┬────────┘
         │
┌────────▼────────────┐
│ Notification        │
│ Processor           │
│                     │
│ markInvalidTokens() │
└────────┬────────────┘
         │
┌────────▼────────┐
│   Database      │
│   DELETE Device │
│   WHERE token   │
└─────────────────┘
```

Invalid tokens are automatically removed from the database to maintain data hygiene.

---

## Error Scenarios

### Scenario 1: No Devices Found for User

**Request**: Personal notification to non-existent userId

**Response**:

```json
{
  "statusCode": 400,
  "message": "No devices found for the specified user IDs"
}
```

### Scenario 2: Invalid API Key

**Response**:

```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

### Scenario 3: Invalid Notification Target

**Request**: Mark-read with wrong userId

**Response**:

```json
{
  "statusCode": 404,
  "message": "Notification not found"
}
```

---

## Best Practices

1. **Register Device on App Launch**: Always register/update device token when app starts
2. **Handle Token Refresh**: Listen for FCM token updates and call refresh endpoint
3. **Pagination**: Use limit/offset when fetching notification history
4. **Mark as Read**: Update read status when user views notification
5. **Background Processing**: Heavy notification sends are queued for async processing
6. **Data Payload**: Keep data payload small (< 4KB for FCM)
7. **Error Handling**: Always handle API errors gracefully in client apps
