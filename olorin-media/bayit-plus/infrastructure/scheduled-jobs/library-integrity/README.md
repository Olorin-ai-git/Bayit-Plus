# Library Integrity Check - Cloud Run Job & Scheduler

Automated weekly library integrity verification for Bayit+ media library using Google Cloud Run Jobs and Cloud Scheduler.

## Overview

This setup enables zero-trust verification of the complete Bayit+ media library on a weekly schedule:

- **Cloud Run Job**: Containerized verification script that checks file integrity, GCS existence, metadata completeness
- **Cloud Scheduler**: Triggers the job every Sunday at 2:00 AM UTC
- **Serverless**: No infrastructure maintenance required
- **Scalable**: Handles library growth automatically
- **Audit Trail**: Full verification reports generated and stored

## Architecture

```
┌──────────────────────┐
│  Cloud Scheduler     │
│  (Weekly: Sun 2 AM)  │
└──────────┬───────────┘
           │ Trigger
           ▼
┌──────────────────────┐
│  Cloud Run Job       │
│  library-integrity-  │
│  check               │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐       ┌──────────────────────┐
│  MongoDB Atlas       │◄──────┤  GCS Bucket          │
│  (Content metadata)  │       │  (Media files)       │
└──────────────────────┘       └──────────────────────┘
           │
           ▼
┌──────────────────────┐
│  Verification Report │
│  /docs/reviews/      │
└──────────────────────┘
```

## Files

| File | Purpose |
|------|---------|
| `Dockerfile` | Container definition for Cloud Run Job |
| `deploy-job.sh` | Deployment script (build, push, create job) |
| `setup-scheduler.sh` | Cloud Scheduler configuration script |
| `README.md` | This file |

## Prerequisites

1. **Google Cloud Project**:
   - Project ID: `bayit-plus` (or set `GCP_PROJECT_ID` env var)
   - APIs enabled: Cloud Run, Container Registry, Cloud Scheduler
   - Service account: `bayit-plus-cloud-run@bayit-plus.iam.gserviceaccount.com`

2. **Environment Variables** (from `/Users/olorin/Documents/olorin/olorin-infra/.env`):
   ```bash
   GCP_PROJECT_ID=bayit-plus
   GCP_REGION=us-east1
   MONGODB_URI=mongodb+srv://...
   SECRET_KEY=...
   GCS_BUCKET_NAME=bayit-plus-media-new
   ```

3. **gcloud CLI**:
   - Installed and authenticated: `gcloud auth login`
   - Docker configured: `gcloud auth configure-docker`

4. **Permissions**:
   - Cloud Run Admin
   - Cloud Scheduler Admin
   - Storage Admin
   - Service Account User

## Setup Instructions

### Step 1: Deploy Cloud Run Job

```bash
cd infrastructure/scheduled-jobs/library-integrity
./deploy-job.sh
```

**What it does**:
- Builds Docker image from `Dockerfile`
- Pushes image to Google Container Registry (GCR)
- Creates/updates Cloud Run Job with proper configuration
- Sets environment variables from olorin-infra

**Options**:
```bash
./deploy-job.sh --live               # Enable live mode (applies changes)
./deploy-job.sh --verify-hashes      # Enable hash verification (EXPENSIVE)
./deploy-job.sh --verify-streaming   # Enable streaming URL testing (adds time)
```

**Default Configuration** (safe, fast checks):
- Dry-run mode (preview only)
- Batch size: 100 items
- Concurrency: 20 parallel checks
- Checks: metadata completeness, GCS existence, GCS accessibility
- **NO --limit flag** (checks entire library)

**Performance**:
- Light checks (default): ~40 minutes for 50,000 items
- With hash verification: ~69 hours for 50,000 items

### Step 2: Setup Cloud Scheduler

```bash
./setup-scheduler.sh
```

**What it does**:
- Creates Cloud Scheduler job targeting the Cloud Run Job
- Sets weekly schedule: Every Sunday at 2:00 AM UTC
- Configures OAuth authentication with service account

**Schedule**: `0 2 * * 0` (cron format)
- Runs every Sunday at 2 AM UTC
- Timezone: UTC
- Allows 1 hour maximum execution time

### Step 3: Test the Setup

**Test job manually**:
```bash
gcloud run jobs execute library-integrity-check \
  --region=us-east1
```

**Test scheduler immediately**:
```bash
gcloud scheduler jobs run library-integrity-weekly-check \
  --location=us-east1
```

**View job executions**:
```bash
gcloud run jobs executions list \
  --job=library-integrity-check \
  --region=us-east1
```

**View execution logs**:
```bash
# Get execution ID from list above, then:
gcloud run jobs executions describe <execution-id> \
  --region=us-east1

# Or view logs directly:
gcloud logging read \
  "resource.type=cloud_run_job AND resource.labels.job_name=library-integrity-check" \
  --limit=100
```

## Configuration Options

### Dry-Run vs Live Mode

**Dry-Run** (default, safe):
- Detects issues without making changes
- Generates comprehensive report
- Recommended for weekly automated checks

**Live Mode** (requires `--live` flag):
- Updates file hashes if mismatched
- Rehydrates missing metadata from TMDB
- Marks broken content for review
- Use after reviewing dry-run reports

To deploy with live mode:
```bash
./deploy-job.sh --live
```

