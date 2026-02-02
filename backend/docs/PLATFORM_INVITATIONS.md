# Platform Invitation System

This guide explains how to send platform invitations to new users using the Bayit+ mailing system.

## Overview

The platform invitation system allows you to invite new users to Bayit+ with:
- Personalized invitation emails
- Optional personal messages
- Inviter name attribution
- Professional HTML email templates
- Bayit+ branding and feature highlights

## Methods

### 1. Command Line Script

Send invitations directly from the command line:

```bash
# Basic invitation
poetry run python scripts/send_platform_invitation.py user@example.com

# With inviter name
poetry run python scripts/send_platform_invitation.py user@example.com --inviter "John Doe"

# With personal message
poetry run python scripts/send_platform_invitation.py user@example.com \
  --inviter "John Doe" \
  --message "I think you'll love the Israeli content on Bayit+!"

# Complete example
poetry run python scripts/send_platform_invitation.py sarah@example.com \
  --inviter "David Cohen" \
  --message "Looking forward to watching Israeli shows together!"
```

**Script Location**: `backend/scripts/send_platform_invitation.py`

### 2. Admin API Endpoint

Send invitations via the admin API:

**Endpoint**: `POST /api/v1/admin/marketing/invitations/send`

**Authentication**: Requires admin user with `MARKETING_SEND` permission

**Request Body**:
```json
{
  "email": "user@example.com",
  "inviter_name": "John Doe",
  "personal_message": "I think you'll love the content!"
}
```

**Response (Success)**:
```json
{
  "success": true,
  "message": "Invitation sent successfully to user@example.com",
  "email": "user@example.com"
}
```

**Response (Email Service Not Configured)**:
```json
{
  "success": false,
  "message": "Email service not configured - invitation logged only",
  "email": "user@example.com",
  "note": "Configure SENDGRID_API_KEY to send emails"
}
```

**cURL Example**:
```bash
curl -X POST http://localhost:8000/api/v1/admin/marketing/invitations/send \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "inviter_name": "John Doe",
    "personal_message": "Looking forward to watching together!"
  }'
```

### 3. Programmatic Usage

Use the email service directly in your code:

```python
from app.services.email_service import send_platform_invitation

# Basic invitation
await send_platform_invitation(
    to_email="user@example.com"
)

# With inviter name
await send_platform_invitation(
    to_email="user@example.com",
    inviter_name="John Doe"
)

# Complete invitation
success = await send_platform_invitation(
    to_email="user@example.com",
    inviter_name="John Doe",
    personal_message="I think you'll love the Israeli content!"
)

if success:
    print("Invitation sent successfully")
else:
    print("Email service not configured")
```

## Email Template

The invitation email includes:

### Header
- Bayit+ branding
- "Welcome to Bayit+" headline
- "Premium Jewish Streaming Platform" tagline

### Main Content
- Personalized greeting (with optional inviter name)
- Platform introduction
- Optional personal message from inviter
- Clear call-to-action button ("Join Bayit+ Today")

### Features Section
Highlights five main content categories:
- 📺 Live Israeli TV (with AI dubbing)
- 🎬 Movies & Series
- 📻 24/7 Israeli Radio
- 🎙️ Podcasts
- 📚 Audiobooks

### AI Features
- Smart content recommendations
- AI-powered search
- Real-time dubbing and translation
- Personalized experience

### Footer
- Support contact information
- Copyright notice
- Privacy note

## Email Service Configuration

The invitation system uses the centralized email service (`backend/app/services/email_service.py`).

### SendGrid Setup (Required for Sending Emails)

1. **Get SendGrid API Key**:
   - Sign up at https://sendgrid.com
   - Create an API key with "Mail Send" permissions

2. **Add to Google Cloud Secret Manager**:
   ```bash
   # Add SendGrid API key
   gcloud secrets create SENDGRID_API_KEY \
     --data-file=- <<< "SG.your_api_key_here"

   # Add sender email
   gcloud secrets create SENDGRID_FROM_EMAIL \
     --data-file=- <<< "noreply@bayitplus.com"
   ```

3. **Regenerate .env from GCloud**:
   ```bash
   ./scripts/sync-gcloud-secrets.sh
   ```

4. **Restart backend**:
   ```bash
   cd backend
   poetry run uvicorn app.main:app --reload
   ```

### Development Mode (Without SendGrid)

If `SENDGRID_API_KEY` is not configured, the system will:
- Log the invitation details to console
- Return success=false with configuration note
- Not send actual emails (useful for testing)

## Email Deliverability

### Best Practices

1. **Sender Authentication**:
   - Configure SPF, DKIM, and DMARC for your domain
   - Use verified sender email in SendGrid

2. **Content**:
   - Avoid spam trigger words
   - Include unsubscribe link (future feature)
   - Use professional HTML templates

