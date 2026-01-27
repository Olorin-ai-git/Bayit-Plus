# Cost Dashboard Deployment Checklist

**Implementation Date**: 2026-01-26
**Version**: 1.0
**Status**: Ready for Deployment

---

## Pre-Deployment Verification

### Backend Preparation

- [ ] **Dependencies Installed**
  ```bash
  cd backend
  poetry install
  ```

- [ ] **Environment Variables Configured**
  ```bash
  # Add to .env or Cloud Secrets:
  INFRA_GCP_MONTHLY=2000
  INFRA_MONGODB_MONTHLY=500
  INFRA_FIREBASE_MONTHLY=300
  INFRA_SENTRY_MONTHLY=100
  INFRA_CDN_MONTHLY=200

  THIRDPARTY_STRIPE_PERCENT=0.029
  THIRDPARTY_STRIPE_FIXED=0.30
  THIRDPARTY_ELEVENLABS_OVERAGE=0.05
  THIRDPARTY_TMDB_COST=0.0
  THIRDPARTY_TWILIO_SMS_COST=0.0075

  COST_AGGREGATION_INTERVAL=60
  COST_ARCHIVAL_AGE=365

  GCP_BILLING_ENABLED=true
  GCP_BILLING_ACCOUNT_ID=<from-secrets>

  MONGODB_BILLING_ENABLED=true
  MONGODB_ORG_ID=<from-secrets>
  MONGODB_API_KEY=<from-secrets>
  ```

- [ ] **Database Migrations**
  ```bash
  # Schema is locked - no migrations needed
  # Verify CostBreakdown and UserCostBreakdown collections exist
  poetry run python -c "from app.models.cost_breakdown import CostBreakdown; print('Models loaded successfully')"
  ```

- [ ] **Background Jobs Registered**
  ```bash
  # Verify in app/services/startup/background_tasks.py
  grep -n "cost_rollup_job\|cost_reconciliation_job\|cost_archival_job" app/services/startup/background_tasks.py
  ```

- [ ] **Backend Server Starts**
  ```bash
  poetry run python -m app.local_server
  # Should start without errors on port 8090
  # Verify: curl http://localhost:8090/health
  ```

- [ ] **API Endpoints Accessible**
  ```bash
  # Test each endpoint
  curl -X GET "http://localhost:8090/admin/costs/overview?scope=system_wide" \
    -H "Authorization: Bearer <token>" \
    -H "X-User-Role: SUPER_ADMIN"
  ```

### Frontend Preparation

- [ ] **Dependencies Installed**
  ```bash
  cd web
  npm install
  ```

- [ ] **Recharts Added to package.json**
  ```bash
  grep "recharts" package.json
  # Should show: "recharts": "^2.12.0"
  ```

- [ ] **Build Succeeds**
  ```bash
  npm run build
  # Should complete without errors
  ```

- [ ] **Dev Server Starts**
  ```bash
  npm run dev
  # Should start on port 3200 without errors
  ```

- [ ] **Components Render**
  ```bash
  # Navigate to http://localhost:3200/admin/costs
  # Should display:
  # - Cost Dashboard page header
  # - P&L Summary section
  # - Key Metrics grid
  # - Tab navigation
  # - Real-time status badge
  ```

### Code Quality

- [ ] **Backend Tests Pass**
  ```bash
  cd backend
  poetry run pytest test/integration/test_cost_dashboard_api.py -v
  # Should pass 30+ tests
  ```

- [ ] **Frontend Tests Pass**
  ```bash
  cd web
  npm test -- costDashboard
  # Should pass 32+ tests
  ```

- [ ] **Test Coverage >= 87%**
  ```bash
  # Backend
  poetry run pytest --cov=app.api.routes.admin.cost_dashboard --cov-report=term-missing

  # Frontend
  npm run test:coverage -- --testPathPattern=costDashboard
  ```

- [ ] **Linting Passes**
  ```bash
  # Backend
  poetry run black --check .
  poetry run isort --check .
  poetry run mypy .

  # Frontend
  npm run lint
  ```

- [ ] **No Console Errors**
  ```bash
  # Check browser console for errors
  # Run with: npm run dev:verbose
  # Should have no errors, only info/debug messages
  ```

---

## Deployment Steps

### Database Setup

```bash
# Create collections if not exists
# Collections auto-created by Beanie on first document insert

# Add indexes
# Indexes defined in model, auto-created by Beanie

# Verify with:
mongo
> use bayit_plus
> db.cost_breakdown.getIndexes()
# Should show compound index on (period_type, period_start)
```

### Backend Deployment

```bash
# 1. Build Docker image (if using containers)
docker build -t bayit-plus-backend:latest .

# 2. Deploy to Cloud Run
gcloud run deploy bayit-plus-backend \
  --image bayit-plus-backend:latest \
  --region us-central1 \
  --env-vars-file .env.prod

# 3. Verify deployment
curl https://bayit-plus-backend-service/health
```

### Frontend Deployment

```bash
# 1. Build production bundle
npm run build

# 2. Deploy to Firebase Hosting
firebase deploy --only hosting

# 3. Verify deployment
curl https://bayit-plus.firebaseapp.com
```

