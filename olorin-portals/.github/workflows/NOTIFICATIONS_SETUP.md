# Deployment Notifications Setup

This guide explains how to configure deployment notifications for the Olorin Portals CI/CD pipeline.

## Overview

The notification system sends alerts for:
- ✅ **Successful deployments** - Confirmation that portal is live
- ❌ **Failed deployments** - Immediate alert when deployment or smoke tests fail
- 🔄 **Rollbacks** - Notification when automatic or manual rollback occurs
- ⚠️ **CI failures** - Alert when continuous integration pipeline fails

## Notification Channels

### 1. Slack (Recommended)

Slack notifications provide rich formatting with action buttons, color coding, and detailed information.

#### Setup Steps:

1. **Create Incoming Webhook in Slack**:
   - Go to https://api.slack.com/apps
   - Create a new app or select existing app
   - Go to "Incoming Webhooks" and activate
   - Click "Add New Webhook to Workspace"
   - Select the channel (e.g., `#deployments`, `#ci-cd`, `#alerts`)
   - Copy the Webhook URL

2. **Add Secret to GitHub**:
   - Go to repository Settings → Secrets and variables → Actions
   - Click "New repository secret"
   - Name: `SLACK_WEBHOOK_URL`
   - Value: Paste the webhook URL from Slack
   - Click "Add secret"

3. **Test the Integration**:
   ```bash
   # From local terminal (with SLACK_WEBHOOK_URL set)
   export SLACK_WEBHOOK_URL="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
   bash scripts/notify.sh deployment portal-station success "Test notification"
   ```

#### Message Format:

Slack messages include:
- Color-coded status (green/red/yellow)
- Portal name and status
- Triggered by (GitHub actor)
- Timestamp
- Details/reason
- Action buttons (View Portal, View Workflow)

### 2. Email Notifications

Email notifications can be sent via any email service provider.

#### Setup Steps:

1. **Choose Email Service**:
   - **SendGrid**: https://sendgrid.com/
   - **AWS SES**: https://aws.amazon.com/ses/
   - **Mailgun**: https://www.mailgun.com/
   - **Postmark**: https://postmarkapp.com/

2. **Configure Email Service**:
   - Create account with chosen provider
   - Get API key or SMTP credentials
   - Note the API endpoint URL

3. **Add Secrets to GitHub**:
   ```
   EMAIL_RECIPIENT    - Email address to receive notifications
   EMAIL_SERVICE_URL  - API endpoint for email service
   EMAIL_API_KEY      - API key for authentication
   ```

4. **Update Notification Script** (if needed):
   - Edit `scripts/notify.sh`
   - Uncomment and configure email service integration
   - Update API call format for your provider

#### Example (SendGrid):

```bash
# In scripts/notify.sh, uncomment and modify:
curl -X POST "https://api.sendgrid.com/v3/mail/send" \
  -H "Authorization: Bearer $EMAIL_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"personalizations\": [{\"to\": [{\"email\": \"$EMAIL_RECIPIENT\"}]}],
    \"from\": {\"email\": \"noreply@olorin.ai\"},
    \"subject\": \"$EMAIL_SUBJECT\",
    \"content\": [{\"type\": \"text/plain\", \"value\": \"$EMAIL_BODY\"}]
  }"
```

### 3. GitHub Deployment Status

GitHub deployment status creates deployment records in the repository.

#### Setup Steps:

1. **Generate Personal Access Token**:
   - Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
   - Generate new token with `repo:status` scope
   - Copy the token

2. **Add Secret to GitHub**:
   - Name: `GITHUB_TOKEN`
   - Value: Personal access token
   - Note: GitHub Actions already provides `GITHUB_TOKEN` by default

3. **Enable Deployment Tracking**:
   - Deployment statuses appear in repository Deployments tab
   - Can view deployment history and status

### 4. Console Output (Always Enabled)

Console notifications always run and appear in GitHub Actions workflow logs:
- Event type (deployment/rollback/ci-failure)
- Portal name and status
- Triggered by and timestamp
- Portal URL and workflow URL
- Details/reason

## Configuration

### Required Secrets

Add these secrets in GitHub repository settings (Settings → Secrets and variables → Actions):

| Secret Name | Description | Required | Example |
|-------------|-------------|----------|---------|
| `SLACK_WEBHOOK_URL` | Slack incoming webhook URL | No | `https://hooks.slack.com/services/...` |
| `EMAIL_RECIPIENT` | Email address for notifications | No | `devops@olorin.ai` |
| `EMAIL_SERVICE_URL` | Email service API endpoint | No | `https://api.sendgrid.com/v3/mail/send` |
| `EMAIL_API_KEY` | Email service API key | No | `SG.xxxxx` |
| `GITHUB_TOKEN` | GitHub API token (auto-provided) | No | Auto-generated |

### Optional Configuration

