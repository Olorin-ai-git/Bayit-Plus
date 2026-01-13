# 🔄 Cloud Scheduler Strategy - UPDATED

**Date:** 2026-01-13  
**Status:** Ready to Deploy  
**Previous Strategy:** Daily rule-based + Weekly AI agent  
**New Strategy:** Weekly comprehensive + Daily maintenance

---

## 📊 Why the Change?

### **Old Strategy (Deprecated):**
- ❌ Daily rule-based audits (limited scope, ~20 items)
- ❌ Weekly AI agent (only 50 iterations, $1 budget)
- ❌ Not optimized for subtitle acquisition
- ❌ Didn't leverage AI agent's full capabilities

### **New Strategy (Improved):**
- ✅ Weekly comprehensive scan (200 iterations, $15 budget)
- ✅ Daily subtitle maintenance (100 iterations, $5 budget)
- ✅ Optimized for OpenSubtitles quota (20/day)
- ✅ AI agent makes strategic decisions
- ✅ Focused on measurable outcomes

---

## 🎯 New Scheduler Jobs

### **Job 1: Weekly Comprehensive Library Scan**

**Name:** `librarian-weekly-comprehensive`  
**Schedule:** Every Sunday at 3:00 AM Israel time  
**Cron:** `0 3 * * 0`  
**Configuration:**
```json
{
  "use_ai_agent": true,
  "dry_run": false,
  "max_iterations": 200,
  "budget_limit_usd": 15.0,
  "audit_type": "weekly_comprehensive"
}
```

**What It Does:**
1. **Scans 150-200 items** across all categories
2. **Fixes all missing posters** using TMDB data
3. **Fixes all missing metadata** (IMDB ratings, descriptions, cast, etc.)
4. **Cleans dirty titles** (removes .mp4, 1080p, [YTS], etc.)
5. **Validates streaming URLs** (checks for broken links)
6. **Extracts embedded subtitles** from video files (unlimited!)
7. **Downloads 20 external subtitles** from OpenSubtitles
8. **Identifies systematic issues** for manual intervention
9. **Provides strategic recommendations** for the week ahead

**Expected Results:**
- ✅ 10-20 posters fixed
- ✅ 10-20 metadata updates
- ✅ 5-10 titles cleaned
- ✅ 20-50 embedded subtitles extracted
- ✅ 20 external subtitles downloaded
- ✅ Comprehensive health report

**Cost:** ~$3-5 per run = ~$12-20/month

---

### **Job 2: Daily Subtitle Maintenance Scan**

**Name:** `librarian-daily-maintenance`  
**Schedule:** Every day at 2:00 AM Israel time  
**Cron:** `0 2 * * *`  
**Configuration:**
```json
{
  "use_ai_agent": true,
  "dry_run": false,
  "max_iterations": 100,
  "budget_limit_usd": 5.0,
  "audit_type": "daily_maintenance"
}
```

**What It Does:**
1. **Focuses EXCLUSIVELY on subtitles**
2. **Checks 50-100 items** for missing EN/HE/ES subtitles
3. **Extracts embedded subtitles** from video files (unlimited!)
4. **Downloads 20 external subtitles** from OpenSubtitles (daily quota)
5. **Prioritizes recent content** and high-view items
6. **Uses batch operations** for efficiency
7. **Tracks progress** toward 100% subtitle coverage

**Expected Results:**
- ✅ 20-50 embedded subtitles extracted
- ✅ 20 external subtitles downloaded
- ✅ Progress report on subtitle completion
- ✅ Quota management (respects 20/day limit)

**Cost:** ~$1-2 per run = ~$30-60/month

---

## 📅 Complete Schedule

| Day | Time | Job | Focus | Iterations | Budget | Expected Outcome |
|-----|------|-----|-------|------------|--------|------------------|
| **Sunday** | 3:00 AM | Weekly Comprehensive | Full library audit | 200 | $15 | Metadata + Posters + Subtitles |
| **Monday** | 2:00 AM | Daily Maintenance | Subtitles only | 100 | $5 | 20 subtitles downloaded |
| **Tuesday** | 2:00 AM | Daily Maintenance | Subtitles only | 100 | $5 | 20 subtitles downloaded |
| **Wednesday** | 2:00 AM | Daily Maintenance | Subtitles only | 100 | $5 | 20 subtitles downloaded |
| **Thursday** | 2:00 AM | Daily Maintenance | Subtitles only | 100 | $5 | 20 subtitles downloaded |
| **Friday** | 2:00 AM | Daily Maintenance | Subtitles only | 100 | $5 | 20 subtitles downloaded |
| **Saturday** | 2:00 AM | Daily Maintenance | Subtitles only | 100 | $5 | 20 subtitles downloaded |