### Register Background Jobs

```bash
# Background jobs auto-start when backend service starts
# They're registered in APScheduler in app/services/startup/background_tasks.py

# Verify jobs are running:
# Check logs for:
# - "Starting background jobs..."
# - "Registered: cost_rollup_job (0 0 * * *)"
# - "Registered: cost_reconciliation_job (0 1 * * *)"
# - "Registered: cost_archival_job (0 2 1 * *)"
```

---

## Post-Deployment Verification

### Endpoint Testing

- [ ] **Overview Endpoint**
  ```bash
  curl -X GET "http://localhost:8090/admin/costs/overview?scope=system_wide" \
    -H "Authorization: Bearer <admin-token>" \
    -H "X-User-Role: SUPER_ADMIN" \
    -H "X-User-ID: admin-123"

  # Should return:
  # {
  #   "revenue": 25000,
  #   "total_costs": 14740,
  #   "profit_loss": 10260,
  #   "profit_margin": 41.04,
  #   "cost_per_minute": 12.5
  # }
  ```

- [ ] **Timeline Endpoint**
  ```bash
  curl -X GET "http://localhost:8090/admin/costs/timeline?scope=system_wide&granularity=daily&start_date=2026-01-01&end_date=2026-01-26" \
    -H "Authorization: Bearer <admin-token>" \
    -H "X-User-Role: SUPER_ADMIN"

  # Should return array of timeline data points
  ```

- [ ] **Top Spenders Endpoint**
  ```bash
  curl -X GET "http://localhost:8090/admin/costs/users/top-spenders?period=month&limit=20" \
    -H "Authorization: Bearer <super-admin-token>" \
    -H "X-User-Role: SUPER_ADMIN"

  # Should return list with user_hash (not user_id) and cost_range (not exact amount)
  ```

### Frontend Testing

- [ ] **Dashboard Page Loads**
  - Navigate to `/admin/costs` (or admin link)
  - Page should load within 2 seconds
  - No 404 errors

- [ ] **P&L Summary Renders**
  - Large profit/loss metric displayed
  - Color: Green for profit, Red for loss
  - Trending icon (TrendingUp/TrendingDown)
  - Revenue and Total Costs shown

- [ ] **Key Metrics Display**
  - Cost per Minute metric
  - Monthly Run Rate
  - YTD Total Cost
  - YTD Net Revenue

- [ ] **Charts Render Correctly**
  - Overview tab: PieChart shows cost breakdown
  - Timeline tab: LineChart shows revenue/cost/profit
  - Categories tab: BarChart shows permanent vs transient
  - All charts interactive with tooltips

- [ ] **Tab Switching Works**
  - Click each tab: Overview, Timeline, Categories, Top Spenders
  - Tab content changes correctly
  - No errors in console

- [ ] **Scope Toggle Works**
  - Switch to "Per User"
  - User dropdown appears
  - Select a user
  - Data updates for that user

- [ ] **Date Range Filtering**
  - Date picker opens
  - Can select different date ranges
  - Data refreshes on change

- [ ] **Real-time Status Badge**
  - Badge shows "Just now" or "Xm ago"
  - Updates every 30 seconds
  - Green pulse animation

### Security Verification

- [ ] **Authorization Working**
  ```bash
  # Test as regular user (should fail)
  curl -X GET "http://localhost:8090/admin/costs/overview?scope=system_wide" \
    -H "Authorization: Bearer <user-token>" \
    -H "X-User-Role: USER"
  # Should return 403 Forbidden
  ```

- [ ] **Per-User Access Control**
  ```bash
  # User-123 trying to access User-456 data (should fail)
  curl -X GET "http://localhost:8090/admin/costs/overview?scope=per_user&user_id=user-456" \
    -H "Authorization: Bearer <user-123-token>" \
    -H "X-User-Role: USER" \
    -H "X-User-ID: user-123"
  # Should return 403 Forbidden
  ```

- [ ] **Rate Limiting**
  ```bash
  # Make 61 requests to overview endpoint (limit is 60/hour)
  for i in {1..61}; do
    curl -s -X GET "http://localhost:8090/admin/costs/overview?scope=system_wide" \
      -H "Authorization: Bearer <token>"
  done
  # Request 61 should return 429 Too Many Requests
  ```

- [ ] **PII Redaction**
  ```bash
  # Check top-spenders response contains user_hash, not user_id
  curl -X GET "http://localhost:8090/admin/costs/users/top-spenders?period=month" \
    -H "Authorization: Bearer <super-admin-token>" | jq '.[] | .user_hash'
  # Should show: "a3f2b1..." (hashed format, max 20 chars)
  # Should NOT show: "user-123" (full ID)
  ```

### Performance Testing

- [ ] **Page Load Time < 2 seconds**
  ```bash
  # Check with developer tools or:
  time curl -s http://localhost:3200/admin/costs > /dev/null
  ```

- [ ] **Data Fetch < 500ms**
  ```bash
  # Check API response times
  time curl -s -X GET "http://localhost:8090/admin/costs/overview?scope=system_wide" \
    -H "Authorization: Bearer <token>" > /dev/null
  ```

