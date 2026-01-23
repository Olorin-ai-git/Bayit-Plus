# Quickstart Guide: Live Merged Investigation Logstream

**Feature Branch**: `021-live-merged-logstream`
**Created**: 2025-11-12
**Prerequisites**: Backend (Python 3.11 + Poetry), Frontend (Node 18+ + npm)

---

## Overview

This quickstart guide walks you through setting up and using the live merged logstream feature for local development. You'll learn how to:

1. Configure environment variables for both frontend and backend
2. Start the log streaming services
3. View live merged logs in the investigation UI
4. Test SSE streaming and polling fallback
5. Troubleshoot common issues

**Expected Setup Time**: 10-15 minutes

---

## Prerequisites

### Backend (Python)

- Python 3.11
- Poetry package manager
- FastAPI server running on `http://localhost:8090`

### Frontend (React/TypeScript)

- Node.js 18+
- npm
- React development server running on `http://localhost:3000`

### Verify Prerequisites

```bash
# Check Python version
python --version  # Should be 3.11.x

# Check Poetry
poetry --version  # Should be 1.7+

# Check Node.js
node --version  # Should be 18.x+

# Check npm
npm --version  # Should be 9.x+
```

---

## Step 1: Configure Backend Environment

### 1.1 Navigate to Backend Directory

```bash
cd olorin-server
```

### 1.2 Create `.env` File

Create `.env` file in `olorin-server/` directory:

```bash
# Copy example
cp .env.example .env
```

### 1.3 Add Log Streaming Configuration

Add the following to your `.env` file:

```env
# Log Streaming Configuration
LOGSTREAM_SSE_HEARTBEAT_INTERVAL_SECONDS=10
LOGSTREAM_SSE_RETRY_TIMEOUT_MS=3000
LOGSTREAM_CLOCK_SKEW_TOLERANCE_SECONDS=10
LOGSTREAM_MAX_BUFFER_SIZE=10000
LOGSTREAM_DEDUP_CACHE_SIZE=10000
LOGSTREAM_DEDUP_WINDOW_SECONDS=60
LOGSTREAM_RATE_LIMIT_PER_USER_PER_MINUTE=100
LOGSTREAM_RATE_LIMIT_PER_INVESTIGATION_PER_MINUTE=1000
LOGSTREAM_PII_REDACTION_ENABLED=true
LOGSTREAM_POLLING_DEFAULT_LIMIT=100
LOGSTREAM_POLLING_MAX_LIMIT=1000
LOGSTREAM_LOG_PROVIDER_MODE=local-dev
```

**Configuration Notes**:
- `LOGSTREAM_LOG_PROVIDER_MODE=local-dev` enables frontend log ingestion via `/client-logs` endpoint
- `LOGSTREAM_PII_REDACTION_ENABLED=true` applies PII redaction patterns to all log messages
- Rate limits are set for development; adjust for production

### 1.4 Install Dependencies

```bash
poetry install
```

This installs:
- `structlog` - Structured logging library
- `python-dateutil` - Timestamp parsing utilities

### 1.5 Verify Backend Configuration

```bash
poetry run python -c "from app.config.logstream_config import LogStreamConfig; cfg = LogStreamConfig(); print(f'Log provider mode: {cfg.log_provider_mode}')"
```

Expected output:
```
Log provider mode: local-dev
```

---

## Step 2: Configure Frontend Environment

### 2.1 Navigate to Frontend Directory

```bash
cd olorin-front
```

### 2.2 Create `.env.local` File

Create `.env.local` file in `olorin-front/` directory:

```bash
# Copy example
cp .env.example .env.local
```

### 2.3 Add Log Streaming Configuration

Add the following to your `.env.local` file:

