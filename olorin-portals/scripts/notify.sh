#!/bin/bash

###############################################################################
# Deployment Notification Script
#
# Sends notifications to configured channels (Slack, email, GitHub)
# when deployments succeed, fail, or rollback.
#
# Usage:
#   ./notify.sh <event> <portal> <status> [details]
#
# Events: deployment, rollback, ci-failure
# Status: success, failure, warning
#
# Environment Variables:
#   SLACK_WEBHOOK_URL   - Slack incoming webhook URL
#   EMAIL_RECIPIENT     - Email address to notify
#   GITHUB_TOKEN        - GitHub API token for comments
###############################################################################

EVENT="$1"
PORTAL="$2"
STATUS="$3"
DETAILS="${4:-No additional details provided}"

# Configuration
TIMESTAMP=$(date -u +"%Y-%m-%d %H:%M:%S UTC")
GITHUB_REPO="${GITHUB_REPOSITORY:-olorin/olorin-portals}"
GITHUB_RUN_URL="${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}"
GITHUB_ACTOR="${GITHUB_ACTOR:-system}"

# Color codes for status
case "$STATUS" in
  success)
    COLOR="#36a64f"  # Green
    EMOJI="✅"
    ;;
  failure)
    COLOR="#d9534f"  # Red
    EMOJI="❌"
    ;;
  warning)
    COLOR="#f0ad4e"  # Yellow
    EMOJI="⚠️"
    ;;
  *)
    COLOR="#5bc0de"  # Blue
    EMOJI="ℹ️"
    ;;
esac

# Determine portal URL
case "$PORTAL" in
  portal-main)
    PORTAL_URL="https://marketing.olorin.ai"
    PORTAL_NAME="Main Portal"
    ;;
  portal-fraud)
    PORTAL_URL="https://marketing.fraud.olorin.ai"
    PORTAL_NAME="Fraud Detection Portal"
    ;;
  portal-streaming)
    PORTAL_URL="https://marketing.streaming.olorin.ai"
    PORTAL_NAME="Streaming Portal"
    ;;
  portal-station)
    PORTAL_URL="https://marketing.station.olorin.ai"
    PORTAL_NAME="Station-AI Portal"
    ;;
  portal-omen)
    PORTAL_URL="https://marketing.omen.olorin.ai"
    PORTAL_NAME="Omen Portal"
    ;;
  portal-cvplus)
    PORTAL_URL="https://marketing.cvplus.olorin.ai"
    PORTAL_NAME="CV Plus Portal"
    ;;
  *)
    PORTAL_URL="N/A"
    PORTAL_NAME="$PORTAL"
    ;;
esac

# Generate notification message
case "$EVENT" in
  deployment)
    if [ "$STATUS" = "success" ]; then
      TITLE="$EMOJI Deployment Successful"
      MESSAGE="$PORTAL_NAME has been successfully deployed to production."
    else
      TITLE="$EMOJI Deployment Failed"
      MESSAGE="$PORTAL_NAME deployment failed. Automatic rollback may have been triggered."
    fi
    ;;
  rollback)
    TITLE="$EMOJI Rollback Executed"
    MESSAGE="$PORTAL_NAME has been rolled back to the previous version."
    ;;
  ci-failure)
    TITLE="$EMOJI CI/CD Failure"
    MESSAGE="CI/CD pipeline failed for $PORTAL_NAME."
    ;;
  *)
    TITLE="$EMOJI Event: $EVENT"
    MESSAGE="Status update for $PORTAL_NAME"
    ;;
esac

