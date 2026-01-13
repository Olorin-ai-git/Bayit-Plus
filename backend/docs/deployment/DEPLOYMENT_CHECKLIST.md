# ✅ Cloud Scheduler Deployment Checklist

**Date:** 2026-01-13  
**Task:** Deploy improved scheduler strategy to Google Cloud

---

## 📋 Pre-Deployment Checklist

- [ ] **1. Review Strategy**
  - Read `SCHEDULER_STRATEGY_UPDATED.md`
  - Understand new job configurations
  - Verify budget allocation ($42-80/month)

- [ ] **2. Test Locally (Optional but Recommended)**
  ```bash
  cd /Users/olorin/Documents/Bayit-Plus/backend/scripts
  ./test_scheduler_strategy.sh
  ```
  - [ ] Test weekly comprehensive scan
  - [ ] Test daily maintenance scan
  - [ ] Verify audit results with `view_audit_results.py`

- [ ] **3. Verify Google Cloud Access**
  ```bash
  gcloud auth list
  gcloud config get-value project
  ```
  - [ ] Authenticated with correct account
  - [ ] Project set to `bayit-plus`

- [ ] **4. Check Current Jobs**
  ```bash
  gcloud scheduler jobs list --location=us-east1
  ```
  - [ ] Note existing jobs (will be replaced)

---

## 🚀 Deployment Steps

### **Step 1: Deploy New Scheduler Jobs**

```bash
cd /Users/olorin/Documents/Bayit-Plus/backend/scripts
./update_cloud_schedulers.sh
```

**Expected Output:**
```
✅ Created: librarian-weekly-comprehensive
✅ Created: librarian-daily-maintenance
✅ Deleted old: librarian-daily-audit
✅ Deleted old: librarian-weekly-ai-audit
```

- [ ] Script completed successfully
- [ ] No errors in output

### **Step 2: Verify Deployment**

```bash
gcloud scheduler jobs list --location=us-east1 --filter="name:librarian"
```

**Expected:**
- [ ] `librarian-weekly-comprehensive` - ENABLED - `0 3 * * 0`
- [ ] `librarian-daily-maintenance` - ENABLED - `0 2 * * *`
- [ ] Old jobs deleted (not in list)

### **Step 3: Test Manual Trigger**

```bash
# Trigger daily maintenance (smaller, faster)
gcloud scheduler jobs run librarian-daily-maintenance --location=us-east1
```

- [ ] Job triggered successfully
- [ ] Wait 2-5 minutes for completion

### **Step 4: Check Execution**

```bash
# View execution history
gcloud scheduler jobs executions list librarian-daily-maintenance --location=us-east1 --limit=5
```

- [ ] Latest execution shows SUCCESS
- [ ] No errors in execution log

### **Step 5: View Audit Results**

```bash
cd /Users/olorin/Documents/Bayit-Plus/backend

# View latest audit
poetry run python scripts/view_audit_results.py

# Check library status
poetry run python scripts/check_library_status.py
```

- [ ] Audit report generated
- [ ] Items scanned (50-100 expected)
- [ ] Actions taken (subtitles downloaded, etc.)
- [ ] No critical errors

---

## 📊 Post-Deployment Verification

### **Immediate (Today):**

- [ ] **Jobs are enabled**
  ```bash
  gcloud scheduler jobs list --location=us-east1
  ```

- [ ] **No execution errors**
  ```bash
  gcloud run logs read bayit-plus-backend --region=us-east1 --limit=100 | grep -i error
  ```

- [ ] **Audit reports in database**
  ```bash
  poetry run python scripts/view_audit_results.py
  ```

### **This Week:**

- [ ] **Monday 2 AM:** Daily maintenance runs successfully
- [ ] **Tuesday 2 AM:** Daily maintenance runs successfully
- [ ] **Wednesday 2 AM:** Daily maintenance runs successfully
- [ ] **Thursday 2 AM:** Daily maintenance runs successfully
- [ ] **Friday 2 AM:** Daily maintenance runs successfully
- [ ] **Saturday 2 AM:** Daily maintenance runs successfully
- [ ] **Sunday 3 AM:** Weekly comprehensive runs successfully

### **Weekly Checks:**

- [ ] **Review audit reports**
  ```bash
  poetry run python scripts/view_audit_results.py
  ```

- [ ] **Check library progress**
  ```bash
  poetry run python scripts/check_library_status.py
  ```

- [ ] **Monitor costs**
  - Check Google Cloud billing dashboard
  - Verify costs are within budget ($42-80/month)

- [ ] **Verify subtitle progress**
  - Week 1: ~140 subtitles acquired
  - Week 2: ~280 subtitles total (85% coverage)
  - Week 3: ~330+ subtitles total (100% coverage)

---

## 🎯 Success Criteria

### **Week 1 Goals:**
- [ ] 140+ subtitles downloaded
- [ ] 10-20 posters fixed
- [ ] 10-20 metadata updates
- [ ] No job failures
- [ ] Costs within budget

