# Quickstart: Running Investigations Monitoring

This guide helps you get the Parallel Investigations Monitoring feature up and running.

## Prerequisites

- Node.js 18+
- npm or yarn
- Backend API running at configured URL (default: `http://localhost:8090`)

## Setup

### 1. Environment Configuration

Copy the environment template and configure for your environment:

```bash
cp olorin-front/.env.example olorin-front/.env.local
```

### 2. Required Environment Variables

Edit `.env.local` with your configuration:

```bash
# Backend API endpoint (REQUIRED)
REACT_APP_API_BASE_URL=http://localhost:8090

# Polling interval in milliseconds (default: 10000 = 10 seconds)
REACT_APP_INVESTIGATION_POLLING_INTERVAL_MS=10000

# Feature flags (default: false)
REACT_APP_FEATURE_ENABLE_STATUS_FILTER=false
REACT_APP_FEATURE_ENABLE_REAL_TIME_UPDATES=false

# UI settings (default: 50 items per page)
REACT_APP_PAGINATION_SIZE=50
```

### 3. Install Dependencies

```bash
cd olorin-front
npm install
```

### 4. Run Investigation Service

```bash
# Start investigation microservice in development mode
npm run dev:investigation

# Service will be available at http://localhost:3001
```

### 5. Access the Feature

Navigate to: `http://localhost:3001/investigation/parallel`

## Configuration Schema

The configuration is validated using Zod schema:

```typescript
{
  pollingInterval: number (milliseconds, required, min 1000)
  apiBaseUrl: string (valid URL, required)
  enableStatusFilter: boolean (optional, default false)
  enableRealTimeUpdates: boolean (optional, default false)
  paginationSize: number (optional, default 50, min 1)
}
```

**Validation Behavior**: Configuration is validated on application load. If any required variables are missing or invalid, the application will fail to start with a clear error message.

## Real-Time Updates Architecture

The feature implements a **hybrid real-time + polling approach** for maximum reliability:

### Real-Time Updates (Event Bus)
- Listens to `investigation:updated` events from the centralized event bus
- Updates appear **instantly** when received from:
  - WebSocket connections (if backend supports it)
  - Server-Sent Events (SSE)
  - Other microservices publishing events
- No additional configuration needed - automatically available

### Fallback: Automatic Polling
- Runs every **10 seconds** (configurable via `REACT_APP_INVESTIGATION_POLLING_INTERVAL_MS`)
- Ensures data freshness even if real-time connection fails
- Seamlessly switches between real-time and polling modes

### Connection Status Indicator
- **Green dot + "Real-time"**: WebSocket/SSE connected, receiving instant updates
- **Yellow dot + "Polling mode"**: Using polling fallback, updates every 10 seconds
- Visual indicator displayed in page header (top-right)

## Feature Flags

### Status Filter (REACT_APP_FEATURE_ENABLE_STATUS_FILTER)

- **false** (default): Filter controls hidden; all investigations displayed
- **true**: Filter controls visible; users can filter by status (IN_PROGRESS, COMPLETED, ERROR, CANCELLED)

### Real-Time Updates (REACT_APP_FEATURE_ENABLE_REAL_TIME_UPDATES)

- **false** (default): Uses event bus + polling fallback (recommended)
- **true**: Future flag for advanced real-time optimizations

## Testing

### Unit Tests

```bash
npm test -- ParallelInvestigationsPage
```

### Integration Tests

```bash
npm run test:integration -- investigation
```

### Manual Testing Checklist

- [ ] Navigate to `/investigation/parallel` - page loads
- [ ] Table displays with columns: ID, Entity, Status, Risk Score, Start Time
- [ ] Data refreshes automatically every 10 seconds
- [ ] Click investigation row - navigates to progress page
- [ ] Manual refresh button updates data within 1 second
- [ ] "Last Updated" timestamp displays and updates
- [ ] Enable status filter - filter controls appear and work
- [ ] Simulate API error - error message displays with retry button
- [ ] Clear all investigations - empty state displays

## Troubleshooting

### Configuration Validation Errors

**Error**: "Investigation configuration validation failed"

**Solution**: Check environment variables:
- Ensure `REACT_APP_API_BASE_URL` is set and valid
- Ensure numeric values are proper numbers (not strings with spaces)
- Run `echo $REACT_APP_API_BASE_URL` to verify value

### Investigations Not Displaying

1. Verify backend API is running and accessible
2. Check browser console for errors
3. Verify `REACT_APP_API_BASE_URL` points to correct backend

### Polling Not Working

1. Check `REACT_APP_INVESTIGATION_POLLING_INTERVAL_MS` is set to valid milliseconds
2. Open browser DevTools Network tab to verify API calls
3. Should see API requests every 10 seconds

### Feature Flags Not Working

Feature flags are read once on application load. To change:
1. Update `.env.local`
2. Restart the development server
3. Hard refresh browser (Cmd+Shift+R or Ctrl+Shift+R)

## API Endpoints

The feature uses the following backend API endpoint:

### List Investigations

```
GET /api/v1/investigation-state/?page=1&page_size=50&search=auto-comp-
```

**Parameters**:
- `page` (optional): Page number (default 1)
- `page_size` (optional): Results per page (configurable)
- `search` (optional): Search filter (e.g., 'auto-comp-' for parallel investigations)
- `status` (optional): Filter by status (future enhancement)

**Response**:
```json
{
  "investigations": [...],
  "total_count": 42,
  "has_next_page": false,
  "has_previous_page": false
}
```

## Performance Targets

- Page load: < 2 seconds
- Automatic polling: Every 10 seconds (configurable)
- Status filter: < 1 second response
- Manual refresh: < 1 second response
- Handle up to 100 concurrent investigations without degradation

## Component Structure

```
ParallelInvestigationsPage/
├── ParallelInvestigationsPage.tsx      (main page orchestrator)
├── InvestigationsTable.tsx             (table display)
├── InvestigationFilters.tsx            (optional filters)
├── useInvestigationPolling.ts          (polling hook)
└── index.ts                            (exports)
```

## Next Steps

- Review spec.md for detailed feature requirements
- Check plan.md for technical architecture
- Review tasks.md for implementation breakdown
