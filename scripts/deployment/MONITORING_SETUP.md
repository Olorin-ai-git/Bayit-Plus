# Production Monitoring Setup

## Overview

Automated production monitoring runs every 5 minutes to detect issues and trigger automatic rollbacks when thresholds are exceeded.

## Monitoring Workflow

**Workflow**: `.github/workflows/production-monitoring.yml`
**Frequency**: Every 5 minutes (cron: `*/5 * * * *`)
**Manual Trigger**: Available via GitHub Actions UI

## Monitored Metrics

### 1. API Latency
- **Metric**: Health endpoint response time
- **Threshold**: 2000ms (2 seconds)
- **Source**: Direct curl measurement
- **Action**: Trigger rollback if exceeded

### 2. Notification System Errors
- **Metric**: Errors mentioning "notification" in last 5 minutes
- **Threshold**: 10 errors per 5-minute window
- **Source**: Cloud Logging
- **Action**: Trigger rollback if exceeded

### 3. General Error Rate
- **Metric**: Cloud Run ERROR+ severity logs in last 5 minutes
- **Baseline**: 5 errors
- **Threshold**: Baseline + 5 (10 total)
- **Source**: Cloud Logging
- **Action**: Trigger rollback if exceeded

### 4. Memory Usage
- **Metric**: Cloud Run container memory utilization
- **Threshold**: 90%
- **Source**: Cloud Monitoring timeseries
- **Action**: Trigger rollback if exceeded

## Alert Configuration

### GitHub Issues

When any threshold is exceeded, an incident issue is automatically created:

**Title**: `🚨 AUTO-ROLLBACK: Production health check failed`

**Labels**:
- `production-incident`
- `auto-rollback`
- `urgent`

**Content**:
- Timestamp of detection
- All metric values
- Thresholds exceeded
- Automatic actions taken
- Required manual actions

### Notification Channels

Configure additional notification channels in repository settings:

- **Slack**: #production-alerts channel
- **PagerDuty**: On-call engineer
- **Email**: Team distribution list

## Automatic Rollback

When triggered, the monitoring workflow:

1. **Creates incident issue** with full context
2. **Triggers rollback workflow** (when implemented)
3. **Notifies on-call team**
4. **Generates health report** uploaded as artifact

## Manual Monitoring Commands

### Check Current Metrics

```bash
# API Latency
curl -w "Response time: %{time_total}s\n" -s -o /dev/null https://bayitplus.com/health

# Recent errors
gcloud logging read \
  "severity>=ERROR AND timestamp>\"$(date -u -d '5 minutes ago' +%Y-%m-%dT%H:%M:%SZ)\"" \
  --limit=50 \
  --format=json

# Notification errors
gcloud logging read \
  "jsonPayload.message=~'notification' AND severity>=ERROR" \
  --limit=100 \
  --format=json

# Memory usage
gcloud monitoring timeseries list \
  --filter='metric.type="run.googleapis.com/container/memory/utilizations"' \
  --format=json

# CPU usage
gcloud monitoring timeseries list \
  --filter='metric.type="run.googleapis.com/container/cpu/utilizations"' \
  --format=json
```

### Check Service Health

```bash
# Cloud Run service status
gcloud run services describe bayit-backend \
  --region=us-central1 \
  --format=json

# Recent deployments
gcloud run revisions list \
  --service=bayit-backend \
  --region=us-central1 \
  --limit=10

# Traffic distribution
gcloud run services describe bayit-backend \
  --region=us-central1 \
  --format="value(status.traffic)"
```

## Monitoring Dashboard

### Recommended Setup

Create Google Cloud Monitoring dashboard with:

1. **API Latency Chart**
   - Metric: `run.googleapis.com/request_latencies`
   - Visualization: Line chart
   - Threshold line at 2000ms

2. **Error Rate Chart**
   - Metric: `logging.googleapis.com/log_entry_count` filtered by severity>=ERROR
   - Visualization: Stacked area chart
   - Threshold line at baseline + 5

3. **Notification Errors**
   - Metric: Custom log-based metric
   - Filter: `jsonPayload.message=~'notification'`
   - Visualization: Bar chart

4. **Memory Usage**
   - Metric: `run.googleapis.com/container/memory/utilizations`
   - Visualization: Line chart
   - Threshold line at 90%

5. **Request Count**
   - Metric: `run.googleapis.com/request_count`
   - Visualization: Line chart
   - Helps correlate load with errors

## Alert Policies

### Critical: High Error Rate

```yaml
Condition: Error count > baseline + 10
Duration: 5 minutes
Notification: Immediate
Action: Auto-rollback
```

### Critical: High Latency

```yaml
Condition: p95 latency > 2000ms
Duration: 3 minutes
Notification: Immediate
Action: Auto-rollback
```

### Warning: Elevated Errors

```yaml
Condition: Error count > baseline + 3
Duration: 10 minutes
Notification: Slack only
Action: Monitor closely
```

### Warning: Memory Pressure

```yaml
Condition: Memory > 80%
Duration: 10 minutes
Notification: Slack only
Action: Monitor, prepare to scale
```

## Baseline Metrics

Record baseline metrics BEFORE Phase 1 deployment:

```bash
# Run this script weekly to update baselines
./scripts/deployment/record-baseline.sh
```

**Current Baselines** (to be measured):
- Error rate: [TBD - record before Phase 1]
- API latency p50: [TBD]
- API latency p95: [TBD]
- API latency p99: [TBD]
- Memory usage: [TBD]
- CPU usage: [TBD]
- Request rate: [TBD]

## Health Check Schedule

| Check | Frequency | Automated | Manual |
|-------|-----------|-----------|--------|
| API Latency | 5 minutes | ✅ | Daily |
| Error Logs | 5 minutes | ✅ | Hourly |
| Memory Usage | 5 minutes | ✅ | Daily |
| Notification Errors | 5 minutes | ✅ | Hourly |
| Database Health | 5 minutes | ✅ | Daily |
| Service Status | 5 minutes | ✅ | Daily |
| Cost Analysis | N/A | ❌ | Weekly |
| Security Scan | N/A | ❌ | Monthly |

## Troubleshooting

### Monitoring Workflow Fails

1. Check gcloud authentication: Verify GCP_SA_KEY secret
2. Check API accessibility: Ensure production URL is correct
3. Check permissions: Service account needs Logging/Monitoring read access

### False Positives

If monitoring triggers unnecessarily:
1. Review threshold values (may need adjustment)
2. Check for legitimate traffic spikes
3. Verify baseline metrics are current
4. Consider time-of-day patterns

### Missed Issues

If issues aren't detected:
1. Verify monitoring workflow is running (check Actions tab)
2. Check cron schedule is active
3. Verify metric queries are correct
4. Review threshold sensitivity

## Configuration

### Required Secrets

GitHub repository secrets:
- `GCP_SA_KEY`: Google Cloud service account key (JSON)
- Optional: `SENTRY_DSN` for Sentry integration
- Optional: `SLACK_WEBHOOK_URL` for Slack notifications

### Required Variables

GitHub repository variables:
- `PRODUCTION_URL`: Production environment URL (default: https://bayitplus.com)

### Service Account Permissions

The GCP service account needs:
- `roles/logging.viewer`
- `roles/monitoring.viewer`
- `roles/run.viewer`

## Next Steps

After Task 0.6 complete:
- [ ] Configure GitHub secrets (GCP_SA_KEY)
- [ ] Set GitHub variables (PRODUCTION_URL)
- [ ] Record baseline metrics
- [ ] Test monitoring workflow manually
- [ ] Proceed to Task 0.7: Multi-Platform Build Matrix