3. **Recipient Lists**:
   - Only send to opted-in users
   - Maintain clean email lists
   - Monitor bounce rates

### Monitoring

Check SendGrid dashboard for:
- Delivery rates
- Open rates
- Bounce rates
- Spam reports

## Customization

To customize the invitation template, edit:
- `backend/app/services/email_service.py`
- Function: `send_platform_invitation()`
- Modify the `html_content` variable

### Template Variables

Available variables in the template:
- `{platform_url}` - Bayit+ platform URL (from settings.PLATFORM_URL)
- `{signup_url}` - Sign-up page URL
- `{greeting}` - Personalized greeting with inviter name
- `{personal_section}` - Optional personal message section

## Rate Limiting

**Important**: Consider implementing rate limiting for invitation sending to prevent abuse:

```python
# Future enhancement
from app.services.olorin.rate_limiter import RateLimiter

rate_limiter = RateLimiter(
    max_requests=10,  # Max 10 invitations
    window_seconds=3600  # Per hour
)
```

## Tracking and Analytics

**Future Enhancement**: Track invitation metrics:
- Invitations sent
- Emails opened
- Sign-ups from invitations
- Conversion rates

## Bulk Invitations

For sending invitations to multiple users, use the email campaign system:

```bash
# Create email campaign via admin API
POST /api/v1/admin/marketing/emails

# Or use the marketing dashboard
# (future feature)
```

## Security Considerations

1. **Admin Only**: Invitation sending requires `MARKETING_SEND` permission
2. **Email Validation**: Validate email format before sending
3. **Rate Limiting**: Prevent spam by limiting invitations per user
4. **Audit Logging**: Log all invitation sends for accountability

## Troubleshooting

### Email Not Sending

**Check**:
1. Is `SENDGRID_API_KEY` configured in .env?
2. Is the API key valid and has Mail Send permissions?
3. Is the sender email verified in SendGrid?
4. Check backend logs for error messages

**Logs**:
```bash
# Check logs
tail -f logs/backend.log | grep "invitation"

# Or check console output when running server
```

### Email Going to Spam

**Solutions**:
1. Configure domain authentication (SPF, DKIM, DMARC)
2. Use verified sender domain
3. Warm up your sending domain
4. Check email content for spam triggers
5. Monitor SendGrid reputation dashboard

### Template Not Rendering

**Check**:
1. HTML syntax is valid
2. Inline CSS is used (email clients don't support external CSS)
3. Images use absolute URLs
4. Test in multiple email clients

## Examples

### Example 1: Simple Invitation
```bash
poetry run python scripts/send_platform_invitation.py sarah@example.com
```

**Email Subject**: "You're Invited to Bayit+ - Premium Jewish Streaming"

**Email Content**:
- Standard greeting: "You're invited to join Bayit+!"
- Platform introduction
- Feature highlights
- Sign-up button

### Example 2: Personalized Invitation
```bash
poetry run python scripts/send_platform_invitation.py sarah@example.com \
  --inviter "David Cohen" \
  --message "I've been using Bayit+ for Israeli news and shows. I think you'll love it too!"
```

**Email Subject**: "You're Invited to Bayit+ - Premium Jewish Streaming"

**Email Content**:
- Personalized greeting: "David Cohen invites you to join Bayit+!"
- Personal message box with David's message
- Platform introduction
- Feature highlights
- Sign-up button

### Example 3: Bulk Invitations
```python
# Python script for bulk invitations
from app.services.email_service import send_platform_invitation

invitees = [
    {"email": "user1@example.com", "name": "Sarah"},
    {"email": "user2@example.com", "name": "Michael"},
    {"email": "user3@example.com", "name": "Rachel"},
]

for invitee in invitees:
    await send_platform_invitation(
        to_email=invitee["email"],
        inviter_name="Community Manager",
        personal_message=f"Hi {invitee['name']}, join our growing community!"
    )
```

## API Integration Example

### Frontend Integration

```typescript
// React component for sending invitations
const sendInvitation = async (email: string, message: string) => {
  const response = await fetch('/api/v1/admin/marketing/invitations/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      email,
      inviter_name: currentUser.name,
      personal_message: message,
    }),
  });

  const result = await response.json();

  if (result.success) {
    toast.success(`Invitation sent to ${email}`);
  } else {
    toast.warning(result.message);
  }
};
```

## Related Documentation

- [Email Service](../app/services/email_service.py) - Core email sending service
- [Marketing API](../app/api/routes/admin/marketing.py) - Admin marketing endpoints
- [Secrets Management](../docs/deployment/SECRETS_MANAGEMENT.md) - GCloud secrets configuration

## Support

For issues or questions:
- Email: dev@bayitplus.com
- Documentation: `/docs/`
- Logs: `backend/logs/backend.log`
