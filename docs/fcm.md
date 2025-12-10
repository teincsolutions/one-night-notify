# Firebase Cloud Messaging (FCM) Configuration Guide

This guide explains how to configure Firebase Cloud Messaging for the Notifications Microservice.

## Prerequisites

- Google Cloud Platform account
- Firebase project (or create a new one)
- Admin access to Firebase Console

---

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **Add Project** or select existing project
3. Enter project name (e.g., "My App Notifications")
4. Enable Google Analytics (optional)
5. Click **Create Project**

---

## Step 2: Generate Service Account Key

### Navigate to Service Accounts

1. In Firebase Console, click the **gear icon** → **Project Settings**
2. Go to **Service Accounts** tab
3. Click **Generate New Private Key**
4. Confirm by clicking **Generate Key**
5. Save the downloaded JSON file securely

### Service Account JSON Structure

```json
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "key-id-here",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com",
  "client_id": "1234567890",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/..."
}
```

### Add to Environment Variables

1. **Option 1: Single-line JSON (Recommended for .env)**

   ```bash
   FIREBASE_SERVICE_ACCOUNT_JSON='{"type":"service_account","project_id":"...","private_key":"...","client_email":"..."}'
   ```

2. **Option 2: Environment-specific file**
   - Save JSON to `config/firebase-service-account.json`
   - Add to `.gitignore`
   - Load in code:
   ```typescript
   const serviceAccount = require('../config/firebase-service-account.json');
   ```

---

## Step 3: Register Your Apps with Firebase

### For Android App

1. In Firebase Console → **Project Overview**
2. Click **Add App** → **Android**
3. Enter Android package name (e.g., `com.myapp.notifications`)
4. Download `google-services.json`
5. Place in your Android app's `app/` directory
6. Follow Firebase setup instructions for Android

### For iOS App

1. In Firebase Console → **Project Overview**
2. Click **Add App** → **iOS**
3. Enter iOS bundle ID (e.g., `com.myapp.notifications`)
4. Download `GoogleService-Info.plist`
5. Add to your Xcode project
6. Follow Firebase setup instructions for iOS

---

## Step 4: Enable FCM API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your Firebase project
3. Navigate to **APIs & Services** → **Library**
4. Search for **Firebase Cloud Messaging API**
5. Click **Enable**

---

## Step 5: Configure Topic Messaging (Optional)

### What are Topics?

Topics allow you to send messages to multiple devices that have subscribed to a specific topic. No need to manage individual device tokens.

### Subscribe Devices to Topics

#### Android Example

```kotlin
FirebaseMessaging.getInstance().subscribeToTopic("news")
    .addOnCompleteListener { task ->
        if (task.isSuccessful) {
            Log.d(TAG, "Subscribed to news topic")
        }
    }
```

#### iOS Example

```swift
Messaging.messaging().subscribe(toTopic: "news") { error in
    if let error = error {
        print("Error subscribing to topic: \(error)")
    } else {
        print("Subscribed to news topic")
    }
}
```

### Topic Naming Rules

- Can only contain letters, numbers, hyphens, and underscores
- Maximum 1.5 million subscriptions per topic
- Examples: `news`, `sports`, `user_123`, `promo-alerts`

---

## Step 6: Handling APNs for iOS (Apple Push Notification)

### Upload APNs Authentication Key

1. In Firebase Console → **Project Settings** → **Cloud Messaging**
2. Under **Apple app configuration**, click **Upload**
3. Upload your APNs Authentication Key (.p8 file)
4. Enter:
   - **Key ID**: From Apple Developer Portal
   - **Team ID**: Your Apple Developer Team ID

### How to Get APNs Key from Apple

