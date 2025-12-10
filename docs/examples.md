# Notification Examples

This document provides comprehensive examples of different notification types and use cases.

## Table of Contents

- [Topic Notifications](#topic-notifications)
- [Personal Notifications](#personal-notifications)
- [Transaction Alerts](#transaction-alerts)
- [Promotional Messages](#promotional-messages)
- [System Notifications](#system-notifications)
- [Rich Media Notifications](#rich-media-notifications)
- [Structured Data Payloads](#structured-data-payloads)

---

## Topic Notifications

### Example 1: Breaking News Alert

```bash
curl -X POST http://localhost:3000/v1/notifications/topic \
  -H "X-API-Key: YOUR_TOPIC_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "breaking_news",
    "title": "⚡ Breaking News",
    "body": "Major earthquake strikes California coast",
    "data": {
      "articleId": "news_12345",
      "category": "emergency",
      "priority": "high",
      "publishedAt": "2025-12-09T23:00:00Z"
    },
    "image": "https://cdn.example.com/news/earthquake.jpg",
    "clickAction": "https://example.com/news/earthquake-alert"
  }'
```

**Response:**

```json
{
  "notificationId": "notif_abc123",
  "fcmResponse": {
    "messageId": "projects/my-app/messages/0:1702164000",
    "success": true
  }
}
```

### Example 2: Sports Score Update

```bash
curl -X POST http://localhost:3000/v1/notifications/topic \
  -H "X-API-Key: YOUR_TOPIC_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "sports_scores",
    "title": "⚽ Match Update",
    "body": "Manchester United 2 - 1 Liverpool (90+3'\'')",
    "data": {
      "matchId": "match_67890",
      "sport": "football",
      "league": "Premier League",
      "homeTeam": "Manchester United",
      "awayTeam": "Liverpool",
      "homeScore": "2",
      "awayScore": "1",
      "status": "fulltime"
    },
    "clickAction": "app://match/67890"
  }'
```

### Example 3: Weather Alert

```bash
curl -X POST http://localhost:3000/v1/notifications/topic \
  -H "X-API-Key: YOUR_TOPIC_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "weather_alerts",
    "title": "🌧️ Heavy Rain Warning",
    "body": "Severe weather expected in your area. Stay indoors.",
    "data": {
      "alertType": "severe_weather",
      "severity": "high",
      "validUntil": "2025-12-10T12:00:00Z",
      "affectedAreas": "[\"San Francisco\",\"Oakland\",\"Berkeley\"]"
    },
    "image": "https://cdn.example.com/weather/rain-warning.jpg"
  }'
```

---

## Personal Notifications

### Example 1: Welcome Message

```bash
curl -X POST http://localhost:3000/v1/notifications/personal \
  -H "X-API-Key: YOUR_PERSONAL_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "userIds": ["user_123e4567-e89b-12d3-a456-426614174000"],
    "title": "👋 Welcome to MyApp!",
    "body": "Thanks for signing up! Explore features and get started.",
    "data": {
      "type": "onboarding",
      "step": "1",
      "action": "show_tutorial"
    },
    "clickAction": "app://onboarding/tutorial"
  }'
```

### Example 2: Friend Request

```bash
curl -X POST http://localhost:3000/v1/notifications/personal \
  -H "X-API-Key: YOUR_PERSONAL_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "userIds": ["user_223e4567-e89b-12d3-a456-426614174001"],
    "title": "🤝 New Friend Request",
    "body": "John Doe wants to connect with you",
    "data": {
      "type": "friend_request",
      "requestId": "req_98765",
      "senderId": "user_john_doe",
      "senderName": "John Doe",
      "senderAvatar": "https://cdn.example.com/avatars/john.jpg"
    },
    "image": "https://cdn.example.com/avatars/john.jpg",
    "clickAction": "app://friends/requests"
  }'
```

### Example 3: Message Notification

```bash
curl -X POST http://localhost:3000/v1/notifications/personal \
  -H "X-API-Key: YOUR_PERSONAL_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "userIds": ["user_323e4567-e89b-12d3-a456-426614174002"],
    "title": "💬 New Message from Sarah",
    "body": "Hey! Are you free for coffee tomorrow?",
    "data": {
      "type": "chat_message",
      "chatId": "chat_456",
      "senderId": "user_sarah_123",
      "senderName": "Sarah Johnson",
      "messageId": "msg_789",
      "timestamp": "2025-12-09T23:15:00Z"
    },
    "clickAction": "app://chat/456"
  }'
```

---

## Transaction Alerts

### Example 1: Payment Received

```bash
curl -X POST http://localhost:3000/v1/notifications/personal \
  -H "X-API-Key: YOUR_PERSONAL_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "userIds": ["user_423e4567-e89b-12d3-a456-426614174003"],
    "title": "💰 Payment Received",
    "body": "You received $150.00 from Emily Chen",
    "data": {
      "type": "payment_received",
      "transactionId": "tx_abc123def456",
      "amount": "150.00",
      "currency": "USD",
      "senderId": "user_emily",
      "senderName": "Emily Chen",
      "timestamp": "2025-12-09T23:20:00Z",
      "status": "completed"
    },
    "clickAction": "app://transactions/tx_abc123def456"
  }'
```

### Example 2: Payment Sent

```bash
curl -X POST http://localhost:3000/v1/notifications/personal \
  -H "X-API-Key: YOUR_PERSONAL_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "userIds": ["user_523e4567-e89b-12d3-a456-426614174004"],
    "title": "💸 Payment Sent",
    "body": "You sent $75.50 to Michael Brown",
    "data": {
      "type": "payment_sent",
      "transactionId": "tx_xyz789ghi012",
      "amount": "75.50",
      "currency": "USD",
      "recipientId": "user_michael",
      "recipientName": "Michael Brown",
      "timestamp": "2025-12-09T23:25:00Z",
      "status": "completed"
    },
    "clickAction": "app://transactions/tx_xyz789ghi012"
  }'
```

### Example 3: Low Balance Warning

```bash
curl -X POST http://localhost:3000/v1/notifications/personal \
  -H "X-API-Key: YOUR_PERSONAL_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "userIds": ["user_623e4567-e89b-12d3-a456-426614174005"],
    "title": "⚠️ Low Balance Alert",
    "body": "Your account balance is below $10.00",
    "data": {
      "type": "low_balance",
      "accountId": "acc_123456",
      "currentBalance": "8.50",
      "currency": "USD",
      "threshold": "10.00",
      "action": "add_funds"
    },
    "clickAction": "app://wallet/add-funds"
  }'
```

### Example 4: Subscription Renewal

```bash
curl -X POST http://localhost:3000/v1/notifications/personal \
  -H "X-API-Key: YOUR_PERSONAL_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "userIds": ["user_723e4567-e89b-12d3-a456-426614174006"],
    "title": "🔄 Subscription Renewed",
    "body": "Your Premium subscription has been renewed for $9.99",
    "data": {
      "type": "subscription_renewal",
      "subscriptionId": "sub_premium_123",
      "planName": "Premium Monthly",
      "amount": "9.99",
      "currency": "USD",
      "nextBillingDate": "2026-01-09",
      "transactionId": "tx_sub_renewal_456"
    },
    "clickAction": "app://subscription/details"
  }'
```

---

## Promotional Messages

### Example 1: Limited Time Offer

```bash
curl -X POST http://localhost:3000/v1/notifications/topic \
  -H "X-API-Key: YOUR_TOPIC_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "promotions",
    "title": "🎉 50% Off Flash Sale!",
    "body": "Limited time offer! Use code FLASH50 at checkout",
    "data": {
      "type": "promotion",
      "promoCode": "FLASH50",
      "discountPercent": "50",
      "validUntil": "2025-12-10T23:59:59Z",
      "category": "all",
      "minPurchase": "0"
    },
    "image": "https://cdn.example.com/promos/flash-sale-banner.jpg",
    "clickAction": "app://shop/flash-sale"
  }'
```

### Example 2: Personalized Recommendation

```bash
curl -X POST http://localhost:3000/v1/notifications/personal \
  -H "X-API-Key: YOUR_PERSONAL_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "userIds": ["user_823e4567-e89b-12d3-a456-426614174007"],
    "title": "✨ We Think You'\''ll Love These",
    "body": "New arrivals based on your style preferences",
    "data": {
      "type": "recommendation",
      "recommendationType": "style_match",
      "productIds": "[\"prod_123\",\"prod_456\",\"prod_789\"]",
      "category": "fashion",
      "confidence": "0.85"
    },
    "image": "https://cdn.example.com/recommendations/style-match.jpg",
    "clickAction": "app://shop/recommendations"
  }'
```

### Example 3: Abandoned Cart Reminder

```bash
curl -X POST http://localhost:3000/v1/notifications/personal \
  -H "X-API-Key: YOUR_PERSONAL_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "userIds": ["user_923e4567-e89b-12d3-a456-426614174008"],
    "title": "🛒 You Left Something Behind",
    "body": "Complete your purchase and get 10% off!",
    "data": {
      "type": "abandoned_cart",
      "cartId": "cart_abc123",
      "itemCount": "3",
      "totalValue": "129.97",
      "currency": "USD",
      "discountCode": "COMEBACK10",
      "discountPercent": "10"
    },
    "image": "https://cdn.example.com/cart-reminder.jpg",
    "clickAction": "app://cart"
  }'
```

---

## System Notifications

### Example 1: App Update Available

```bash
curl -X POST http://localhost:3000/v1/notifications/topic \
  -H "X-API-Key: YOUR_TOPIC_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "app_updates",
    "title": "📱 Update Available",
    "body": "Version 2.5.0 is now available with new features!",
    "data": {
      "type": "app_update",
      "version": "2.5.0",
      "releaseNotes": "Bug fixes and performance improvements",
      "required": "false",
      "downloadUrl": "https://example.com/download"
    },
    "clickAction": "app://update"
  }'
```

### Example 2: Maintenance Notice

```bash
curl -X POST http://localhost:3000/v1/notifications/topic \
  -H "X-API-Key: YOUR_TOPIC_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "system_announcements",
    "title": "🔧 Scheduled Maintenance",
    "body": "App will be down for maintenance on Dec 10, 2AM-4AM PST",
    "data": {
      "type": "maintenance",
      "startTime": "2025-12-10T10:00:00Z",
      "endTime": "2025-12-10T12:00:00Z",
      "affectedServices": "[\"payments\",\"messaging\"]",
      "severity": "medium"
    }
  }'
```

### Example 3: Security Alert

```bash
curl -X POST http://localhost:3000/v1/notifications/personal \
  -H "X-API-Key: YOUR_PERSONAL_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "userIds": ["user_123e4567-e89b-12d3-a456-426614174009"],
    "title": "🔒 New Login Detected",
    "body": "We detected a login from a new device in New York",
    "data": {
      "type": "security_alert",
      "alertType": "new_login",
      "location": "New York, NY",
      "device": "iPhone 15 Pro",
      "ipAddress": "192.168.1.100",
      "timestamp": "2025-12-09T23:30:00Z",
      "action": "review_activity"
    },
    "clickAction": "app://security/activity"
  }'
```

---

## Rich Media Notifications

### Example 1: Video Content

```bash
curl -X POST http://localhost:3000/v1/notifications/personal \
  -H "X-API-Key: YOUR_PERSONAL_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "userIds": ["user_223e4567-e89b-12d3-a456-426614174010"],
    "title": "🎬 New Video from Channel",
    "body": "TechReview just uploaded: iPhone 16 Review",
    "data": {
      "type": "video_upload",
      "videoId": "vid_abc123",
      "channelId": "channel_techreview",
      "channelName": "TechReview",
      "duration": "15:30",
      "thumbnail": "https://cdn.example.com/thumbnails/vid_abc123.jpg",
      "category": "technology"
    },
    "image": "https://cdn.example.com/thumbnails/vid_abc123.jpg",
    "clickAction": "app://video/vid_abc123"
  }'
```

### Example 2: Photo Shared

```bash
curl -X POST http://localhost:3000/v1/notifications/personal \
  -H "X-API-Key: YOUR_PERSONAL_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "userIds": ["user_323e4567-e89b-12d3-a456-426614174011"],
    "title": "📸 New Photo from Alex",
    "body": "Alex shared a photo with you",
    "data": {
      "type": "photo_shared",
      "photoId": "photo_xyz789",
      "sharerId": "user_alex",
      "sharerName": "Alex Martinez",
      "albumId": "album_vacation",
      "timestamp": "2025-12-09T23:35:00Z"
    },
    "image": "https://cdn.example.com/photos/photo_xyz789_thumb.jpg",
    "clickAction": "app://photos/photo_xyz789"
  }'
```

---

## Structured Data Payloads

### Example 1: E-commerce Order Update

```bash
curl -X POST http://localhost:3000/v1/notifications/personal \
  -H "X-API-Key: YOUR_PERSONAL_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "userIds": ["user_423e4567-e89b-12d3-a456-426614174012"],
    "title": "📦 Your Order Has Shipped!",
    "body": "Order #12345 is on its way",
    "data": {
      "type": "order_update",
      "orderId": "order_12345",
      "status": "shipped",
      "trackingNumber": "1Z999AA10123456784",
      "carrier": "UPS",
      "estimatedDelivery": "2025-12-12",
      "items": "[{\"name\":\"Laptop\",\"quantity\":1,\"price\":\"999.99\"}]",
      "totalAmount": "999.99",
      "currency": "USD"
    },
    "clickAction": "app://orders/order_12345/track"
  }'
```

### Example 2: Delivery Status

```bash
curl -X POST http://localhost:3000/v1/notifications/personal \
  -H "X-API-Key: YOUR_PERSONAL_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "userIds": ["user_523e4567-e89b-12d3-a456-426614174013"],
    "title": "🚚 Driver Nearby",
    "body": "Your food delivery will arrive in 5 minutes",
    "data": {
      "type": "delivery_status",
      "deliveryId": "del_xyz456",
      "status": "nearby",
      "driverName": "John Driver",
      "driverPhone": "+1234567890",
      "driverLocation": "{\"lat\":37.7749,\"lng\":-122.4194}",
      "estimatedArrival": "2025-12-09T23:50:00Z",
      "orderTotal": "45.99"
    },
    "clickAction": "app://delivery/del_xyz456/track"
  }'
```

### Example 3: Booking Confirmation

```bash
curl -X POST http://localhost:3000/v1/notifications/personal \
  -H "X-API-Key: YOUR_PERSONAL_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "userIds": ["user_623e4567-e89b-12d3-a456-426614174014"],
    "title": "✅ Booking Confirmed",
    "body": "Your reservation at Grand Hotel is confirmed",
    "data": {
      "type": "booking_confirmation",
      "bookingId": "book_abc789",
      "hotelName": "Grand Hotel",
      "checkIn": "2025-12-20",
      "checkOut": "2025-12-25",
      "roomType": "Deluxe Suite",
      "guests": "2",
      "totalPrice": "1500.00",
      "currency": "USD",
      "confirmationCode": "GH2025ABC"
    },
    "image": "https://cdn.example.com/hotels/grand-hotel.jpg",
    "clickAction": "app://bookings/book_abc789"
  }'
```

---

## Multi-User Notifications

### Example: Group Activity

```bash
curl -X POST http://localhost:3000/v1/notifications/personal \
  -H "X-API-Key: YOUR_PERSONAL_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "userIds": [
      "user_723e4567-e89b-12d3-a456-426614174015",
      "user_823e4567-e89b-12d3-a456-426614174016",
      "user_923e4567-e89b-12d3-a456-426614174017"
    ],
    "title": "👥 New Group Activity",
    "body": "Sarah added 3 photos to Vacation 2025 album",
    "data": {
      "type": "group_activity",
      "groupId": "group_vacation2025",
      "activityType": "photos_added",
      "actorId": "user_sarah",
      "actorName": "Sarah Johnson",
      "itemCount": "3",
      "timestamp": "2025-12-09T23:55:00Z"
    },
    "clickAction": "app://groups/group_vacation2025"
  }'
```

---

## Silent Data Notifications

### Example: Background Sync

```bash
curl -X POST http://localhost:3000/v1/notifications/personal \
  -H "X-API-Key: YOUR_PERSONAL_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "userIds": ["user_123e4567-e89b-12d3-a456-426614174018"],
    "title": "",
    "body": "",
    "data": {
      "type": "background_sync",
      "syncType": "messages",
      "lastSyncTimestamp": "2025-12-09T23:00:00Z",
      "itemsToSync": "5",
      "silent": "true"
    }
  }'
```

Note: Silent notifications don't display to the user but trigger background processing in the app.

---

## Best Practices

### 1. Keep Titles Short

- ✅ "Payment Received"
- ❌ "Congratulations! You have successfully received a payment from..."

### 2. Actionable Body Text

- ✅ "You received $50.00 from John. Tap to view details."
- ❌ "A transaction has occurred."

### 3. Use Emojis Sparingly

- ✅ "💰 Payment Received"
- ❌ "💰💸🤑 Money Money Money!!!"

### 4. Include Relevant Data

Always include IDs and context in the `data` field for deep linking.

### 5. Respect Notification Frequency

Don't spam users - batch updates when possible.

### 6. Test Across Platforms

iOS and Android handle notifications differently - test both!

---

## Testing Tips

```bash
# Test with curl
curl -X POST http://localhost:3000/v1/notifications/personal \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d @test-notification.json

# Test topic subscription (client-side)
# Android
FirebaseMessaging.getInstance().subscribeToTopic("test_topic")

# iOS
Messaging.messaging().subscribe(toTopic: "test_topic")
```

---

## Troubleshooting

### Notification Not Received?

1. Check device token is registered
2. Verify user has granted notification permissions
3. Check Firebase Console for delivery status
4. Review app logs for errors
5. Ensure device is online

### Data Not Appearing?

- Verify JSON structure in `data` field
- Check app code handles custom data properly
- Use string values (FCM requirement)

---

## Additional Resources

- [FCM Message Format](https://firebase.google.com/docs/cloud-messaging/concept-options)
- [iOS Notification Guidelines](https://developer.apple.com/design/human-interface-guidelines/notifications)
- [Android Notification Guidelines](https://developer.android.com/develop/ui/views/notifications)
