# 📋 Quick Reference - Cloud Scheduler

## 🚀 Deploy New Strategy

```bash
cd /Users/olorin/Documents/olorin/backend/scripts
./update_cloud_schedulers.sh
```

---

## 📅 Current Schedule

| Job | Schedule | Focus | Budget | Expected Outcome |
|-----|----------|-------|--------|------------------|
| **Weekly Comprehensive** | Sunday 3 AM | Full library audit | $15 | Metadata + Posters + Subtitles |
| **Daily Maintenance** | Every day 2 AM | Subtitles only | $5 | 20 subtitles/day |

---

## 🔍 Monitor Jobs

```bash
# List all jobs
gcloud scheduler jobs list --location=us-east1

# View job details
gcloud scheduler jobs describe librarian-weekly-comprehensive --location=us-east1

# View execution history
gcloud scheduler jobs executions list librarian-daily-maintenance --location=us-east1
```

---

## ▶️ Manual Trigger

```bash
# Trigger weekly comprehensive
gcloud scheduler jobs run librarian-weekly-comprehensive --location=us-east1

# Trigger daily maintenance
gcloud scheduler jobs run librarian-daily-maintenance --location=us-east1
```

---

## 📊 View Results

```bash
cd /Users/olorin/Documents/olorin/backend

# View latest audit report
poetry run python scripts/view_audit_results.py

# Check library health
poetry run python scripts/check_library_status.py
```

---

## ⏸️ Pause/Resume Jobs

```bash
# Pause a job
gcloud scheduler jobs pause librarian-daily-maintenance --location=us-east1

# Resume a job
gcloud scheduler jobs resume librarian-daily-maintenance --location=us-east1
```

---

## 🔧 Update Schedule

```bash
# Change daily maintenance to 3 AM
gcloud scheduler jobs update http librarian-daily-maintenance \
  --location=us-east1 \
  --schedule="0 3 * * *"

# Change weekly to run on Mondays
gcloud scheduler jobs update http librarian-weekly-comprehensive \
  --location=us-east1 \
  --schedule="0 3 * * 1"
```

---

## 📈 Check Logs

```bash
# View Cloud Run logs
gcloud run logs read bayit-backend-production --region=us-east1 --limit=100

# Filter for librarian logs
gcloud run logs read bayit-backend-production --region=us-east1 --limit=200 | grep -i librarian

# View errors only
gcloud run logs read bayit-backend-production --region=us-east1 --limit=200 | grep -i error
```

---

## 🧪 Test Locally

```bash
cd /Users/olorin/Documents/olorin/backend/scripts

# Interactive test
./test_scheduler_strategy.sh

# Or run directly
poetry run python trigger_audit.py --iterations 200 --budget 15.0  # Weekly
poetry run python trigger_audit.py --iterations 100 --budget 5.0   # Daily
```

---

## 💰 Cost Tracking

| Component | Cost |
|-----------|------|
| Weekly Comprehensive (4×/month) | $12-20 |
| Daily Maintenance (30×/month) | $30-60 |
| Cloud Scheduler (2 jobs) | $0.20 |
| **Total** | **$42-80/month** |

---

## 🎯 Expected Progress

### Week 1:
- ✅ 140 subtitles acquired
- ✅ 10-20 posters fixed
- ✅ 10-20 metadata updates

### Week 2:
- ✅ 280 total subtitles (85% coverage)
- ✅ All posters fixed
- ✅ 50-70% metadata complete

### Week 3:
- ✅ 330+ total subtitles (100% coverage)
- ✅ All metadata complete
- ✅ Library fully healthy!

---

## 📞 Quick Help

**Jobs not running?**
```bash
gcloud scheduler jobs list --location=us-east1
# Check if ENABLED, if not: gcloud scheduler jobs resume JOB_NAME --location=us-east1
```

**Jobs failing?**
```bash
gcloud run logs read bayit-backend-production --region=us-east1 --limit=200 | grep -i error
```

**Want to change config?**
Edit `scripts/update_cloud_schedulers.sh` and re-run it.

---

## 📚 Full Documentation

- **Strategy Details:** `SCHEDULER_STRATEGY_UPDATED.md`
- **Audit Plan:** `AUDIT_PLAN_EXECUTED.md`
- **Scripts README:** `scripts/README_AUDITS.md`
- **Original Setup:** `SCHEDULER_SETUP_COMPLETE.md`