1. Go to [Apple Developer Portal](https://developer.apple.com/account/)
2. Navigate to **Certificates, Identifiers & Profiles**
3. Go to **Keys** section
4. Click **+** to create a new key
5. Enable **Apple Push Notifications service (APNs)**
6. Download the `.p8` file (you can only download once!)
7. Note the **Key ID**

---

## Step 7: Test FCM Configuration

### Using Firebase Console

1. Go to Firebase Console → **Cloud Messaging**
2. Click **Send your first message**
3. Enter notification title and text
4. Click **Send test message**
5. Enter your device's FCM token
6. Click **Test**

### Using this Microservice

Once configured, test with:

```bash
# Register a test device
curl -X POST http://localhost:3000/v1/devices/register \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "fcmToken": "YOUR_DEVICE_TOKEN",
    "platform": "android",
    "userId": "test-user-123"
  }'

# Send test notification
curl -X POST http://localhost:3000/v1/notifications/personal \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "userIds": ["test-user-123"],
    "title": "Test Notification",
    "body": "If you see this, FCM is working!"
  }'
```

---

## Handling Invalid Tokens

### Why Tokens Become Invalid

- User uninstalled the app
- User cleared app data
- User opted out of notifications
- Token expired (rare, but possible)
- App was updated and token refreshed

### Automatic Cleanup

This microservice automatically detects invalid tokens from FCM responses and removes them from the database:

```typescript
// In notification.processor.ts
private async markInvalidTokens(tokens: string[]): Promise<void> {
  await this.prisma.device.deleteMany({
    where: {
      fcmToken: { in: tokens },
    },
  });
}
```

### Client-Side Token Refresh

**Android:**

```kotlin
class MyFirebaseMessagingService : FirebaseMessagingService() {
    override fun onNewToken(token: String) {
        // Send new token to your server
        sendTokenToServer(token)
    }
}
```

**iOS:**

```swift
func messaging(_ messaging: Messaging, didReceiveRegistrationToken fcmToken: String?) {
    // Send new token to your server
    sendTokenToServer(fcmToken)
}
```

---

## FCM Quotas and Limits

### Message Size Limits

- **Notification payload**: 2 KB
- **Data payload**: 4 KB (combined with notification)
- **Total message size**: 4 KB

### Rate Limits

- **Fan-out rate**: 1 million messages per second
- **Topic fan-out**: 1.5 million devices per topic
- **Batch size**: 500 tokens per `sendEach()` call (already implemented)

### Best Practices

1. **Keep payloads small**: < 1 KB recommended
2. **Use data messages** for silent updates
3. **Batch requests**: Already chunked to 500 tokens
4. **Handle errors**: Retry with exponential backoff
5. **Clean up tokens**: Remove invalid tokens promptly

---

## Security Best Practices

### Protect Service Account JSON

- **Never commit** service account JSON to version control
- Use environment variables or secret management
- Rotate keys periodically (every 90 days recommended)
- Restrict service account permissions to FCM only

### API Key Security

- Use separate API keys for topic vs personal notifications
- Implement rate limiting (already configured)
- Monitor for suspicious activity
- Rotate API keys regularly

---

## Troubleshooting

### Error: "Requested entity was not found"

**Cause**: Invalid project ID or service account

**Solution**:

- Verify project ID in service account JSON matches Firebase project
- Ensure FCM API is enabled in Google Cloud Console

### Error: "Invalid APNs credentials"

**Cause**: Wrong or missing APNs key for iOS

**Solution**:

- Re-upload APNs .p8 file in Firebase Console
- Verify Key ID and Team ID are correct

### Error: "The registration token is not a valid FCM registration token"

**Cause**: Malformed or invalid token

**Solution**:

- Verify token from device is complete
- Ensure token hasn't been corrupted during transmission
- Check device has Google Play Services (Android)

### Error: "Requested entity was not found" for topic

**Cause**: Topic doesn't exist or has no subscribers

**Solution**:

- Ensure at least one device is subscribed to topic
- Topic names are case-sensitive

### Messages not delivered to iOS

**Checklist**:

- ✅ APNs certificate/key uploaded in Firebase
- ✅ App has notification permissions
- ✅ Device is online
- ✅ Bundle ID matches Firebase configuration
- ✅ App is in foreground/background (different handling)

---

## FCM Message Types

### 1. Notification Message

Displays system notification automatically:

```json
{
  "topic": "news",
  "notification": {
    "title": "Breaking News",
    "body": "Important update",
    "imageUrl": "https://example.com/image.jpg"
  }
}
```

### 2. Data Message

Silent message, handled by app:

```json
{
  "token": "device-token",
  "data": {
    "type": "sync",
    "timestamp": "1234567890"
  }
}
```

### 3. Combined Message

Both notification and data:

```json
{
  "token": "device-token",
  "notification": {
    "title": "New Message",
    "body": "You have a new message"
  },
  "data": {
    "chatId": "12345",
    "senderId": "user-456"
  }
}
```

---

## Platform-Specific Configurations

### Android Notification Channels

Create notification channels for Android 8.0+:

```kotlin
val channel = NotificationChannel(
    "important_updates",
    "Important Updates",
    NotificationManager.IMPORTANCE_HIGH
).apply {
    description = "Critical notifications"
}
```

### iOS Notification Categories

Define categories for iOS actions:

```swift
let acceptAction = UNNotificationAction(
    identifier: "ACCEPT_ACTION",
    title: "Accept",
    options: [.foreground]
)
```

---

## Monitoring FCM

### Firebase Console Metrics

1. Go to Firebase Console → **Cloud Messaging**
2. View:
   - Messages sent
   - Delivery success rate
   - Opened rate (if analytics enabled)

### Application Logs

Monitor in your microservice logs:

```bash
# Success
✅ Firebase initialized successfully
[MOCK] Would send to 3 tokens: Payment Received

# Errors
❌ FCM Topic Message Error: {...}
```

---

## Migration from Legacy FCM

If migrating from legacy FCM HTTP v1 API:

### Changes Required

1. **Service Account**: Use Firebase Admin SDK (already implemented)
2. **Token Format**: Same format, no changes needed
3. **Topic Messages**: Use `send()` instead of `sendToTopic()` (already updated)
4. **Multicast**: Use `sendEach()` instead of `sendMulticast()` (already implemented)

---

## Resources

- [Firebase Documentation](https://firebase.google.com/docs/cloud-messaging)
- [FCM Server Protocol](https://firebase.google.com/docs/cloud-messaging/server)
- [Admin SDK Setup](https://firebase.google.com/docs/admin/setup)
- [APNs Setup Guide](https://firebase.google.com/docs/cloud-messaging/ios/client)
- [Android Setup Guide](https://firebase.google.com/docs/cloud-messaging/android/client)
