# Quick Start Guide: Investigation Reports Integration

**Feature**: `001-extensive-investigation-report`
**Branch**: `001-extensive-investigation-report`
**Last Updated**: 2025-01-11

## Overview

This guide helps developers quickly set up and test the Investigation Reports Integration feature locally. Follow these steps to run report generation, view reports in the frontend, and debug issues.

## Prerequisites

- Python 3.11+ with Poetry installed
- Node.js 18+ with npm installed
- PostgreSQL running locally or accessible remotely
- Access to investigation folder data (LIVE or MOCK modes)
- Olorin backend and frontend repositories cloned

## Quick Setup (5 Minutes)

### 1. Backend Setup

```bash
# Navigate to backend
cd olorin-server

# Install dependencies
poetry install

# Run database migrations
poetry run alembic upgrade head

# Verify new tables exist
poetry run python -c "from app.models import investigation_report; print('✅ Models imported successfully')"

# Set environment variables
export REPORT_GENERATION_TIMEOUT_SECONDS=300
export REPORT_MAX_FILE_SIZE_MB=50
export REPORT_COMPRESSION_ENABLED=true
export REPORT_STORAGE_PATH=/tmp/reports
export INVESTIGATION_FOLDERS_PATH=./logs/investigations
export PDF_GENERATION_LIBRARY=weasyprint
export BACKGROUND_JOB_MAX_RETRIES=3

# Start backend server
poetry run python -m app.local_server
```

Backend will be available at `http://localhost:8090`

### 2. Frontend Setup

```bash
# Navigate to frontend
cd olorin-front

# Install dependencies
npm install

# Set environment variables
export REACT_APP_API_BASE_URL=http://localhost:8090
export REACT_APP_ENABLE_INVESTIGATION_REPORTS=true

# Start frontend development server
npm start
```

Frontend will be available at `http://localhost:3000`

### 3. Verify Setup

```bash
# Test backend API health
curl http://localhost:8090/health

# Test new report endpoints exist
curl http://localhost:8090/api/v1/reports/investigations/ \
  -H "Authorization: Bearer <your-token>"
```

## Testing Report Generation Locally

### Option 1: Using Existing Investigation

```bash
# Step 1: List available investigations
ls ./logs/investigations/

# You should see folders like: LIVE_inv-123_20250111_143022/

# Step 2: Trigger report generation via API
curl -X POST http://localhost:8090/api/v1/reports/investigations/inv-123/generate \
  -H "Authorization: Bearer <your-token>" \
  -H "Content-Type: application/json" \
  -d '{"trigger_type": "manual"}'

# Response: {"job_id": "job-uuid", "status": "queued"}

# Step 3: Poll job status
curl http://localhost:8090/api/v1/reports/jobs/job-uuid \
  -H "Authorization: Bearer <your-token>"

# Step 4: View generated report
curl http://localhost:8090/api/v1/reports/investigations/inv-123 \
  -H "Authorization: Bearer <your-token>"
```

### Option 2: Run Complete Investigation First

```bash
# Run a MOCK investigation to generate test data
cd olorin-server
TEST_MODE=mock poetry run python scripts/testing/unified_autonomous_test_runner.py \
  --scenario account_takeover \
  --mode mock \
  --csv-limit 1

# This creates: MOCK_inv-<id>_<timestamp>/ folder
# Then follow Option 1 steps to generate report
```

## Frontend Testing

### View Report in Browser

1. Open `http://localhost:3000` in your browser
2. Log in with test credentials
3. Navigate to **Reports** → **Investigation Reports** tab
4. You should see the generated report in the list
5. Click on a report card to open the full report viewer

### Test Report Generation from Investigation Page

1. Navigate to an investigation: `http://localhost:3000/investigations/inv-123`
2. Scroll to header and click **"Generate Report"** button
3. Watch progress indicator update in real-time
4. Toast notification appears when complete: "Investigation report ready"
5. Click **"View Report"** to open the report

## Development Workflow

### Making Backend Changes

```bash
# 1. Make code changes to service layer
vim olorin-server/app/service/investigation_report_service.py

# 2. Run unit tests
poetry run pytest test/unit/service/test_investigation_report_service.py -v

# 3. Run integration tests
poetry run pytest test/integration/ -v

# 4. Check test coverage
poetry run pytest --cov=app.service.investigation_report_service

# 5. Restart backend if needed
# Backend auto-reloads with --reload flag (already set in local_server.py)
```

### Making Frontend Changes

```bash
# 1. Make code changes to components
vim olorin-front/src/microservices/reporting/components/investigation/InvestigationReportViewer.tsx

# 2. Run type checking
npm run typecheck

# 3. Run component tests
npm test -- InvestigationReportViewer.test.tsx

# 4. Check linting
npm run lint

# Frontend hot-reloads automatically - just refresh browser
```

## Common Issues & Solutions

### Issue 1: "Investigation folder not found"

**Problem**: Report generation fails with "Investigation folder not found"

**Solution**:
```bash
# Check investigation folder path configuration
echo $INVESTIGATION_FOLDERS_PATH

# Verify folder exists
ls -la ./logs/investigations/

# Ensure folder has correct naming format: {MODE}_{ID}_{TIMESTAMP}/
# Example: LIVE_inv-123_20250111_143022/

# Check folder contains required files
ls ./logs/investigations/LIVE_inv-123_20250111_143022/
# Should contain: metadata.json, structured_activities.jsonl, etc.
```