###############################################################################
# Send Slack Notification
###############################################################################
send_slack_notification() {
  if [ -z "$SLACK_WEBHOOK_URL" ]; then
    echo "⚠️  SLACK_WEBHOOK_URL not configured, skipping Slack notification"
    return 0
  fi

  echo "Sending Slack notification..."

  SLACK_PAYLOAD=$(cat <<EOF
{
  "attachments": [
    {
      "color": "$COLOR",
      "title": "$TITLE",
      "text": "$MESSAGE",
      "fields": [
        {
          "title": "Portal",
          "value": "$PORTAL_NAME",
          "short": true
        },
        {
          "title": "Status",
          "value": "$STATUS",
          "short": true
        },
        {
          "title": "Triggered by",
          "value": "$GITHUB_ACTOR",
          "short": true
        },
        {
          "title": "Timestamp",
          "value": "$TIMESTAMP",
          "short": true
        },
        {
          "title": "Details",
          "value": "$DETAILS",
          "short": false
        }
      ],
      "actions": [
        {
          "type": "button",
          "text": "View Portal",
          "url": "$PORTAL_URL"
        },
        {
          "type": "button",
          "text": "View Workflow",
          "url": "$GITHUB_RUN_URL"
        }
      ],
      "footer": "Olorin CI/CD",
      "ts": $(date +%s)
    }
  ]
}
EOF
)

  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST \
    -H "Content-Type: application/json" \
    -d "$SLACK_PAYLOAD" \
    "$SLACK_WEBHOOK_URL")

  if [ "$HTTP_CODE" = "200" ]; then
    echo "✓ Slack notification sent successfully"
    return 0
  else
    echo "✗ Slack notification failed (HTTP $HTTP_CODE)"
    return 1
  fi
}

###############################################################################
# Send Email Notification (via curl to a mail service)
###############################################################################
send_email_notification() {
  if [ -z "$EMAIL_RECIPIENT" ] || [ -z "$EMAIL_SERVICE_URL" ]; then
    echo "⚠️  Email configuration not complete, skipping email notification"
    return 0
  fi

  echo "Sending email notification..."

  EMAIL_SUBJECT="$TITLE - $PORTAL_NAME"
  EMAIL_BODY=$(cat <<EOF
$MESSAGE

Portal: $PORTAL_NAME
Status: $STATUS
Triggered by: $GITHUB_ACTOR
Timestamp: $TIMESTAMP

Details:
$DETAILS

Links:
- Portal: $PORTAL_URL
- Workflow: $GITHUB_RUN_URL

---
Olorin CI/CD Notification System
EOF
)

  # Placeholder for email service integration
  # Example: SendGrid, AWS SES, Mailgun, etc.
  echo "Email would be sent to: $EMAIL_RECIPIENT"
  echo "Subject: $EMAIL_SUBJECT"
  echo "Body:"
  echo "$EMAIL_BODY"

  # Uncomment and configure when email service is ready:
  # curl -X POST "$EMAIL_SERVICE_URL" \
  #   -H "Authorization: Bearer $EMAIL_API_KEY" \
  #   -H "Content-Type: application/json" \
  #   -d "{\"to\":\"$EMAIL_RECIPIENT\",\"subject\":\"$EMAIL_SUBJECT\",\"body\":\"$EMAIL_BODY\"}"

  return 0
}

###############################################################################
# Create GitHub Deployment Status
###############################################################################
send_github_notification() {
  if [ -z "$GITHUB_TOKEN" ]; then
    echo "⚠️  GITHUB_TOKEN not configured, skipping GitHub notification"
    return 0
  fi

  echo "Creating GitHub deployment status..."

  # This would create a GitHub deployment status
  # Requires GITHUB_TOKEN with repo:status permission

  echo "GitHub notification placeholder - configure with GitHub API"

  return 0
}

###############################################################################
# Console Output (Always Runs)
###############################################################################
echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                  DEPLOYMENT NOTIFICATION                       ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "  Event:      $EVENT"
echo "  Portal:     $PORTAL_NAME"
echo "  Status:     $STATUS $EMOJI"
echo "  Triggered:  $GITHUB_ACTOR"
echo "  Timestamp:  $TIMESTAMP"
echo ""
echo "  Portal URL: $PORTAL_URL"
echo "  Workflow:   $GITHUB_RUN_URL"
echo ""
echo "  Details:"
echo "  $DETAILS"
echo ""
echo "════════════════════════════════════════════════════════════════"
echo ""

###############################################################################
# Send notifications to all configured channels
###############################################################################
send_slack_notification
send_email_notification
send_github_notification

echo "✓ Notifications sent"
exit 0
