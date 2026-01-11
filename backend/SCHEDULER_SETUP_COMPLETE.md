# Cloud Scheduler Setup Complete ✅

**Date:** 2026-01-11
**Status:** Active & Running
**Project:** israeli-radio-475c9
**Region:** us-east1

---

## 📅 Scheduled Jobs

### 1. Daily Rule-Based Audit
- **Job Name:** `librarian-daily-audit`
- **Schedule:** Every day at 2:00 AM Israel time
- **Cron:** `0 2 * * *`
- **Mode:** Rule-based (fast, predictable)
- **Cost:** ~$0.01/day = ~$0.30/month
- **Status:** ✅ ENABLED

**What it does:**
- Scans content modified in last 7 days
- Random 10% sample of older content
- Checks metadata completeness
- Validates streaming URLs
- Sends email report (always)
- Auto-fixes safe issues

### 2. Weekly AI Agent Audit
- **Job Name:** `librarian-weekly-ai-audit`
- **Schedule:** Every Sunday at 3:00 AM Israel time
- **Cron:** `0 3 * * 0`
- **Mode:** AI Agent (autonomous, intelligent)
- **Cost:** ~$0.10-0.50/week = ~$2/month
- **Status:** ✅ ENABLED

**What it does:**
- Claude decides what to inspect
- Adaptive strategy based on findings
- Deep investigation of potential issues
- Sends email ONLY if major problems found
- Provides strategic recommendations in Hebrew
- Auto-fixes with high confidence

---

## 🔧 Configuration Details

### Cloud Run Service
- **URL:** https://bayit-plus-backend-znfki37vbq-ue.a.run.app
- **Region:** us-east1
- **Service Account:** 534446777606-compute@developer.gserviceaccount.com

### API Endpoint
```
POST /api/v1/admin/librarian/run-audit
```

### Authentication
- Uses OIDC token authentication
- Service account has Cloud Run Invoker role
- Secure, no API keys in scheduler config

### Retry Policy
- **Max retries:** 2 attempts
- **Attempt deadline:** 600 seconds (10 minutes)
- **Backoff:** Exponential (5s min, 1h max)

---

## 📊 Expected Schedule

### January 2026 Example

| Date | Day | Time | Job Type | Estimated Cost |
|------|-----|------|----------|----------------|
| Jan 12 | Sun | 2:00 AM | Daily (rule-based) | $0.01 |
| Jan 12 | Sun | 3:00 AM | Weekly (AI agent) | $0.20 |
| Jan 13 | Mon | 2:00 AM | Daily (rule-based) | $0.01 |
| Jan 14 | Tue | 2:00 AM | Daily (rule-based) | $0.01 |
| Jan 15 | Wed | 2:00 AM | Daily (rule-based) | $0.01 |
| Jan 16 | Thu | 2:00 AM | Daily (rule-based) | $0.01 |
| Jan 17 | Fri | 2:00 AM | Daily (rule-based) | $0.01 |
| Jan 18 | Sat | 2:00 AM | Daily (rule-based) | $0.01 |
| Jan 19 | Sun | 2:00 AM | Daily (rule-based) | $0.01 |
| Jan 19 | Sun | 3:00 AM | Weekly (AI agent) | $0.20 |

**Monthly estimate:** ~$2.40/month ($0.30 daily + $2.00 weekly AI)

---

## 🔍 How to Monitor

### View Scheduler Jobs
```bash
gcloud scheduler jobs list --location=us-east1
```

### View Job Details
```bash
# Daily audit
gcloud scheduler jobs describe librarian-daily-audit --location=us-east1

# Weekly AI audit
gcloud scheduler jobs describe librarian-weekly-ai-audit --location=us-east1
```

### View Recent Executions
```bash
# Last 5 executions of daily audit
gcloud scheduler jobs executions list librarian-daily-audit \
  --location=us-east1 \
  --limit=5

# Last 5 executions of weekly AI audit
gcloud scheduler jobs executions list librarian-weekly-ai-audit \
  --location=us-east1 \
  --limit=5
```