### Issue 2: "Report generation timeout"

**Problem**: Report generation takes too long and times out

**Solution**:
```bash
# Increase timeout in environment variable
export REPORT_GENERATION_TIMEOUT_SECONDS=600  # 10 minutes

# Check investigation size
cd ./logs/investigations/LIVE_inv-123_20250111_143022/
wc -l structured_activities.jsonl
# If >1000 activities, generation will be slower

# Monitor background worker logs
tail -f logs/report_worker.log
```

### Issue 3: "Cannot connect to database"

**Problem**: Backend cannot connect to PostgreSQL

**Solution**:
```bash
# Check PostgreSQL is running
pg_isready

# Verify database URL environment variable
echo $DATABASE_URL

# Test connection
poetry run python -c "from app.database import engine; print(engine.connect())"

# Run migrations if tables missing
poetry run alembic upgrade head
```

### Issue 4: Frontend shows "Report not found"

**Problem**: Report exists in backend but frontend shows 404

**Solution**:
```bash
# 1. Check API base URL configuration
echo $REACT_APP_API_BASE_URL
# Should be: http://localhost:8090

# 2. Verify backend is running
curl http://localhost:8090/health

# 3. Check browser network tab for actual error
# Open DevTools → Network → Filter by "reports" → Check failed requests

# 4. Verify JWT token is valid
# Check browser console for "401 Unauthorized" errors

# 5. Test API directly
curl http://localhost:8090/api/v1/reports/investigations/inv-123 \
  -H "Authorization: Bearer <token-from-browser>"
```

### Issue 5: Charts not rendering in report

**Problem**: Report loads but Chart.js visualizations don't appear

**Solution**:
```bash
# 1. Check browser console for Chart.js errors
# Open DevTools → Console

# 2. Verify Chart.js is installed
cd olorin-front
npm list chart.js react-chartjs-2

# 3. If missing, install dependencies
npm install chart.js react-chartjs-2

# 4. Clear browser cache and hard reload
# Chrome: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)

# 5. Check if data is available
# Inspect report object in React DevTools
# Verify risk_score, category_scores exist
```

## Debugging Tips

### Enable Verbose Logging

**Backend**:
```bash
export LOG_LEVEL=DEBUG
poetry run python -m app.local_server
```

**Frontend**:
```javascript
// Add to useInvestigationReports.ts hook
console.log('Report data:', report);
console.log('Generation status:', jobStatus);
```

### Inspect Database State

```bash
# Connect to PostgreSQL
psql -U postgres -d olorin

# Check reports table
SELECT id, investigation_id, status, risk_score FROM investigation_reports;

# Check generation jobs
SELECT id, investigation_id, status, progress_percentage FROM report_generation_jobs;

# Check sections
SELECT report_id, section_type, is_rendered FROM investigation_report_sections;
```

### Monitor Background Jobs

```bash
# Check job queue status
curl http://localhost:8090/api/v1/reports/jobs/ \
  -H "Authorization: Bearer <token>"

# Watch job logs in real-time
tail -f olorin-server/logs/job_worker.log
```

### Test Individual Components

**Backend Service Layer**:
```python
# Test report generation directly
from app.service.investigation_report_service import InvestigationReportService

service = InvestigationReportService(db)
report = await service.generate_report('inv-123', user)
print(f"Generated report: {report.id}")
```

**Frontend Component**:
```bash
# Run component in isolation with Storybook (if configured)
npm run storybook

# Or test component directly
npm test -- InvestigationReportViewer.test.tsx --watch
```

## Performance Testing

### Measure Report Generation Time

```bash
# Time report generation
time curl -X POST http://localhost:8090/api/v1/reports/investigations/inv-123/generate \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"trigger_type": "manual"}'

# Target: < 5 seconds for typical investigation (100 activities)
```

### Measure Frontend Load Time

```javascript
// Add to InvestigationReportViewer.tsx
const startTime = performance.now();
// ... component render
const endTime = performance.now();
console.log(`Report rendered in ${endTime - startTime}ms`);

// Target: < 3 seconds for full report load
```

## Next Steps

Once you have the basic setup working:

1. **Run comprehensive tests**: `poetry run pytest && npm test`
2. **Test E2E workflow**: `npm run test:e2e`
3. **Generate sample reports**: Create reports for multiple scenarios
4. **Test PDF export**: Click "Export PDF" button in report viewer
5. **Test automatic generation**: Complete an investigation and verify auto-report

## Additional Resources

- **API Contracts**: See `contracts/` directory for detailed endpoint specs
- **Data Model**: See `data-model.md` for database schema
- **Full Plan**: See `plan.md` for complete implementation details
- **Backend Tests**: `olorin-server/test/unit/service/test_investigation_report_service.py`
- **Frontend Tests**: `olorin-front/tests/unit/microservices/reporting/components/investigation/`

## Getting Help

If you encounter issues not covered in this guide:

1. Check the **troubleshooting** section above
2. Review **API contracts** in `contracts/` for expected request/response format
3. Inspect **browser DevTools** console and network tabs
4. Check **backend logs** for detailed error messages
5. Run tests to verify your changes: `poetry run pytest && npm test`

---

**Quick Start Status**: Complete
**Last Updated**: 2025-01-11
**Maintainer**: Development Team