```env
# Log Streaming Configuration
REACT_APP_SSE_HEARTBEAT_INTERVAL_MS=10000
REACT_APP_SSE_RETRY_TIMEOUT_MS=3000
REACT_APP_POLLING_INTERVAL_MS=5000
REACT_APP_POLLING_DEFAULT_LIMIT=100
REACT_APP_VIRTUALIZED_OVERSCAN=5
REACT_APP_MAX_VISIBLE_LOGS=10000
REACT_APP_DEFAULT_LOG_LEVEL=DEBUG
REACT_APP_SEARCH_DEBOUNCE_MS=500
REACT_APP_AUTOSCROLL_ENABLED=true
REACT_APP_AUTOSCROLL_THRESHOLD=100

# API Base URL (should already exist)
REACT_APP_API_BASE_URL=http://localhost:8090/api/v1
```

**Configuration Notes**:
- `REACT_APP_POLLING_INTERVAL_MS=5000` sets polling fallback to every 5 seconds
- `REACT_APP_VIRTUALIZED_OVERSCAN=5` optimizes react-window performance
- `REACT_APP_DEFAULT_LOG_LEVEL=DEBUG` shows all log levels by default

### 2.4 Install Dependencies

```bash
npm install
```

This installs:
- `react-window` - Virtualized list component for performance
- `zod` - TypeScript schema validation

### 2.5 Verify Frontend Configuration

```bash
node -e "require('dotenv').config({ path: '.env.local' }); console.log('SSE Interval:', process.env.REACT_APP_SSE_HEARTBEAT_INTERVAL_MS)"
```

Expected output:
```
SSE Interval: 10000
```

---

## Step 3: Start Services

### 3.1 Start Backend Server

In `olorin-server/` directory:

```bash
poetry run python -m app.local_server
```

Expected output:
```
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://localhost:8090
```

**Verify Backend**:
```bash
curl http://localhost:8090/api/v1/logs/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2025-11-12T10:30:00.000Z",
  "providers": {
    "frontend": {"status": "healthy", "type": "local-dev"},
    "backend": {"status": "healthy", "type": "local-dev"}
  }
}
```

### 3.2 Start Frontend Development Server

In `olorin-front/` directory:

```bash
npm start
```

Expected output:
```
webpack compiled successfully
```

**Verify Frontend**:
Open browser to `http://localhost:3000`

---

## Step 4: View Live Logs

### 4.1 Navigate to Investigation

1. Open `http://localhost:3000` in your browser
2. Create or select an existing investigation (e.g., `INV-123`)
3. Navigate to the investigation details page

### 4.2 Open Live Log Stream

Click on the "Logs" tab or "View Live Logs" button in the investigation interface.

**What you should see**:
- Live log stream component with color-coded log levels
- Real-time logs appearing from both frontend and backend
- Autoscroll enabled by default
- Filter controls for level, source, and search

### 4.3 Generate Test Logs

**Frontend Logs**:
The frontend logger automatically captures:
- User interactions (button clicks, form submissions)
- API requests and responses
- Component lifecycle events
- JavaScript errors

**Backend Logs**:
The backend logger captures:
- API endpoint calls
- Database queries
- Investigation execution steps
- System events

**Manually trigger frontend log**:
```javascript
// In browser console
logger.info('Test log from browser', { test: true });
```

**Manually trigger backend log**:
```bash
curl -X POST http://localhost:8090/api/v1/client-logs \
  -H "Content-Type: application/json" \
  -H "X-Investigation-Id: INV-123" \
  -d '{"logs":[{"ts":"2025-11-12T10:30:00.000Z","level":"INFO","message":"Test log from curl","service":"test"}]}'
```

---

## Step 5: Test Features

### 5.1 Test SSE Streaming

1. Open browser DevTools → Network tab
2. Filter for "stream" requests
3. You should see a long-running request to `/api/v1/investigations/{id}/logs/stream`
4. Type: `text/event-stream`
5. Status: `200 OK` (pending)

