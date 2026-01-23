# Automated Rollback System

## Overview

CVPlus includes a comprehensive automated rollback system that monitors deployment health and automatically triggers rollbacks when critical thresholds are exceeded.

## Components

### 1. **Automated Rollback Trigger** (`automated-rollback-trigger.sh`)
Continuous monitoring script that checks frontend health and triggers rollback on failures.

**Features**:
- Health endpoint monitoring every 30 seconds
- Response time threshold checking (default: 5s)
- Consecutive failure tracking (rollback after 3 failures)
- Automatic Firebase Hosting rollback
- Email notifications on rollback

**Usage**:
```bash
# Start continuous monitoring
./automated-rollback-trigger.sh monitor

# Single health check
./automated-rollback-trigger.sh check

# Manual rollback trigger
./automated-rollback-trigger.sh rollback
```

**Configuration** (environment variables):
```bash
export FRONTEND_URL="https://cvplus.web.app"
export HEALTH_CHECK_INTERVAL=30       # seconds
export MAX_FAILURES=3                 # consecutive failures
export RESPONSE_TIME_THRESHOLD=5000   # milliseconds
export FIREBASE_PROJECT_ID="cvplus-production"
export ALERT_EMAIL="admin@cvplus.com"
```

### 2. **GitHub Actions Integration**
The deployment workflow (`.github/workflows/deploy-frontend.yml`) includes:
- Automatic rollback preparation on deployment failure
- Post-deployment health checks
- Rollback instructions generation
- Status notifications

**Rollback Job** (runs on deployment failure):
```yaml
rollback-preparation:
  name: Prepare Rollback Strategy
  runs-on: ubuntu-latest
  needs: [test-and-build, deploy]
  if: failure()
```

### 3. **Emergency Rollback Scripts**
Located in `/scripts/emergency/`:
- `critical-rollback.sh` - Complete system restoration (<5 minutes)
- `functions-rollback.sh` - Backend functions rollback
- `database-rollback.sh` - Database restoration
- `backup-verification.sh` - Backup integrity verification

## Rollback Strategies

### Automatic Rollback Triggers

| Scenario | Threshold | Response Time |
|----------|-----------|---------------|
| **Frontend Unavailable** | 3 consecutive health check failures | <2 minutes |
| **Slow Response** | Response time >5s for 3 checks | <3 minutes |
| **Deployment Failure** | Build or deploy job failure | Immediate |
| **Post-Deployment Failure** | Health check failure after deploy | <5 minutes |

### Manual Rollback Options

#### Firebase Console
1. Navigate to Firebase Console → Hosting
2. View deployment history
3. Click "Rollback" on previous stable version

#### Firebase CLI
```bash
# Rollback to previous version
firebase hosting:rollback --project cvplus-production

# Rollback to specific version
firebase hosting:clone SOURCE_VERSION CHANNEL
```

## Monitoring Integration

### Production Monitoring Setup

**Option 1: Systemd Service** (Linux servers)
```bash
# Create service file
sudo nano /etc/systemd/system/cvplus-rollback-monitor.service

[Unit]
Description=CVPlus Automated Rollback Monitor
After=network.target

[Service]
Type=simple
User=cvplus
WorkingDirectory=/opt/cvplus/frontend/scripts
ExecStart=/opt/cvplus/frontend/scripts/automated-rollback-trigger.sh monitor
Restart=always
RestartSec=60
Environment="FRONTEND_URL=https://cvplus.web.app"
Environment="FIREBASE_PROJECT_ID=cvplus-production"
Environment="ALERT_EMAIL=admin@cvplus.com"

[Install]
WantedBy=multi-user.target

# Enable and start service
sudo systemctl enable cvplus-rollback-monitor
sudo systemctl start cvplus-rollback-monitor

# Check status
sudo systemctl status cvplus-rollback-monitor
```