- [ ] **Charts Render Smoothly**
  - No lag when switching tabs
  - Hover effects responsive
  - No frame drops (60 fps)

- [ ] **Large Date Range Queries**
  ```bash
  # Test with full year query (365 days max)
  curl -X GET "http://localhost:8090/admin/costs/timeline?start_date=2025-01-26&end_date=2026-01-26" \
    -H "Authorization: Bearer <token>"
  # Should return aggregated monthly data (not hourly)
  ```

### Data Verification

- [ ] **Cost Aggregation Working**
  ```bash
  # Check MongoDB for cost records
  mongo
  > use bayit_plus
  > db.cost_breakdown.findOne()
  # Should have fields: revenue, total_costs, profit_loss, etc.
  ```

- [ ] **Reconciliation Job Running**
  ```bash
  # Check backend logs for reconciliation output
  grep "reconciliation" logs/backend.log
  # Should show daily runs at 1 AM UTC
  ```

- [ ] **Archival Job Running**
  ```bash
  # Check for GCS archival records
  gsutil ls gs://bayit-plus-archive/costs/
  # Should have monthly folders: 2026-01/, 2026-02/, etc.
  ```

---

## Rollback Plan

If issues occur during deployment:

### Backend Rollback
```bash
# 1. Revert Cloud Run to previous version
gcloud run deploy bayit-plus-backend \
  --image bayit-plus-backend:previous-tag

# 2. Disable background jobs (comment out in background_tasks.py)
# 3. Clear failed cost records if needed
```

### Frontend Rollback
```bash
# 1. Revert Firebase hosting
firebase hosting:sites:versions:list
firebase hosting:clone-version --source-version <previous-version>

# 2. Or deploy previous build
npm run build:previous
firebase deploy --only hosting
```

---

## Monitoring & Maintenance

### Daily Checks

- [ ] Backend logs show successful hourly cost aggregation
- [ ] No 500 errors in API logs
- [ ] Frontend error tracking shows < 1% errors
- [ ] Cost data updates hourly

### Weekly Checks

- [ ] Cost totals reconcile (SystemTotal = Sum(UserCosts))
- [ ] No queries taking > 1 second
- [ ] Rate limits being hit appropriately
- [ ] Admin users can access dashboard without issues

### Monthly Checks

- [ ] Archival job completed successfully
- [ ] Old data properly moved to GCS
- [ ] Database performance stable
- [ ] Cost calculations accurate (spot check against invoices)

---

## Metrics to Track

```
Dashboard Metrics:
- Page load time (target: < 2s)
- Data fetch time (target: < 500ms)
- Chart render time (target: < 1s)
- API error rate (target: < 0.1%)
- Authorization denial rate (target: < 1%)
- Rate limit hits (target: track trending)

Data Quality:
- Cost aggregation: Hourly success rate
- Reconciliation: Daily match rate (>99%)
- PII redaction: 100% of top-spenders responses
- Data accuracy: Cost variance from actual (< 1%)
```

---

## Support & Troubleshooting

### Common Issues

**Issue**: "CostBreakdown collection not found"
```
Solution:
1. Trigger first cost aggregation manually
2. Or insert sample document to create collection
```

**Issue**: "Authorization denied for all users"
```
Solution:
1. Verify user roles in authorization header
2. Check RBAC configuration in cost_auth.py
3. Verify user has billing:read permission
```

**Issue**: "Charts not rendering on frontend"
```
Solution:
1. Verify Recharts installed: npm ls recharts
2. Check browser console for errors
3. Verify data format matches chart expectations
```

**Issue**: "Rate limiting too restrictive"
```
Solution:
1. Adjust limits in cost_dashboard.py endpoints
2. Redeploy backend
3. Changes take effect immediately
```

### Debug Commands

```bash
# Backend
poetry run pytest test/integration/test_cost_dashboard_api.py -v -s
poetry run python -m app.local_server --log-level DEBUG

# Frontend
npm run dev:verbose
npm test -- costDashboard --verbose

# Database
mongo
> db.cost_breakdown.countDocuments()
> db.cost_breakdown.getIndexes()
> db.audit_logs.find({action: "cost_access"}).limit(10)
```

---

## Sign-Off

- [ ] All backend tests passing (30/30)
- [ ] All frontend tests passing (32/32)
- [ ] Code coverage >= 87%
- [ ] Security verification complete
- [ ] Performance targets met
- [ ] Multi-agent review approved
- [ ] Ready for production deployment

**Deployment Date**: _______________
**Deployed By**: _______________
**Verified By**: _______________

---

## Post-Deployment Sign-Off

- [ ] Backend deployed successfully
- [ ] Frontend deployed successfully
- [ ] All endpoints responding correctly
- [ ] Charts rendering in production
- [ ] Authorization working as expected
- [ ] Rate limiting functioning
- [ ] Monitoring alerts configured
- [ ] Support team notified

**Production Deployment Date**: _______________
**Verified By**: _______________
**Time to Deploy**: _______________