**Verify SSE Events**:
Look for events in the response:
```
event: connection_established
id: 2025-11-12T10:30:00.000Z#000
data: {"investigation_id":"INV-123"}

event: log
id: 2025-11-12T10:30:05.123Z#042
data: {...}

event: heartbeat
data: {"server_time":"2025-11-12T10:30:10.000Z"}
```

### 5.2 Test Log Filtering

1. **Level Filter**: Click level dropdown, select "ERROR"
   - Expected: Only ERROR logs displayed
   - Verify: DEBUG, INFO, WARN logs are hidden

2. **Source Filter**: Select "Frontend" or "Backend"
   - Expected: Only logs from selected source displayed

3. **Search**: Type "investigation" in search box
   - Expected: Only logs containing "investigation" displayed
   - Note: Search has 500ms debounce

### 5.3 Test Pause/Resume

1. **Pause**: Click pause button
   - Expected: Logs stop updating visually
   - Connection stays alive (check Network tab)
   - New logs buffered in background

2. **Resume**: Click resume button
   - Expected: Buffered logs flush to UI
   - Live streaming continues

### 5.4 Test Autoscroll

1. **Auto-disable**: Scroll up in log viewer
   - Expected: Autoscroll automatically disabled
   - New logs arrive but view doesn't scroll

2. **Re-enable**: Scroll to bottom
   - Expected: Autoscroll re-enabled
   - View scrolls with new logs

### 5.5 Test Polling Fallback

1. **Simulate SSE Failure**: Kill backend server
   ```bash
   # Stop backend
   pkill -f "python -m app.local_server"
   ```

2. **Observe Frontend**: Check browser console
   - Expected: SSE connection error
   - After 3 failures: "Falling back to polling"

3. **Restart Backend**:
   ```bash
   cd olorin-server
   poetry run python -m app.local_server
   ```

4. **Verify Polling**: Check Network tab
   - Expected: Regular GET requests to `/api/v1/investigations/{id}/logs?afterCursor=...`
   - Frequency: Every 5 seconds

### 5.6 Test Historical Log Backfill

1. **Generate Logs**: Create some logs with investigation running
2. **Refresh Page**: Reload browser (F5)
3. **Expected**:
   - Historical logs load immediately
   - Then live stream starts
   - No duplicate logs
   - Seamless transition

---

## Step 6: Troubleshooting

### Issue: No logs appearing

**Check 1**: Verify services are running
```bash
# Backend health check
curl http://localhost:8090/api/v1/logs/health

# Expected: {"status": "healthy", ...}
```

**Check 2**: Verify investigation ID is set
- Browser console: `frontendLogger.investigationId` should be set
- If null: Navigate to investigation page first

**Check 3**: Check browser console for errors
- Look for SSE connection errors
- Look for CORS errors
- Look for authentication errors

### Issue: SSE connection fails immediately

**Check 1**: Verify CORS configuration
```python
# In olorin-server/app/main.py
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**Check 2**: Verify SSE endpoint is accessible
```bash
curl -N -H "Accept: text/event-stream" \
  http://localhost:8090/api/v1/investigations/INV-123/logs/stream
```

Expected: Stream of SSE events

### Issue: Logs appearing slowly (> 5 seconds delay)

**Check 1**: Verify heartbeat events arriving
- Browser DevTools → Network → stream request
- Should see heartbeat every 10 seconds

**Check 2**: Check backend latency
```bash
curl http://localhost:8090/api/v1/logs/health | jq '.metrics'
```

Look for:
- `avg_merge_latency_ms` < 10ms
- `p95_merge_latency_ms` < 50ms

**Check 3**: Check buffer usage
```bash
curl http://localhost:8090/api/v1/logs/health | jq '.aggregator.buffer_usage_percent'
```

If > 80%, reduce `LOGSTREAM_MAX_BUFFER_SIZE` or increase backend resources

### Issue: Duplicate logs appearing

**Check 1**: Verify deduplication is enabled
```bash
curl http://localhost:8090/api/v1/logs/health | jq '.deduplicator'
```

Expected: `status: "healthy"`, `deduplication_hits` > 0

**Check 2**: Check event_id generation
- Backend logs should have unique `event_id` per entry
- Frontend logger generates UUID for each log

### Issue: Frontend logs not appearing

**Check 1**: Verify client logs endpoint is working
```bash
curl -X POST http://localhost:8090/api/v1/client-logs \
  -H "Content-Type: application/json" \
  -H "X-Investigation-Id: INV-123" \
  -d '{"logs":[{"ts":"2025-11-12T10:30:00.000Z","level":"INFO","message":"Test","service":"test"}]}'