### Check Audit Reports via API
```bash
# Get latest reports
curl 'https://bayit-plus-backend-znfki37vbq-ue.a.run.app/api/v1/admin/librarian/reports?limit=10' \
  -H "Authorization: Bearer $TOKEN"

# Check system status
curl 'https://bayit-plus-backend-znfki37vbq-ue.a.run.app/api/v1/admin/librarian/status' \
  -H "Authorization: Bearer $TOKEN"
```

---

## 🧪 Manual Testing

### Trigger Daily Audit Manually
```bash
gcloud scheduler jobs run librarian-daily-audit --location=us-east1
```

### Trigger Weekly AI Audit Manually
```bash
gcloud scheduler jobs run librarian-weekly-ai-audit --location=us-east1
```

### Trigger via API (requires admin token)
```bash
# Rule-based audit
curl -X POST https://bayit-plus-backend-znfki37vbq-ue.a.run.app/api/v1/admin/librarian/run-audit \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"audit_type":"manual","dry_run":false}'

# AI Agent audit
curl -X POST https://bayit-plus-backend-znfki37vbq-ue.a.run.app/api/v1/admin/librarian/run-audit \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"use_ai_agent":true,"dry_run":false}'
```

---

## ⚙️ Job Management

### Pause a Job
```bash
# Pause daily audit
gcloud scheduler jobs pause librarian-daily-audit --location=us-east1

# Pause weekly AI audit
gcloud scheduler jobs pause librarian-weekly-ai-audit --location=us-east1
```

### Resume a Job
```bash
# Resume daily audit
gcloud scheduler jobs resume librarian-daily-audit --location=us-east1

# Resume weekly AI audit
gcloud scheduler jobs resume librarian-weekly-ai-audit --location=us-east1
```

### Update Schedule
```bash
# Change daily audit to 3 AM
gcloud scheduler jobs update http librarian-daily-audit \
  --location=us-east1 \
  --schedule="0 3 * * *"

# Change weekly to run on Mondays instead
gcloud scheduler jobs update http librarian-weekly-ai-audit \
  --location=us-east1 \
  --schedule="0 3 * * 1"
```

### Delete a Job
```bash
# Delete daily audit
gcloud scheduler jobs delete librarian-daily-audit --location=us-east1

# Delete weekly AI audit
gcloud scheduler jobs delete librarian-weekly-ai-audit --location=us-east1
```

---

## 📧 Email Notifications

### Daily Rule-Based Audit
- **Always sends email** after completion
- Contains summary of items checked, issues found, fixes applied
- Includes AI insights in Hebrew
- Sent to: `admin@olorin.ai`

### Weekly AI Agent Audit
- **Sends email ONLY for major issues:**
  - Broken streams (>5 items)
  - Widespread misclassifications (>10 items)
  - Missing metadata at scale (>20 items)
  - Critical quality/availability issues

- **Email contains:**
  - Severity indicator (🚨 Critical or ⚠️ High)
  - Executive summary in Hebrew
  - Visual stats dashboard
  - List of critical issues with affected counts
  - Specific manual actions required
  - Beautiful HTML design (RTL for Hebrew)

### To Configure Email
Add to your Cloud Run environment variables:
```bash
SENDGRID_API_KEY=SG.your-key-here
ADMIN_EMAIL_ADDRESSES=admin@olorin.ai,team@bayitplus.com
```

