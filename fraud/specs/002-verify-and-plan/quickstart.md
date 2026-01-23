# Quick Start: Manual Investigation UI

**Feature**: Manual Investigation UI Migration | **Branch**: `002-verify-and-plan`

## Prerequisites

- Node.js 18+ and npm installed
- Python 3.11 with Poetry installed
- Access to Olorin development environment
- Valid authentication credentials

## 1. Environment Setup (5 minutes)

```bash
# Clone and checkout feature branch
git checkout 002-verify-and-plan

# Install frontend dependencies
cd olorin-front
npm install

# Install backend dependencies
cd ../olorin-server
poetry install
```

## 2. Start Backend Services (2 minutes)

```bash
# Terminal 1: Start backend server
cd olorin-server
poetry run python -m app.local_server

# Verify backend is running
curl http://localhost:8090/api/health
```

## 3. Start Manual Investigation Microservice (2 minutes)

```bash
# Terminal 2: Start microservice
cd olorin-front
npm run dev:manual-investigation

# Service will be available at http://localhost:3007
```

## 4. Verify Basic Functionality (5 minutes)

### 4.1 Create Investigation
```bash
# Create test investigation via API
curl -X POST http://localhost:8090/api/investigation \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "entity_id": "user_123",
    "entity_type": "user_id",
    "priority": "HIGH"
  }'
```

### 4.2 Open Investigation UI
1. Navigate to http://localhost:3007
2. Login with test credentials
3. You should see the investigation dashboard

### 4.3 Verify Real-time Updates
1. Open browser DevTools → Network → WS tab
2. Verify WebSocket connection established
3. Create a comment - verify real-time broadcast

## 5. Test Core User Flows (10 minutes)

### Flow 1: View Investigation Dashboard
```
GIVEN: User is logged in
WHEN: Navigate to /investigations
THEN: See list of active investigations with:
  - Investigation ID and status
  - Risk scores with visual indicators
  - Assigned investigators
  - Last activity timestamps
```

### Flow 2: Execute Investigation Step
```
GIVEN: Investigation is open
WHEN: Click "Run Device Analysis"
THEN:
  1. Step status changes to "RUNNING"
  2. Progress indicator appears
  3. WebSocket updates show progress
  4. Results display when complete
  5. Risk score updates automatically
```

### Flow 3: Add Collaboration Comment
```
GIVEN: Investigation is open
WHEN: Add comment with @mention
THEN:
  1. Comment appears immediately
  2. Mentioned user receives notification
  3. Other users see comment in real-time
  4. Comment shows in activity log
```

### Flow 4: Generate Investigation Report
```
GIVEN: Investigation is complete
WHEN: Click "Generate Report" → Select PDF
THEN:
  1. Report generation starts
  2. Progress indicator shows status
  3. Download link appears when ready
  4. Report contains all findings
```

## 6. Verify Integration Points (5 minutes)

### Backend API Integration
```javascript
// Test investigation CRUD
const investigation = await fetch('/api/investigation/123');
console.assert(investigation.status === 200, 'Investigation retrieved');

// Test agent analysis
const deviceAnalysis = await fetch('/api/device', {
  method: 'POST',
  body: JSON.stringify({ entity_id: 'user_123' })
});
console.assert(deviceAnalysis.status === 200, 'Device analysis complete');
```

### WebSocket Events
```javascript
// Connect to WebSocket
const ws = new WebSocket('ws://localhost:8090/ws');

// Listen for events
ws.on('step.completed', (event) => {
  console.log('Step completed:', event.payload);
});

ws.on('risk.updated', (event) => {
  console.log('Risk updated:', event.payload.riskScore);
});
```

### Module Federation
```javascript
// Verify microservice loading
const ManualInvestigation = await import('manual-investigation/App');
console.assert(ManualInvestigation.default, 'Microservice loaded');
```

## 7. Performance Validation (5 minutes)

### Load Time Metrics
- Initial page load: < 2 seconds ✓
- Investigation data fetch: < 500ms ✓
- Step execution start: < 300ms ✓
- WebSocket connection: < 100ms ✓

### Memory Usage
```bash
# Monitor memory usage
npm run analyze:bundle

# Expected results:
# - Main bundle: < 500KB
# - Lazy loaded chunks: < 200KB each
# - Total memory usage: < 50MB
```

## 8. Common Issues & Solutions

### Issue: WebSocket Connection Failed
```bash
# Check backend WebSocket server
curl -i -N -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  http://localhost:8090/ws

# Solution: Restart backend with WebSocket enabled
ENABLE_WEBSOCKET=true poetry run python -m app.local_server
```

### Issue: Microservice Not Loading
```bash
# Check Module Federation config
npm run check:federation

# Solution: Rebuild with federation
npm run build:manual-investigation
```

### Issue: Authentication Failed
```bash
# Get new token
curl -X POST http://localhost:8090/api/auth/login \
  -d '{"username":"test","password":"test"}'

# Set token in environment
export TOKEN="<token_from_response>"
```

## 9. Development Workflow

### Making Changes
1. Edit components in `src/microservices/manual-investigation/`
2. Hot reload updates automatically
3. Run tests: `npm test:manual-investigation`
4. Check linting: `npm run lint`

### Testing Changes
```bash
# Unit tests
npm run test:unit

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# All tests
npm test
```

### Debugging
1. Enable debug mode: `localStorage.setItem('debug', 'investigation:*')`
2. Check browser console for detailed logs
3. Use React DevTools for component inspection
4. Monitor Network tab for API calls

## 10. Deployment Checklist

- [ ] All tests passing
- [ ] No console errors
- [ ] WebSocket connections stable
- [ ] Performance metrics met
- [ ] Accessibility checked
- [ ] Cross-browser tested
- [ ] Documentation updated
- [ ] Code reviewed

## Success Criteria

✅ **Functional Requirements Met**:
- All 20 FRs from specification implemented
- Feature parity with legacy system achieved
- Real-time updates working

✅ **Technical Requirements Met**:
- All files < 200 lines
- 100% Tailwind CSS (no Material-UI)
- Microservice architecture functional
- Backend integration complete

✅ **User Experience**:
- Responsive design works on all devices
- Load times meet performance goals
- No regression from legacy system

## Next Steps

1. Complete remaining component migrations
2. Add comprehensive error handling
3. Implement advanced features (templates, bulk operations)
4. Performance optimization
5. Security audit
6. Production deployment preparation

---

**Support**: Contact the development team in #olorin-dev channel
**Documentation**: See `/docs/manual-investigation/` for detailed guides