```

Expected: `202 Accepted`

**Check 2**: Verify log provider mode
```bash
curl http://localhost:8090/api/v1/logs/health | jq '.providers.frontend.type'
```

Expected: `"local-dev"`

**Check 3**: Check frontend logger initialization
```javascript
// Browser console
console.log(frontendLogger.investigationId);
```

Should output current investigation ID, not `null`

### Issue: Rate limit errors

**Symptom**: `429 Too Many Requests` responses

**Solution 1**: Increase rate limits in backend `.env`:
```env
LOGSTREAM_RATE_LIMIT_PER_USER_PER_MINUTE=1000
LOGSTREAM_RATE_LIMIT_PER_INVESTIGATION_PER_MINUTE=10000
```

**Solution 2**: Implement exponential backoff in frontend
- Already implemented in `useLogStream` hook
- Check browser console for backoff messages

---

## Step 7: Verify End-to-End Flow

### Complete Verification Checklist

- [ ] Backend health check returns `healthy`
- [ ] Frontend loads without errors
- [ ] Navigate to investigation page
- [ ] Logs tab is visible and clickable
- [ ] Live log stream opens and shows logs within 2 seconds
- [ ] Logs from both frontend and backend appear
- [ ] Logs are ordered by timestamp
- [ ] No duplicate logs
- [ ] Filter by ERROR level works
- [ ] Search for text works
- [ ] Pause/resume works
- [ ] Autoscroll works
- [ ] SSE heartbeat events arrive every 10 seconds
- [ ] Polling fallback works when SSE fails
- [ ] Page refresh loads historical logs
- [ ] Copy log as JSON works
- [ ] Export logs works

---

## Next Steps

### Production Deployment

For production deployment, see:
- `specs/021-live-merged-logstream/deployment.md` (to be created in Phase 9)
- Configure cloud log providers (Sentry, Datadog, ELK, CloudWatch)
- Set up proper authentication and authorization
- Enable PII redaction rules for your domain
- Configure rate limiting for production scale
- Set up monitoring and alerting

### Development

To start implementing tasks, see:
- `specs/021-live-merged-logstream/tasks.md` - Complete task breakdown (T001-T090)
- Start with Phase 1 (Setup) tasks T001-T004
- Then proceed to Phase 2 (Foundation) tasks T005-T018
- Foundation must be complete before any user story implementation

### Testing

To run comprehensive tests, see:
- Phase 9 tasks (T065-T090) for test coverage
- Unit tests for backend services
- Integration tests for API endpoints
- E2E tests with Playwright for full user flows

---

## Additional Resources

- **Feature Specification**: `specs/021-live-merged-logstream/spec.md`
- **Research Document**: `specs/021-live-merged-logstream/research.md`
- **Data Model**: `specs/021-live-merged-logstream/data-model.md`
- **API Contracts**: `specs/021-live-merged-logstream/contracts/`
- **Implementation Tasks**: `specs/021-live-merged-logstream/tasks.md`

---

## Support

If you encounter issues not covered in this guide:

1. Check backend logs: `olorin-server/logs/`
2. Check frontend console: Browser DevTools → Console
3. Verify health endpoint: `curl http://localhost:8090/api/v1/logs/health`
4. Review configuration files: `.env` and `.env.local`
5. Consult the troubleshooting section above

For questions or bug reports, refer to the project's issue tracker.
