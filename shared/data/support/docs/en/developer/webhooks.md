# Webhooks

Bayit+ webhooks deliver real-time notifications when events occur on the platform. Use webhooks to keep your systems synchronized without polling the API.

## Webhook Setup

Configure webhooks in the developer portal:

1. Navigate to **Settings** > **Webhooks**
2. Click **Add Endpoint**
3. Enter your endpoint URL (HTTPS required)
4. Select events to subscribe to
5. Save and note your signing secret

## Event Types

| Event | Description |
|-------|-------------|
| `user.created` | New user registration |
| `user.subscription.changed` | Subscription status update |
| `content.published` | New content available |
| `content.updated` | Content metadata changed |
| `playback.started` | Stream session initiated |
| `playback.completed` | Content fully watched |

## Payload Format

All webhook payloads follow this structure:

```json
{
  "id": "evt_abc123",
  "type": "user.subscription.changed",
  "created_at": "2024-01-15T10:30:00Z",
  "data": {
    "user_id": "usr_xyz789",
    "old_plan": "basic",
    "new_plan": "premium",
    "effective_at": "2024-01-15T10:30:00Z"
  }
}
```

## Signature Verification

Verify webhook authenticity using the signature header:

```
X-Bayit-Signature: sha256=abc123...
```

**Verification Process**:

```python
import hmac
import hashlib

def verify_signature(payload, signature, secret):
    expected = hmac.new(
        secret.encode(),
        payload.encode(),
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(f"sha256={expected}", signature)
```

Always verify signatures before processing webhook data.

## Retry Policy

Failed deliveries are retried with exponential backoff:

| Attempt | Delay |
|---------|-------|
| 1 | Immediate |
| 2 | 1 minute |
| 3 | 5 minutes |
| 4 | 30 minutes |
| 5 | 2 hours |

After 5 failed attempts, the webhook is marked as failed.

## Responding to Webhooks

Your endpoint must return a `2xx` status code within 30 seconds. Return `200 OK` with an empty body or acknowledgment JSON.

## Event Replay

Replay missed events from the developer portal:

1. Go to **Webhooks** > **Event Log**
2. Filter by date range and event type
3. Select events to replay
4. Click **Resend Selected**

## Testing Webhooks

Use the test feature to verify your endpoint:

1. Select an event type
2. Click **Send Test Event**
3. Review the delivery status and response

Test events include a `test: true` flag in the payload.
