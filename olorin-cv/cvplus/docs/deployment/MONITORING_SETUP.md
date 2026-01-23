# Production Monitoring Setup Guide

## Overview

CVPlus production monitoring includes:
- **Cloud Monitoring**: Uptime checks and alerting
- **Sentry**: Error tracking and performance monitoring
- **Cloud Logging**: Structured log aggregation
- **Custom Metrics**: Application-specific metrics

---

## Cloud Monitoring Configuration

### Prerequisites
```bash
# Set environment variables
export GCP_PROJECT_ID="olorin-production"
export GCP_REGION="us-central1"
```

### Automated Setup
```bash
# Run monitoring setup workflow
gh workflow run monitoring-setup.yml
```

### Manual Setup

**1. Create Uptime Checks**:
```bash
# Backend health check
gcloud monitoring uptime-checks create \
  --display-name="CVPlus Backend Health" \
  --http-check-path="/health" \
  --resource-type=uptime-url \
  --resource-labels="host=cvplus-backend-prod.run.app"

# Frontend health check
gcloud monitoring uptime-checks create \
  --display-name="CVPlus Frontend Health" \
  --http-check-path="/" \
  --resource-type=uptime-url \
  --resource-labels="host=cvplus.olorin.ai"
```

**2. Create Alert Channels**:
```bash
# Slack channel
gcloud alpha monitoring channels create \
  --display-name="CVPlus Alerts Slack" \
  --type=slack \
  --channel-labels=url="$SLACK_WEBHOOK_URL"

# Email channel
gcloud alpha monitoring channels create \
  --display-name="CVPlus Alerts Email" \
  --type=email \
  --channel-labels=email_address="ops@olorin.ai"
```

**3. Create Alert Policies**:
```bash
# High error rate alert
gcloud alpha monitoring policies create \
  --notification-channels="$CHANNEL_ID" \
  --display-name="CVPlus High Error Rate" \
  --condition-threshold-value=0.05 \
  --condition-threshold-duration=300s

# High latency alert
gcloud alpha monitoring policies create \
  --notification-channels="$CHANNEL_ID" \
  --display-name="CVPlus High Latency" \
  --condition-threshold-value=2000 \
  --condition-threshold-duration=300s
```

---

## Sentry Integration

### Backend Setup (Python)

**1. Install Sentry SDK**:
```bash
cd python-backend
poetry add sentry-sdk[fastapi]
```

**2. Configure in `app/main.py`**:
```python
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from app.core.config import get_settings

settings = get_settings()

# Initialize Sentry
sentry_sdk.init(
    dsn=settings.sentry_dsn,
    environment=settings.environment,
    traces_sample_rate=0.1,  # 10% transaction sampling
    profiles_sample_rate=0.1,  # 10% profiling
    integrations=[
        FastApiIntegration(transaction_style="endpoint"),
    ],
    # Release tracking
    release=settings.app_version,
    # Performance monitoring
    enable_tracing=True,
)
```

**3. Add to `.env.example`**:
```env
# Error Tracking (REQUIRED for production)
SENTRY_DSN=https://[YOUR-KEY]@sentry.io/[PROJECT-ID]
SENTRY_ENVIRONMENT=production
```

### Frontend Setup (React)

**1. Install Sentry SDK**:
```bash
cd frontend
npm install --save @sentry/react
```

**2. Configure in `src/main.tsx`**:
```typescript
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.VITE_APP_ENV,
  integrations: [
    new Sentry.BrowserTracing(),
    new Sentry.Replay(),
  ],
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});
```

---

## Structured Logging

### Backend Logging Configuration

**Update `app/core/logging_config.py`**:
```python
import logging
import json
from google.cloud import logging as cloud_logging

def configure_production_logging():
    """Configure Google Cloud structured logging"""
    # Cloud Logging client
    client = cloud_logging.Client()
    client.setup_logging()

    # Structured JSON formatter
    class StructuredFormatter(logging.Formatter):
        def format(self, record):
            log_obj = {
                "severity": record.levelname,
                "message": record.getMessage(),
                "timestamp": self.formatTime(record),
                "component": record.name,
            }

            # Add extra fields
            if hasattr(record, "user_id"):
                log_obj["user_id"] = record.user_id
            if hasattr(record, "correlation_id"):
                log_obj["correlation_id"] = record.correlation_id

            return json.dumps(log_obj)

    handler = logging.StreamHandler()
    handler.setFormatter(StructuredFormatter())

    logger = logging.getLogger()
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)
```

### Example Usage
```python
from app.core.logging_config import get_logger

logger = get_logger(__name__)

logger.info(
    "CV analysis completed",
    extra={
        "user_id": user.id,
        "cv_id": cv.id,
        "processing_time_ms": elapsed_time,
        "correlation_id": request.state.correlation_id,
    }
)
```