### Verification Depth

**Light** (default, recommended):
- Metadata completeness check
- GCS file existence check
- GCS accessibility check via HTTP HEAD
- ~40 minutes for 50K items

**Medium** (add `--verify-streaming`):
- All light checks
- Streaming URL validation with Range requests
- ~60 minutes for 50K items

**Full** (add `--verify-hashes --verify-streaming`):
- All medium checks
- SHA256 hash recalculation from GCS
- ~69 hours for 50K items (USE SPARINGLY)

### Batch Size & Concurrency

Adjust for performance tuning:
```bash
# Edit deploy-job.sh, line 123:
CMD_ARGS="--batch-size 200 --concurrency 50 ${DRY_RUN} ${VERIFY_HASHES} ${VERIFY_STREAMING}"
```

**Recommendations**:
- Small library (<1K items): batch=50, concurrency=10
- Medium library (1K-10K): batch=100, concurrency=20
- Large library (>10K): batch=200, concurrency=50

## Monitoring

### View Scheduler Status

```bash
gcloud scheduler jobs describe library-integrity-weekly-check \
  --location=us-east1
```

### View Recent Executions

```bash
gcloud scheduler jobs describe library-integrity-weekly-check \
  --location=us-east1 \
  --format="value(state, lastAttemptTime, status)"
```

### View Verification Reports

Reports are generated at: `/docs/reviews/LIBRARY_INTEGRITY_YYYY-MM-DD_HH-MM-SS.md`

Check latest report:
```bash
ls -lt docs/reviews/LIBRARY_INTEGRITY_*.md | head -1
```

### Cloud Console Monitoring

**Cloud Run Jobs**:
https://console.cloud.google.com/run/jobs?project=bayit-plus

**Cloud Scheduler**:
https://console.cloud.google.com/cloudscheduler?project=bayit-plus

**Logs Explorer**:
https://console.cloud.google.com/logs?project=bayit-plus

## Troubleshooting

### Job Fails to Start

**Symptom**: Job execution fails immediately

**Common Causes**:
1. Missing environment variables
2. Service account permissions
3. Database connection issues

**Fix**:
```bash
# Check job configuration
gcloud run jobs describe library-integrity-check \
  --region=us-east1 \
  --format=yaml

# Verify environment variables are set
# Edit deploy-job.sh and redeploy
```

### Hash Verification Too Slow

**Symptom**: Job times out after 1 hour

**Fix**: Hash verification downloads all files - very expensive!
```bash
# Disable hash verification (default)
./deploy-job.sh

# Or increase timeout (max 24 hours)
# Edit deploy-job.sh line 132:
--task-timeout=3h
```

### Scheduler Not Triggering

**Symptom**: No executions on schedule

**Check**:
```bash
# View scheduler status
gcloud scheduler jobs describe library-integrity-weekly-check \
  --location=us-east1

# Check for errors
gcloud logging read \
  "resource.type=cloud_scheduler_job" \
  --limit=50
```

**Fix**:
```bash
# Pause and resume scheduler
gcloud scheduler jobs pause library-integrity-weekly-check \
  --location=us-east1

gcloud scheduler jobs resume library-integrity-weekly-check \
  --location=us-east1
```

### Report Not Generated

**Symptom**: Job completes but no report in /docs/reviews/

**Possible Causes**:
1. Job runs in container without access to local filesystem
2. Need to configure Cloud Storage for report storage

**Workaround**: Reports should be saved to GCS bucket:
```bash
# Add to deploy-job.sh environment variables:
--set-env-vars="REPORT_OUTPUT_BUCKET=gs://bayit-plus-reports"
```

## Updating the Job

### Change Schedule

```bash
# Edit setup-scheduler.sh line 25:
SCHEDULE="0 2 * * 0"  # Change to desired cron

# Redeploy scheduler
./setup-scheduler.sh
```

### Update Code

```bash
# Make changes to verification script
# Rebuild and redeploy
./deploy-job.sh
```

### Change Configuration

```bash
# Edit deploy-job.sh flags (lines 123, 133-139)
# Redeploy job
./deploy-job.sh --live
```

## Cost Estimation

**Cloud Run Job**:
- ~$0.05 per execution (2GB RAM, 2 vCPU, 1 hour)
- Weekly: ~$0.20/month

**Cloud Scheduler**:
- $0.10 per job per month

**Total**: ~$0.30/month for weekly automated checks

**Note**: Hash verification significantly increases cost due to data egress from GCS.

## Security Considerations

1. **Service Account Permissions**: Minimal required permissions
2. **Environment Variables**: Sensitive data from Secret Manager
3. **Network**: Private VPC connector (optional)
4. **Audit Trail**: All actions logged to SecurityAuditLog collection

## Support

For issues or questions:
1. Check logs in Cloud Console
2. Review verification reports in /docs/reviews/
3. Test manually with `poetry run python scripts/backend/verify_library_integrity.py`
4. Contact platform team

## Related Documentation

- Main script: `/scripts/backend/verify_library_integrity.py`
- CLI wrapper: `/scripts/backend/bayit-verify-library-integrity.sh`
- Implementation plan: `/Users/olorin/.claude/plans/linear-forging-bengio.md`
- Service code: `/backend/app/services/library_integrity/`