### **Week 2 Goals:**
- [ ] 280+ total subtitles (85% coverage)
- [ ] All posters fixed (100%)
- [ ] 50-70% metadata complete
- [ ] Consistent job execution

### **Week 3 Goals:**
- [ ] 330+ total subtitles (100% coverage)
- [ ] All metadata complete (100%)
- [ ] Library fully healthy
- [ ] Automated maintenance running smoothly

---

## 🔧 Troubleshooting

### **Issue: Jobs not running**

**Check:**
```bash
gcloud scheduler jobs describe librarian-daily-maintenance --location=us-east1
```

**Solution:**
```bash
# If paused, resume
gcloud scheduler jobs resume librarian-daily-maintenance --location=us-east1
```

- [ ] Issue resolved

### **Issue: Jobs failing**

**Check:**
```bash
gcloud scheduler jobs executions list librarian-daily-maintenance --location=us-east1 --limit=10
gcloud run logs read bayit-plus-backend --region=us-east1 --limit=200 | grep -i error
```

**Common causes:**
- [ ] Service account permissions
- [ ] Cloud Run service down
- [ ] API keys missing (OpenSubtitles, TMDB)
- [ ] Budget limit reached

**Solution:**
- Review logs for specific error
- Check service account has Cloud Run Invoker role
- Verify environment variables in Cloud Run

- [ ] Issue resolved

### **Issue: No subtitles being downloaded**

**Check:**
```bash
poetry run python scripts/view_audit_results.py
```

**Look for:**
- Quota exhausted messages
- OpenSubtitles API errors
- No items found with missing subtitles

**Solution:**
- Verify OpenSubtitles API key is valid
- Check quota hasn't been exhausted (20/day limit)
- Ensure content has IMDB IDs for subtitle search

- [ ] Issue resolved

---

## 📞 Rollback Plan

**If something goes wrong:**

### **Option 1: Pause New Jobs**
```bash
gcloud scheduler jobs pause librarian-weekly-comprehensive --location=us-east1
gcloud scheduler jobs pause librarian-daily-maintenance --location=us-east1
```

### **Option 2: Restore Old Jobs**
```bash
# Recreate old daily audit
gcloud scheduler jobs create http librarian-daily-audit \
  --location=us-east1 \
  --schedule="0 2 * * *" \
  --time-zone="Asia/Jerusalem" \
  --uri="https://bayit-plus-backend-znfki37vbq-ue.a.run.app/api/v1/internal/librarian/scheduled-audit" \
  --http-method=POST \
  --headers="Content-Type=application/json,User-Agent=Google-Cloud-Scheduler" \
  --message-body='{"audit_type":"daily_incremental","dry_run":false}' \
  --oidc-service-account-email="624470113582-compute@developer.gserviceaccount.com" \
  --oidc-token-audience="https://bayit-plus-backend-znfki37vbq-ue.a.run.app"

# Recreate old weekly audit
gcloud scheduler jobs create http librarian-weekly-ai-audit \
  --location=us-east1 \
  --schedule="0 3 * * 0" \
  --time-zone="Asia/Jerusalem" \
  --uri="https://bayit-plus-backend-znfki37vbq-ue.a.run.app/api/v1/internal/librarian/scheduled-audit" \
  --http-method=POST \
  --headers="Content-Type=application/json,User-Agent=Google-Cloud-Scheduler" \
  --message-body='{"use_ai_agent":true,"dry_run":false,"max_iterations":50,"budget_limit_usd":1.0}' \
  --oidc-service-account-email="624470113582-compute@developer.gserviceaccount.com" \
  --oidc-token-audience="https://bayit-plus-backend-znfki37vbq-ue.a.run.app"
```

- [ ] Rollback completed (if needed)

---

## 📚 Reference Documents

- **Full Strategy:** `SCHEDULER_STRATEGY_UPDATED.md`
- **Quick Reference:** `QUICK_REFERENCE_SCHEDULER.md`
- **Upgrade Summary:** `SCHEDULER_UPGRADE_COMPLETE.md`
- **Scripts Guide:** `scripts/README_AUDITS.md`
- **Audit Results:** `AUDIT_PLAN_EXECUTED.md`

---

## ✅ Final Sign-Off

**Deployment Completed By:** _________________  
**Date:** _________________  
**Time:** _________________

**Verification:**
- [ ] All jobs deployed successfully
- [ ] Test execution passed
- [ ] Audit reports generated
- [ ] No errors in logs
- [ ] Documentation reviewed
- [ ] Team notified

**Notes:**
_____________________________________________________________________________
_____________________________________________________________________________
_____________________________________________________________________________

---

## 🎉 Deployment Complete!

**Next Steps:**
1. Monitor jobs over the next week
2. Check audit reports daily
3. Track progress toward 100% library health
4. Celebrate success in 3 weeks! 🎊

**Questions?**
- Review `SCHEDULER_STRATEGY_UPDATED.md`
- Check `QUICK_REFERENCE_SCHEDULER.md`
- Run `poetry run python scripts/check_library_status.py`