Current configuration:
- ✅ `ADMIN_EMAIL_ADDRESSES` = `admin@olorin.ai`
- ❌ `SENDGRID_API_KEY` = Not configured (emails won't send until set)

---

## 🎯 Next Steps

### Immediate (Required for Email)
1. **Set up SendGrid:**
   ```bash
   # Get API key from SendGrid
   # Add to Cloud Run environment variables
   gcloud run services update bayit-plus-backend \
     --region=us-east1 \
     --set-env-vars=SENDGRID_API_KEY=SG.your-key-here
   ```

### Optional Enhancements
1. **Add more email recipients:**
   ```bash
   gcloud run services update bayit-plus-backend \
     --region=us-east1 \
     --set-env-vars=ADMIN_EMAIL_ADDRESSES=admin@olorin.ai,team@bayitplus.com
   ```

2. **Set up alerting for scheduler failures:**
   - Configure Cloud Monitoring alerts
   - Get notified if jobs fail

3. **Adjust schedules based on usage patterns:**
   - Monitor audit execution times
   - Optimize timing for your users

---

## 📈 Cost Breakdown

### Cloud Scheduler Costs
- **Price:** $0.10 per job per month
- **Jobs:** 2 jobs
- **Total:** $0.20/month

### Claude API Costs
- **Daily audits:** ~$0.30/month (30 days × $0.01)
- **Weekly AI audits:** ~$2.00/month (4 weeks × $0.50)
- **Total:** ~$2.30/month

### Cloud Run Costs
- **Executions:** 34 invocations/month (30 daily + 4 weekly)
- **Duration:** ~30 seconds avg
- **Total:** Minimal (within free tier)

### **Total Monthly Cost:** ~$2.50/month

---

## ✅ Verification Checklist

- [x] Cloud Scheduler API enabled
- [x] Service account has Cloud Run Invoker role
- [x] Daily audit job created (2 AM Israel time)
- [x] Weekly AI agent job created (Sundays 3 AM Israel time)
- [x] Both jobs in ENABLED state
- [x] OIDC authentication configured
- [x] Retry policy set (2 attempts max)
- [x] Timeout configured (10 minutes)
- [ ] SendGrid API key configured (required for emails)
- [ ] Test execution successful

---

## 🎉 What Happens Next

### Tomorrow (Jan 12, 2026)
- **2:00 AM Israel time:** First daily audit runs
- **3:00 AM Israel time:** First weekly AI agent audit runs
- You'll receive email reports (once SendGrid is configured)

### Every Day After
- **2:00 AM:** Daily rule-based audit
  - Fast scan of recent content
  - Email report always sent
  - Auto-fixes applied

### Every Sunday
- **3:00 AM:** Weekly AI agent audit
  - Claude decides what to investigate
  - Adapts strategy based on findings
  - Email sent ONLY if major issues found
  - Strategic recommendations provided

---

## 📞 Support & Troubleshooting

### Check if jobs are running
```bash
# View recent executions
gcloud scheduler jobs executions list librarian-daily-audit --location=us-east1

# Check Cloud Run logs
gcloud run logs read bayit-plus-backend --region=us-east1 --limit=50
```

### Common Issues

**Issue:** Jobs not triggering
- **Solution:** Verify jobs are ENABLED
- **Command:** `gcloud scheduler jobs list --location=us-east1`

**Issue:** Jobs failing with 401 Unauthorized
- **Solution:** Check service account has Cloud Run Invoker role
- **Command:** `gcloud run services get-iam-policy bayit-plus-backend --region=us-east1`

**Issue:** No emails received
- **Solution:** Configure SENDGRID_API_KEY environment variable
- **Command:** See "Next Steps" above

**Issue:** Jobs timing out
- **Solution:** Increase attempt deadline (currently 600s)
- **Command:** Update job with `--attempt-deadline=900s`

---

## 🔐 Security Notes

- ✅ Uses OIDC token authentication (no API keys in scheduler)
- ✅ Service account principle of least privilege
- ✅ Secure HTTPS endpoints only
- ✅ Admin-only API endpoints
- ✅ Audit trail in MongoDB
- ✅ Rollback capability for all fixes

---

**Setup completed by:** Claude Sonnet 4.5
**Date:** 2026-01-11 21:22 UTC
**Status:** Active and monitoring 🎉
