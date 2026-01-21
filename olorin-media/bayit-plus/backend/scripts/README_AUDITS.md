# Librarian AI Agent - Comprehensive Audit Guide

## 🎯 Problem: Your First Audit Only Checked 75 Items

The AI agent has **safety limits** to prevent runaway costs:
- **Max 50 tool calls** per audit (default)
- **$1-10 budget limit** per audit
- **20 subtitle downloads/day** (OpenSubtitles free tier)

Your library likely has **hundreds of items**, so one audit isn't enough!

## ✅ Solution: Multi-Day Audit Strategy

### **Phase 1: Metadata & Posters (Day 1)**
Run a comprehensive audit focused on metadata and posters:
```bash
cd /Users/olorin/Documents/olorin/backend/scripts
./run_comprehensive_audit.sh

# Or with custom limits:
MAX_ITERATIONS=200 BUDGET_LIMIT=15.0 ./run_comprehensive_audit.sh
```

**This will:**
- Check 150-200 items
- Fix missing posters
- Fix missing metadata (IMDB ratings, TMDB data)
- Fix miscategorizations
- Extract embedded subtitles (unlimited, free!)
- Use up to 20 OpenSubtitles downloads

**Cost:** ~$5-10 in Claude API calls

---

### **Phase 2: Subtitles (Days 2-N)**
Run daily subtitle-focused audits to acquire all missing subtitles:

```bash
# Day 2
./run_subtitle_audit.sh

# Day 3
./run_subtitle_audit.sh

# Day 4...
# Keep running daily until all content has EN/HE/ES subtitles
```

**Each run will:**
- Check 50-100 items missing subtitles
- Extract embedded subtitles (free, unlimited)
- Download 20 external subtitles from OpenSubtitles
- Prioritize most recent content
- Track quota usage

**Cost per run:** ~$2-5 in Claude API calls

---

## 🚀 Quick Start

### **Option 1: Interactive Scripts (Recommended)**

```bash
cd backend/scripts

# Full library audit (metadata + posters + subtitles)
./run_comprehensive_audit.sh

# Subtitle-only focused audit
./run_subtitle_audit.sh
```

### **Option 2: Simple API Call**

```bash
# Get admin token first
TOKEN=$(curl -X POST http://localhost:8000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"your-admin@email.com","password":"your-password"}' \
  | jq -r '.access_token')

# Run comprehensive audit
ADMIN_TOKEN=$TOKEN ./run_audit_simple.sh 200 15.0 false
```

### **Option 3: Direct curl**

```bash
curl -X POST http://localhost:8000/api/v1/admin/librarian/run-audit \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "use_ai_agent": true,
    "dry_run": false,
    "max_iterations": 200,
    "budget_limit_usd": 15.0
  }'
```

---

## 📊 Configuration Options

| Parameter | Default | Recommended | Max | Description |
|-----------|---------|-------------|-----|-------------|
| `max_iterations` | 50 | 150-200 | 500 | Max tool calls Claude can make |
| `budget_limit_usd` | 1.0 | 10-15 | 50 | Max Claude API cost |
| `dry_run` | false | false | - | If true, no changes (test mode) |

**Rule of thumb:**
- **~2-3 tool calls per item** checked
- **$0.03-0.05 per item** in Claude API costs
- **200 iterations = ~75-100 items** thoroughly audited

---

## 🎬 Subtitle Quota Strategy

### **Understanding the Limits**

**Free (Unlimited):**
- ✅ Extracting embedded subtitles from video files
- ✅ Scanning video files for subtitle tracks
- ✅ Verifying existing subtitles

**Limited (20/day):**
- ❌ Downloading from OpenSubtitles.com

### **Optimal Strategy**

**Week 1:**
```bash
# Monday: Comprehensive audit
MAX_ITERATIONS=200 BUDGET_LIMIT=15.0 ./run_comprehensive_audit.sh
# Result: ~100 items checked, 20 subtitles downloaded

# Tuesday-Friday: Daily subtitle runs
./run_subtitle_audit.sh  # Each day downloads 20 more
# Result: 4 × 20 = 80 more subtitles

# Week 1 total: 100 subtitles acquired
```

**Week 2:**
```bash
# Continue daily subtitle audits
./run_subtitle_audit.sh  # Every day
# Result: 7 × 20 = 140 more subtitles
```

**Math:**
- 300 videos missing subtitles
- 20 downloads/day
- **15 days to complete** (300 ÷ 20)

---

## 📈 Monitoring Progress

### **Check Current Status**
```bash
# Get status
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/v1/admin/librarian/status | jq

# Check subtitle quota
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/v1/admin/librarian/subtitle-quota | jq
```

### **View Audit Logs**
```bash
# Real-time monitoring
tail -f /Users/olorin/Documents/olorin/backend/.cursor/debug.log

# Filter for important events
grep -E "(SUCCESS|ERROR|TOOL)" backend/.cursor/debug.log | tail -100
```

---

## 💡 Pro Tips

### **1. Run Multiple Audits Per Day**
```bash
# Morning: Focus on metadata
MAX_ITERATIONS=100 ./run_comprehensive_audit.sh

# Evening: Focus on subtitles (uses remaining quota)
./run_subtitle_audit.sh
```

### **2. Test First with Dry Run**
```bash
DRY_RUN=true ./run_comprehensive_audit.sh
# Reviews issues without making changes
```

### **3. Increase Budget for Large Libraries**
```bash
# For 500+ items, use higher limits
MAX_ITERATIONS=500 BUDGET_LIMIT=30.0 ./run_comprehensive_audit.sh
```

### **4. Check Quota Before Running**
```bash
# See how many downloads remain today
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/v1/admin/librarian/subtitle-quota
```

---

## 🛠️ Troubleshooting

### **"Server is not running"**
```bash
cd /Users/olorin/Documents/olorin/backend
poetry run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### **"Authentication failed"**
Make sure you're using an **admin** user account. Regular users can't trigger audits.

### **"Quota exhausted"**
You've used all 20 OpenSubtitles downloads for today. Run again tomorrow, or focus on extracting embedded subtitles (unlimited).

### **"Budget limit reached"**
The audit stopped because it hit the cost limit. Increase `budget_limit_usd` to allow more work.

---

## 📋 Summary

**To fully audit your library:**

1. ✅ **Day 1:** Run comprehensive audit (metadata, posters, 20 subtitles)
   ```bash
   ./run_comprehensive_audit.sh
   ```

2. ✅ **Days 2-15:** Run daily subtitle audits (20 subtitles/day)
   ```bash
   ./run_subtitle_audit.sh
   ```

3. ✅ **Monitor progress:** Check logs and quota status
   ```bash
   curl -H "Authorization: Bearer $TOKEN" \
     http://localhost:8000/api/v1/admin/librarian/status | jq
   ```

**Result:** Full library coverage in 2-3 weeks! 🎉