**Option 2: Docker Container**
```dockerfile
FROM node:20-alpine

# Install Firebase CLI
RUN npm install -g firebase-tools

# Copy monitoring script
COPY automated-rollback-trigger.sh /app/
RUN chmod +x /app/automated-rollback-trigger.sh

# Set environment variables
ENV FRONTEND_URL=https://cvplus.web.app
ENV HEALTH_CHECK_INTERVAL=30
ENV MAX_FAILURES=3

CMD ["/app/automated-rollback-trigger.sh", "monitor"]
```

**Option 3: Cloud Run Scheduled Job**
```bash
# Deploy as Cloud Run job
gcloud run jobs create cvplus-rollback-monitor \
  --image=gcr.io/cvplus-production/rollback-monitor:latest \
  --region=us-central1 \
  --schedule="* * * * *"  # Every minute
```

### Health Check Endpoints

Monitor these endpoints:
- Frontend: `https://cvplus.web.app/`
- API Health: `https://us-central1-cvplus.cloudfunctions.net/health`
- Database: `https://firestore.googleapis.com/v1/projects/cvplus-production/databases/(default)/documents/health`

## Testing Rollback Procedures

### Monthly Full Test
```bash
# 1. Deploy to staging
firebase deploy --only hosting --project cvplus-staging

# 2. Trigger test failure
curl -X POST https://cvplus-staging.web.app/api/simulate-failure

# 3. Verify automatic rollback
./automated-rollback-trigger.sh check

# 4. Validate rollback completion
firebase hosting:list --project cvplus-staging
```

### Weekly Component Test
```bash
# Test health check
./automated-rollback-trigger.sh check

# Test rollback trigger
./automated-rollback-trigger.sh rollback --dry-run
```

## Troubleshooting

### Rollback Not Triggering

**Check monitoring status**:
```bash
# If using systemd
sudo systemctl status cvplus-rollback-monitor

# Check logs
sudo journalctl -u cvplus-rollback-monitor -f
```

**Verify Firebase authentication**:
```bash
firebase login
firebase projects:list
```

### Rollback Failed

**Check Firebase quota**:
- Verify deployment quota not exceeded
- Check Hosting bandwidth limits

**Manual intervention**:
```bash
# Use emergency rollback script
/scripts/emergency/critical-rollback.sh --auto-confirm
```

## Notifications

### Email Alerts
Configure SMTP for email notifications:
```bash
export ALERT_EMAIL="team@cvplus.com"
```

### Slack Integration (optional)
Add Slack webhook URL:
```bash
export SLACK_WEBHOOK_URL="https://hooks.slack.com/services/XXX"
```

Update `trigger_rollback()` function to send Slack notification.

## Security Considerations

### Access Control
- Rollback scripts require Firebase project access
- Service account credentials should be secured
- Audit logging enabled for all rollback actions

### Secrets Management
- Store Firebase credentials in environment variables
- Use Google Secret Manager for production
- Never commit credentials to repository

## Performance Metrics

Track rollback effectiveness:
- **Time to Detect**: Health check interval (default: 30s)
- **Time to Decide**: Consecutive failures × interval (default: 90s)
- **Time to Execute**: Firebase rollback time (typically <60s)
- **Total Recovery Time**: <3 minutes (target)

## Continuous Improvement

### Review Rollback Events
- Analyze rollback frequency
- Identify common failure patterns
- Optimize health check thresholds
- Update monitoring coverage

### Update Procedures
- Monthly rollback procedure review
- Quarterly testing schedule update
- Annual disaster recovery planning

---

## Quick Reference

### Start Monitoring
```bash
./automated-rollback-trigger.sh monitor
```

### Manual Rollback
```bash
firebase hosting:rollback --project cvplus-production --yes
```

### Emergency Contacts
- Primary: admin@cvplus.com
- Emergency: Use emergency rollback scripts in `/scripts/emergency/`

---

**Last Updated**: 2026-01-22
**Version**: 1.0
**Status**: Production Ready ✅