---

## Custom Metrics

### Application Metrics

**Add to `app/core/metrics.py`**:
```python
from google.cloud import monitoring_v3
from app.core.config import get_settings

settings = get_settings()
client = monitoring_v3.MetricServiceClient()
project_name = f"projects/{settings.gcp_project_id}"

def record_cv_processing_time(duration_ms: float):
    """Record CV processing duration"""
    series = monitoring_v3.TimeSeries()
    series.metric.type = "custom.googleapis.com/cvplus/cv_processing_time"
    series.resource.type = "global"

    point = monitoring_v3.Point()
    point.value.double_value = duration_ms

    now = time.time()
    point.interval.end_time.seconds = int(now)

    series.points.append(point)
    client.create_time_series(name=project_name, time_series=[series])
```

---

## Dashboard Setup

### Cloud Monitoring Dashboard

**Create dashboard JSON** (`monitoring/dashboard.json`):
```json
{
  "displayName": "CVPlus Production Dashboard",
  "dashboardFilters": [],
  "gridLayout": {
    "widgets": [
      {
        "title": "Backend Uptime",
        "xyChart": {
          "dataSets": [{
            "timeSeriesQuery": {
              "timeSeriesFilter": {
                "filter": "resource.type=\"uptime_url\" AND metric.type=\"monitoring.googleapis.com/uptime_check/check_passed\""
              }
            }
          }]
        }
      },
      {
        "title": "Error Rate",
        "xyChart": {
          "dataSets": [{
            "timeSeriesQuery": {
              "timeSeriesFilter": {
                "filter": "resource.type=\"cloud_run_revision\" AND metric.type=\"run.googleapis.com/request_count\""
              }
            }
          }]
        }
      },
      {
        "title": "API Latency (95th Percentile)",
        "xyChart": {
          "dataSets": [{
            "timeSeriesQuery": {
              "timeSeriesFilter": {
                "filter": "resource.type=\"cloud_run_revision\" AND metric.type=\"run.googleapis.com/request_latencies\""
              }
            }
          }]
        }
      }
    ]
  }
}
```

**Import dashboard**:
```bash
gcloud monitoring dashboards create --config-from-file=monitoring/dashboard.json
```

---

## Alert Runbook

### High Error Rate Alert

**Trigger**: Error rate > 5% for 5 minutes

**Investigation Steps**:
1. Check Sentry for recent errors
2. Review Cloud Logging for error patterns
3. Check recent deployments (last 1 hour)
4. Verify database connectivity
5. Check external service status (AI APIs)

**Resolution**:
- If deployment-related: Rollback using GitHub Actions
- If database-related: Check MongoDB Atlas status
- If external service: Implement circuit breaker

### High Latency Alert

**Trigger**: 95th percentile latency > 2s for 5 minutes

**Investigation Steps**:
1. Check Cloud Monitoring latency breakdown
2. Review slow queries in MongoDB Atlas
3. Check Cloud Run instance scaling
4. Verify external API latencies
5. Review recent code changes

**Resolution**:
- Add database indexes if slow queries
- Scale Cloud Run instances if CPU-bound
- Implement caching for repeated operations

---

## Required GitHub Secrets

Add these secrets to your GitHub repository:

```bash
# Google Cloud
GCP_SERVICE_ACCOUNT_KEY     # Service account JSON
GCP_PROJECT_ID_PROD         # Production project ID
ALERT_CHANNEL_ID            # Monitoring notification channel

# Sentry
SENTRY_DSN                  # Sentry project DSN
SENTRY_AUTH_TOKEN           # For release tracking

# Slack (optional)
SLACK_WEBHOOK_URL           # Alerts channel webhook
```

---

## Verification Checklist

After setup, verify:

- [ ] Uptime checks are running (check Cloud Monitoring console)
- [ ] Alert policies are active
- [ ] Test alert notifications (manually trigger)
- [ ] Sentry receiving errors (test with intentional error)
- [ ] Structured logs appearing in Cloud Logging
- [ ] Dashboard displaying metrics
- [ ] Runbook procedures documented
- [ ] Team trained on alerting procedures

---

## Monitoring Costs

**Estimated monthly costs**:
- Cloud Monitoring: ~$10/month (uptime checks + alerts)
- Cloud Logging: ~$5/month (1GB logs)
- Sentry: Free tier (5K events/month) or $26/month (50K events)
- Total: ~$15-$40/month

---

## Support

For monitoring issues:
- **Cloud Monitoring**: https://console.cloud.google.com/monitoring
- **Sentry**: https://sentry.io/organizations/olorin/
- **Documentation**: /docs/deployment/

**On-call rotation**: See ONCALL.md