You can customize notifications by editing `scripts/notify.sh`:
- Change message formatting
- Add custom fields
- Integrate additional services (PagerDuty, Discord, Teams, etc.)
- Modify color coding or emoji

## Testing Notifications

### Test Locally

```bash
# Export secrets (for local testing only)
export SLACK_WEBHOOK_URL="https://hooks.slack.com/services/YOUR/WEBHOOK"
export EMAIL_RECIPIENT="your-email@example.com"

# Test success notification
bash scripts/notify.sh deployment portal-station success "Test successful deployment"

# Test failure notification
bash scripts/notify.sh deployment portal-station failure "Test deployment failure"

# Test rollback notification
bash scripts/notify.sh rollback portal-station warning "Test rollback trigger"

# Test CI failure
bash scripts/notify.sh ci-failure portal-main failure "Test CI failure alert"
```

### Test in GitHub Actions

1. **Trigger Manual Workflow**:
   - Go to Actions → Deploy Olorin Portals
   - Click "Run workflow"
   - Select branch and portal
   - Monitor notifications

2. **Create Test PR**:
   - Create feature branch with small change
   - Open pull request
   - CI notifications should trigger

3. **Manual Rollback Test**:
   - Go to Actions → Rollback Deployment
   - Click "Run workflow"
   - Select portal and reason
   - Check for rollback notification

## Notification Examples

### Successful Deployment

```
✅ Deployment Successful

Station-AI Portal has been successfully deployed to production.

Portal: Station-AI Portal
Status: success
Triggered by: alice
Timestamp: 2026-01-22 10:30:45 UTC

Details: Deployment completed successfully. All smoke tests passed.

Links:
- Portal: https://marketing.station.olorin.ai
- Workflow: https://github.com/olorin/olorin-portals/actions/runs/12345
```

### Failed Deployment

```
❌ Deployment Failed

Station-AI Portal deployment failed. Automatic rollback may have been triggered.

Portal: Station-AI Portal
Status: failure
Triggered by: bob
Timestamp: 2026-01-22 10:35:12 UTC

Details: Deployment or smoke tests failed. Check workflow logs for details.

Links:
- Portal: https://marketing.station.olorin.ai
- Workflow: https://github.com/olorin/olorin-portals/actions/runs/12346
```

### Rollback Notification

```
⚠️ Rollback Executed

Station-AI Portal has been rolled back to the previous version.

Portal: Station-AI Portal
Status: warning
Triggered by: system
Timestamp: 2026-01-22 10:40:00 UTC

Details: Rollback completed successfully. Previous version restored.
Reason: Automated rollback: Deployment or smoke tests failed (Run: 12346)

Links:
- Portal: https://marketing.station.olorin.ai
- Workflow: https://github.com/olorin/olorin-portals/actions/runs/12347
```

## Troubleshooting

### Notifications Not Sending

1. **Check Secrets Configuration**:
   - Verify secrets are set in repository settings
   - Ensure secret names match exactly (case-sensitive)
   - Check that webhook URLs are valid

2. **Review Workflow Logs**:
   - Check GitHub Actions logs for error messages
   - Look for "Sending Slack notification..." logs
   - Verify notification script executed

3. **Test Webhook Manually**:
   ```bash
   curl -X POST "YOUR_WEBHOOK_URL" \
     -H "Content-Type: application/json" \
     -d '{"text":"Test message"}'
   ```

4. **Verify Permissions**:
   - Slack: Check app has permission to post to channel
   - Email: Verify API key has send permissions
   - GitHub: Ensure token has `repo:status` scope

### Slack Messages Not Formatted

- Check that `Content-Type: application/json` header is set
- Verify JSON payload is valid (use online JSON validator)
- Ensure webhook URL is for correct workspace

### Email Not Delivering

- Check spam/junk folder
- Verify email service credentials are correct
- Check email service dashboard for delivery logs
- Ensure recipient email is valid

## Best Practices

1. **Set Up Multiple Channels**: Use Slack for immediate alerts and email for record-keeping
2. **Configure Separate Channels**: Use different Slack channels for deployments vs CI failures
3. **Test Regularly**: Periodically test notifications to ensure they're working
4. **Monitor Notification Logs**: Review GitHub Actions logs to catch issues early
5. **Keep Secrets Secure**: Never commit webhook URLs or API keys to repository
6. **Document Changes**: Update this file when modifying notification system

## Support

For issues or questions:
- Check GitHub Actions workflow logs
- Review notification script: `scripts/notify.sh`
- Consult service provider documentation (Slack, SendGrid, etc.)
- Contact DevOps team

## Related Files

- `scripts/notify.sh` - Main notification script
- `.github/workflows/deploy-portals.yml` - Deployment workflow with notifications
- `.github/workflows/rollback-deployment.yml` - Rollback workflow with notifications
- `.github/workflows/ci.yml` - CI workflow with notifications