**Weekly Totals:**
- **Subtitle Downloads:** 140 per week (20 on Sunday + 20 × 6 days)
- **Items Scanned:** 450-500 per week
- **Cost:** ~$45-50 per week = ~$180-200/month

---

## 💰 Cost Analysis

### **Monthly Breakdown:**

| Component | Cost |
|-----------|------|
| Weekly Comprehensive (4× per month) | $12-20 |
| Daily Maintenance (30× per month) | $30-60 |
| Cloud Scheduler (2 jobs) | $0.20 |
| MongoDB Storage (~5GB reports) | $0.10 |
| **Total** | **$42-80/month** |

### **Cost per Outcome:**

| Outcome | Cost |
|---------|------|
| Per poster fixed | ~$0.20 |
| Per metadata update | ~$0.20 |
| Per subtitle downloaded | ~$0.10 |
| Per item fully audited | ~$0.05 |

### **ROI:**
- **Input:** ~$50/month
- **Output:** 
  - 600+ items audited per month
  - 80-120 posters/metadata fixed per month
  - 560 subtitles downloaded per month
  - 100% library coverage in 2-3 weeks

---

## 🚀 Deployment Instructions

### **Step 1: Update Cloud Scheduler Jobs**

```bash
cd /Users/olorin/Documents/Bayit-Plus/backend/scripts
./update_cloud_schedulers.sh
```

This script will:
1. Delete old jobs (`librarian-daily-audit`, `librarian-weekly-ai-audit`)
2. Create new jobs (`librarian-weekly-comprehensive`, `librarian-daily-maintenance`)
3. Configure proper limits and budgets
4. Set up retry policies

### **Step 2: Verify Deployment**

```bash
# List all scheduler jobs
gcloud scheduler jobs list --location=us-east1

# Should show:
# - librarian-weekly-comprehensive (ENABLED)
# - librarian-daily-maintenance (ENABLED)
```

### **Step 3: Test Manually**

```bash
# Test daily maintenance scan
gcloud scheduler jobs run librarian-daily-maintenance --location=us-east1

# Monitor logs
gcloud run logs read bayit-plus-backend --region=us-east1 --limit=100 --format=json | jq -r '.textPayload' | grep -i librarian
```

### **Step 4: Monitor First Week**

```bash
# Check audit results
curl -H "Authorization: Bearer $TOKEN" \
  https://bayit-plus-backend-znfki37vbq-ue.a.run.app/api/v1/admin/librarian/status

# View latest audit report
cd /Users/olorin/Documents/Bayit-Plus/backend
poetry run python scripts/view_audit_results.py

# Check library health
poetry run python scripts/check_library_status.py
```

---

## 📊 Expected Timeline to 100% Coverage

### **Starting Point (Jan 13, 2026):**
- Total Items: 110
- Missing Posters: 1
- Missing IMDB Ratings: 109
- Missing Subtitles: 110 (100%)

### **Week 1 (Jan 13-19):**
- **Sunday:** Comprehensive scan fixes 10-20 posters, 10-20 metadata, downloads 20 subtitles
- **Mon-Sat:** Daily scans download 120 more subtitles (20/day × 6)
- **Week 1 Total:** 140 subtitles acquired

**Status after Week 1:**
- Posters: 100% complete ✅
- IMDB Ratings: 20-30% complete ⏳
- Subtitles: 42% complete (140/330) ⏳

### **Week 2 (Jan 20-26):**
- **Sunday:** Comprehensive scan fixes remaining metadata, downloads 20 subtitles
- **Mon-Sat:** Daily scans download 120 more subtitles
- **Week 2 Total:** 140 more subtitles

**Status after Week 2:**
- Posters: 100% complete ✅
- IMDB Ratings: 50-70% complete ⏳
- Subtitles: 85% complete (280/330) ⏳

### **Week 3 (Jan 27-Feb 2):**
- **Sunday:** Comprehensive scan completes metadata, downloads 20 subtitles
- **Mon-Tue:** Daily scans download 40 more subtitles
- **Week 3 Total:** 60 more subtitles

**Status after Week 3:**
- Posters: 100% complete ✅
- IMDB Ratings: 100% complete ✅
- Subtitles: 100% complete ✅

**🎉 FULL LIBRARY COVERAGE ACHIEVED IN 3 WEEKS!**

---

## 🎯 AI Agent Instructions

The AI agent now receives **audit-type-specific instructions**:

### **Weekly Comprehensive:**
```
Your mission: Conduct a THOROUGH audit of the entire library focusing on:
1. Metadata completeness - IMDB ratings, TMDB data, posters, descriptions
2. Content quality - Title cleanliness, categorization accuracy
3. Streaming health - URL validation, availability checks
4. Subtitle coverage - Check for EN/HE/ES subtitles, extract embedded tracks
5. Strategic planning - Identify systematic issues requiring batch fixes

Strategy:
- Scan 150-200 items across all categories
- Fix all missing posters and metadata
- Extract all embedded subtitles (unlimited, free!)
- Use OpenSubtitles quota strategically (20 downloads max)
- Provide comprehensive recommendations for next week

Budget: 200 iterations, $15
```

### **Daily Maintenance:**
```
Your mission: Focus EXCLUSIVELY on subtitle acquisition and maintenance:
1. Priority: Find content missing required subtitles (EN/HE/ES)
2. Extract embedded subtitles from video files (unlimited, free!)
3. Download external subtitles from OpenSubtitles (20/day quota)
4. Prioritize most recent content and high-view items
5. Track progress toward 100% subtitle coverage

Strategy:
- Check 50-100 items for missing subtitles
- Extract ALL embedded subtitles found
- Download 20 subtitles from OpenSubtitles (daily quota)
- Use batch_download_subtitles for efficiency
- Report progress toward subtitle completion goal

Budget: 100 iterations, $5
```

---

## 📈 Success Metrics

### **Weekly Comprehensive Scan:**
- ✅ Items scanned: 150-200
- ✅ Posters fixed: 10-20
- ✅ Metadata updates: 10-20
- ✅ Titles cleaned: 5-10
- ✅ Embedded subtitles extracted: 20-50
- ✅ External subtitles downloaded: 20
- ✅ Comprehensive report generated

### **Daily Maintenance Scan:**
- ✅ Items checked: 50-100
- ✅ Embedded subtitles extracted: 20-50
- ✅ External subtitles downloaded: 20
- ✅ Quota managed properly
- ✅ Progress report generated

### **Overall Library Health (Target):**
- ✅ Posters: 100% coverage
- ✅ Metadata: 100% coverage
- ✅ Subtitles: 100% coverage (EN/HE/ES)
- ✅ Streaming URLs: 100% validated
- ✅ Titles: 100% clean

---

## 🔧 Troubleshooting

### **Jobs Not Running:**
```bash
# Check job status
gcloud scheduler jobs list --location=us-east1

# Check if paused
gcloud scheduler jobs describe librarian-daily-maintenance --location=us-east1

# Resume if paused
gcloud scheduler jobs resume librarian-daily-maintenance --location=us-east1
```

### **Jobs Failing:**
```bash
# View execution history
gcloud scheduler jobs executions list librarian-daily-maintenance --location=us-east1

# Check Cloud Run logs
gcloud run logs read bayit-plus-backend --region=us-east1 --limit=200 | grep -i error
```

### **Quota Exhausted:**
The AI agent automatically manages the OpenSubtitles quota (20/day). If quota is exhausted, it will:
1. Stop downloading external subtitles
2. Continue extracting embedded subtitles (unlimited)
3. Report quota status in audit summary
4. Resume downloads the next day

### **Budget Exceeded:**
If the AI agent hits the budget limit before completing the audit:
1. It will stop gracefully
2. Save progress to database
3. Report what was completed
4. Resume next scheduled run

---

## 📞 Support

**Questions or Issues?**

1. **Check logs:** `gcloud run logs read bayit-plus-backend --region=us-east1`
2. **View audit status:** `poetry run python scripts/view_audit_results.py`
3. **Check library health:** `poetry run python scripts/check_library_status.py`
4. **Review this document:** `backend/SCHEDULER_STRATEGY_UPDATED.md`

**Need to adjust schedule?**

Edit `scripts/update_cloud_schedulers.sh` and re-run:
```bash
cd /Users/olorin/Documents/Bayit-Plus/backend/scripts
./update_cloud_schedulers.sh
```

---

## 🎉 Summary

**Old Strategy:**
- ❌ Limited scope (20-50 items per audit)
- ❌ Low budget ($1 per audit)
- ❌ Not optimized for subtitles
- ❌ Slow progress toward 100% coverage

**New Strategy:**
- ✅ Comprehensive scope (150-200 items per week)
- ✅ Adequate budget ($15 weekly, $5 daily)
- ✅ Optimized for subtitle acquisition (140/week)
- ✅ Fast progress toward 100% coverage (3 weeks)

**Deploy now to start the improved audit strategy!** 🚀

```bash
cd /Users/olorin/Documents/Bayit-Plus/backend/scripts
./update_cloud_schedulers.sh
```
