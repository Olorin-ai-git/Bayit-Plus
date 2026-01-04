# Phase 5: Core UI Service Integration Plan
**Date**: November 6, 2025
**Author**: Gil Klainert
**Branch**: feature/refactoring-implementation
**Status**: 🔄 IN PROGRESS

## Executive Summary

Phase 5 integrates all Phase 1-4 foundation work (validation, hooks, stores, components, utilities) into the Core UI Service. This creates a production-ready shell application that coordinates all microservices with consistent design, shared state management, and real-time capabilities.

## Current Core UI State

### ✅ Already Implemented (Solid Foundation)
1. **Authentication System**
   - `AuthService.ts` - Complete auth API integration with mock fallback
   - `AuthProvider.tsx` - React context for auth state
   - `useAuth.ts` - Hook for accessing auth state
   - Login page with Olorin corporate styling
   - Protected routes with authentication checks

2. **Navigation & Layout**
   - `MainLayout.tsx` - Comprehensive responsive layout
   - Desktop sidebar with service navigation
   - Mobile drawer navigation
   - Top bar with status indicators
   - User profile section with logout

3. **Routing Infrastructure**
   - React Router v6 with nested routes
   - Protected route wrapper
   - Module Federation integration points
   - Placeholder routes for all microservices

4. **Core Components**
   - `ErrorBoundary.tsx` - Global error handling
   - `LoadingSpinner.tsx` - Loading states
   - `NotificationSystem.tsx` - Toast notifications
   - Header, Sidebar, SystemStatus components

5. **Event System**
   - Uses our UnifiedEventBus from Phase 4
   - EventBusProvider wrapping all routes

## Phase 5 Integration Goals

### 5.1 Enhance Authentication with New Components ✅
**Objective**: Replace raw HTML inputs with our shared UI components

**Changes**:
- Replace login form inputs with `<Input />` component
- Replace login button with `<Button />` component
- Add form validation using our Zod validators
- Integrate `useDebounce` for email validation
- Add `usePrevious` for tracking login attempts

**Files to Modify**:
- `src/microservices/core-ui/CoreUIApp.tsx` (LoginPage component)

**New Features**:
- Real-time email format validation
- Password strength indicator
- Login attempt tracking
- Better error messaging

### 5.2 Upgrade Main Layout with Shared Components ✅
**Objective**: Enhance MainLayout with our component library

**Changes**:
- Wrap navigation items in `<Card />` components
- Add `<Badge />` for service status indicators
- Use `<Tabs />` for switching between service categories
- Integrate `useServiceHealth` hook for real-time status

**Files to Modify**:
- `src/microservices/core-ui/components/MainLayout.tsx`

**New Features**:
- Visual service health indicators (green/yellow/red)
- Service categorization (Investigation, Analytics, Utilities)
- Real-time backend connection status
- Animated state transitions

### 5.3 Integrate State Management Stores ✅
**Objective**: Connect investigation and agent stores to Core UI

**Changes**:
- Import investigation store for global investigation tracking
- Import agent store for service health monitoring
- Create dashboard widgets showing active investigations
- Display agent status in sidebar

**Files to Modify**:
- `src/microservices/core-ui/CoreUIApp.tsx` (Dashboard component)
- `src/microservices/core-ui/components/SystemStatus.tsx`

**New Features**:
- Live investigation counter
- Active agents display
- Recent activity feed
- System-wide metrics

### 5.4 Add Real-Time WebSocket Support ✅
**Objective**: Integrate our useWebSocket hook for live updates

**Changes**:
- Add `useWebSocket` hook to CoreUIApp
- Connect to backend WebSocket endpoint
- Subscribe to system-wide events
- Update UI based on real-time events

**New WebSocket Events**:
```typescript
// System events
'system:status' - Backend health updates
'system:metrics' - System-wide metrics
'system:alert' - Critical system alerts

// Investigation events
'investigation:created' - New investigation started
'investigation:updated' - Investigation status change
'investigation:completed' - Investigation finished

// Agent events
'agent:started' - Agent began execution
'agent:completed' - Agent finished
'agent:error' - Agent encountered error
```

**Files to Create/Modify**:
- `src/microservices/core-ui/hooks/useSystemWebSocket.ts` (new)
- `src/microservices/core-ui/CoreUIApp.tsx`

### 5.5 Dashboard Enhancement with Shared Components ✅
**Objective**: Create a rich dashboard using our component library

**Current Dashboard**: Simple service card grid
**Enhanced Dashboard**: Rich data visualization with real-time updates

**New Dashboard Sections**:

1. **Quick Stats Row**
   - Uses `<Card />` components
   - Shows: Active Investigations, Running Agents, Completed Today, Success Rate
   - Real-time updates via stores

2. **Recent Investigations Table**
   - Uses our `<Table />` component
   - Sortable columns
   - Pagination
   - Live status updates
   - Click to view details

3. **Agent Activity Panel**
   - Uses `<Card />` with `<Tabs />`
   - Tabs: Active, Recent, All Agents
   - Uses agent store for data
   - Color-coded status badges

4. **System Health Widget**
   - Uses `<Badge />` for status indicators
   - Backend status: Connected / Disconnected
   - WebSocket status: Active / Reconnecting
   - Database status: Healthy / Degraded
   - Uses `useServiceHealth` hook

**Files to Modify**:
- `src/microservices/core-ui/CoreUIApp.tsx` (Dashboard component - can be large, no size limit)

### 5.6 Add Date Formatting Throughout ✅
**Objective**: Use our date utilities consistently

**Changes**:
- Format all timestamps with `formatRelativeTime()`
- Use `formatDuration()` for execution times
- Display dates with `formatDate()` utility
- Add "Last active" indicators with relative times

**Files to Modify**:
- All components displaying dates/times
- UserProfile component
- SystemStatus component
- Dashboard components

### 5.7 Implement Advanced Notifications ✅
**Objective**: Enhance notification system with our utilities

**Current**: Basic toast notifications
**Enhanced**: Rich notifications with actions, persistence, and grouping

**New Features**:
- Use our Toast component variants (success, error, warning, info)
- Group related notifications
- Dismissible with keyboard shortcuts
- Persistent notifications for critical alerts
- Action buttons in notifications (View, Dismiss, Retry)

**Files to Modify**:
- `src/microservices/core-ui/components/NotificationSystem.tsx`

### 5.8 Add Validation to Forms ✅
**Objective**: Use our Zod validators for all form inputs

**Forms to Enhance**:
1. Login form - email and password validation
2. User profile form - validate profile updates
3. Settings forms - validate configuration
4. Search forms - validate search criteria

**Validation Patterns**:
```typescript
import { entityValidation } from '@shared/validation/entityValidation';
import { timeRangeValidation } from '@shared/validation/timeRangeValidation';

// Example: Email validation
const emailSchema = z.string().email();
const result = emailSchema.safeParse(email);
if (!result.success) {
  setError(result.error.format());
}
```

**Files to Modify**:
- `src/microservices/core-ui/CoreUIApp.tsx` (LoginPage)
- `src/microservices/core-ui/components/UserProfile.tsx`

### 5.9 Create Service Status Dashboard ✅
**Objective**: Add comprehensive service health monitoring

**New Component**: `ServiceHealthDashboard.tsx`

**Features**:
- Grid of all microservices with status
- Uses `useServiceHealth` hook per service
- Color-coded status indicators:
  - 🟢 Healthy - Service responding normally
  - 🟡 Degraded - Service slow or partial failure
  - 🔴 Down - Service not responding
  - ⚪ Unknown - Status not yet determined
- Click service card to view detailed metrics
- Real-time updates via WebSocket
- Historical uptime data

**Service Health Metrics**:
```typescript
interface ServiceHealth {
  serviceName: string;
  status: 'healthy' | 'degraded' | 'down' | 'unknown';
  lastCheck: Date;
  responseTime: number; // ms
  errorCount: number;
  uptime: number; // percentage
  version: string;
}
```

**Files to Create**:
- `src/microservices/core-ui/components/ServiceHealthDashboard.tsx`
- `src/microservices/core-ui/hooks/useServiceHealthMonitoring.ts`

### 5.10 Implement Search and Filter System ✅
**Objective**: Add global search using our useFilterState hook

**New Component**: `GlobalSearch.tsx`

**Features**:
- Search across all investigations
- Filter by status, date range, agent type
- Uses `useFilterState` hook
- Uses `useDebounce` for search input
- Results displayed in our `<Table />` component
- Quick filters with `<Badge />` components

**Search Capabilities**:
- Investigation ID
- Entity values (email, device ID, IP, etc.)
- Agent names
- Date ranges
- Status (draft, in_progress, completed, error)

**Files to Create**:
- `src/microservices/core-ui/components/GlobalSearch.tsx`
- `src/microservices/core-ui/hooks/useGlobalSearch.ts`

## Implementation Order

### Priority 1: Core Enhancements (Week 1)
1. ✅ 5.1 - Authentication with new components
2. ✅ 5.6 - Date formatting utilities
3. ✅ 5.8 - Form validation with Zod

### Priority 2: Dashboard & Real-Time (Week 2)
4. ✅ 5.4 - WebSocket integration
5. ✅ 5.5 - Dashboard enhancement
6. ✅ 5.3 - State management integration

### Priority 3: Advanced Features (Week 3)
7. ✅ 5.2 - Main layout upgrade
8. ✅ 5.7 - Advanced notifications
9. ✅ 5.9 - Service health dashboard

### Priority 4: Search & Polish (Week 4)
10. ✅ 5.10 - Global search system
11. ✅ Testing and bug fixes
12. ✅ Performance optimization
13. ✅ Documentation updates

## Technical Specifications

### Environment Variables (Configuration-Driven)
```bash
# Core UI Configuration
REACT_APP_CORE_UI_PORT=3006
REACT_APP_ENABLE_WEBSOCKET=true
REACT_APP_ENABLE_REAL_TIME_UPDATES=true
REACT_APP_ENABLE_SERVICE_HEALTH_MONITORING=true

# WebSocket Configuration
REACT_APP_WS_URL=ws://localhost:8090/ws
REACT_APP_WS_RECONNECT_INTERVAL=3000
REACT_APP_WS_MAX_RECONNECT_ATTEMPTS=5

# Dashboard Configuration
REACT_APP_DASHBOARD_REFRESH_INTERVAL=30000
REACT_APP_MAX_RECENT_INVESTIGATIONS=10
REACT_APP_MAX_ACTIVE_AGENTS=20

# Notification Configuration
REACT_APP_NOTIFICATION_AUTO_DISMISS_DELAY=5000
REACT_APP_NOTIFICATION_MAX_VISIBLE=3
REACT_APP_ENABLE_NOTIFICATION_SOUNDS=false
```

### Component Dependencies
```typescript
// Phase 1-4 Components Used
import { Button, Input, Card, Badge, Tabs, Table } from '@shared/components/ui';

// Phase 1-4 Hooks Used
import { useWebSocket, useDebounce, usePrevious, useAsync, useServiceHealth, useFilterState } from '@shared/hooks';

// Phase 1-4 Stores Used
import { useInvestigationStore } from '@shared/stores/investigationStore';
import { useAgentStore } from '@shared/stores/agentStore';

// Phase 1-4 Utilities Used
import { formatDate, formatRelativeTime, formatDuration } from '@shared/utils/date';
import { entityValidation, timeRangeValidation } from '@shared/validation';
```

### WebSocket Event Handling Pattern
```typescript
// In CoreUIApp or custom hook
const { send, on, off, isConnected } = useWebSocket({
  url: process.env.REACT_APP_WS_URL,
  autoConnect: true,
  reconnect: true,
  reconnectDelay: Number(process.env.REACT_APP_WS_RECONNECT_INTERVAL),
  maxReconnectAttempts: Number(process.env.REACT_APP_WS_MAX_RECONNECT_ATTEMPTS)
});

// Subscribe to events
useEffect(() => {
  const unsubscribe = on('system:status', (data) => {
    // Update system status
  });

  return unsubscribe;
}, [on]);
```

### Store Integration Pattern
```typescript
// In Dashboard component
const investigations = useInvestigationStore(state => state.investigations);
const addInvestigation = useInvestigationStore(state => state.addInvestigation);
const agents = useAgentStore(state => state.agents);
const updateAgentStatus = useAgentStore(state => state.updateStatus);

// Subscribe to WebSocket events and update stores
useEffect(() => {
  const unsubscribeInvestigation = on('investigation:created', (data) => {
    addInvestigation(data);
  });

  const unsubscribeAgent = on('agent:started', (data) => {
    updateAgentStatus(data.agentId, 'running');
  });

  return () => {
    unsubscribeInvestigation();
    unsubscribeAgent();
  };
}, [on, addInvestigation, updateAgentStatus]);
```

## Success Criteria

### Phase 5 Complete When:
1. ✅ All shared UI components integrated
2. ✅ WebSocket real-time updates working
3. ✅ Investigation and agent stores connected
4. ✅ Date formatting consistent throughout
5. ✅ Form validation implemented
6. ✅ Dashboard shows live data
7. ✅ Service health monitoring active
8. ✅ Global search functional
9. ✅ All tests passing
10. ✅ Build successful
11. ✅ No TypeScript errors
12. ✅ Performance acceptable

### Performance Targets
- Initial load time: < 2 seconds
- Time to interactive: < 3 seconds
- WebSocket reconnection: < 5 seconds
- Dashboard refresh rate: <= 30 seconds
- Search response time: < 500ms

### Quality Metrics
- TypeScript coverage: 100%
- Component test coverage: >= 80%
- Integration test coverage: >= 70%
- E2E test coverage: >= 50%
- Zero console errors in production build
- Zero accessibility violations

## Testing Strategy

### Unit Tests
```typescript
// Test authentication with new components
describe('LoginPage', () => {
  it('validates email format with Zod', () => {});
  it('uses Input component with validation', () => {});
  it('uses Button component for submit', () => {});
  it('debounces email validation', () => {});
});

// Test dashboard with stores
describe('Dashboard', () => {
  it('displays investigations from store', () => {});
  it('updates on WebSocket events', () => {});
  it('formats dates with formatRelativeTime', () => {});
  it('shows agent status from store', () => {});
});
```

### Integration Tests
```typescript
// Test WebSocket + Store integration
describe('Real-time Updates', () => {
  it('receives investigation:created event', () => {});
  it('updates investigation store', () => {});
  it('reflects in dashboard UI', () => {});
});

// Test service health monitoring
describe('Service Health', () => {
  it('monitors all microservices', () => {});
  it('updates status indicators', () => {});
  it('shows alerts for degraded services', () => {});
});
```

### E2E Tests (Playwright)
```typescript
test('Core UI full flow', async ({ page }) => {
  // Login
  await page.goto('/login');
  await page.fill('input[type="email"]', 'demo@olorin.com');
  await page.fill('input[type="password"]', 'password');
  await page.click('button[type="submit"]');

  // Dashboard loads
  await expect(page).toHaveURL('/');
  await expect(page.locator('h1')).toContainText('Olorin Investigation Platform');

  // WebSocket connects
  await expect(page.locator('[data-testid="ws-status"]')).toHaveText('Active');

  // Recent investigations table visible
  await expect(page.locator('[data-testid="investigations-table"]')).toBeVisible();

  // Service health indicators present
  await expect(page.locator('[data-testid="service-health"]')).toBeVisible();
});
```

## Migration Path from Phase 4 to Phase 5

### Before (Phase 4):
- Core UI exists with basic functionality
- No integration with shared components
- No real-time updates
- No state management stores
- Static data displays

### After (Phase 5):
- Core UI fully integrated with Phase 1-4 work
- All shared components in use
- Real-time WebSocket updates
- Connected to investigation and agent stores
- Live data throughout UI
- Consistent styling and patterns
- Production-ready shell application

## Risk Mitigation

### Identified Risks

1. **WebSocket Connection Failures**
   - **Risk**: WebSocket may not connect in all environments
   - **Mitigation**: Implement automatic fallback to polling
   - **Implementation**: Check connection status, switch to REST polling if WebSocket unavailable

2. **Store Performance with Large Datasets**
   - **Risk**: Large numbers of investigations/agents may slow UI
   - **Mitigation**: Implement pagination and virtualization
   - **Implementation**: Use React Virtual for lists, paginate API calls

3. **Component Compatibility**
   - **Risk**: Shared components may not work in all contexts
   - **Mitigation**: Thorough testing in Core UI context
   - **Implementation**: Component integration tests, visual regression tests

4. **Real-Time Update Overload**
   - **Risk**: Too many WebSocket events may overwhelm UI
   - **Mitigation**: Implement event throttling and batching
   - **Implementation**: Use useDebounce for UI updates, batch store updates

## Next Steps After Phase 5

### Phase 6: Investigation Service
- Migrate investigation components
- Implement Investigation Wizard (Feature 004)
- Connect to investigation store
- Full WebSocket integration for investigation updates

### Phase 7: Agent Analytics Service
- Migrate agent monitoring components
- Connect to agent store
- Real-time agent performance metrics
- Historical analytics and charts

### Phase 8: Remaining Services
- RAG Intelligence Service
- Visualization Service
- Reporting Service

## Conclusion

Phase 5 transforms the Core UI from a basic shell into a production-ready application hub that:
- ✅ Uses all Phase 1-4 shared infrastructure
- ✅ Provides real-time updates across all services
- ✅ Maintains consistent design patterns
- ✅ Monitors service health
- ✅ Enables seamless navigation between microservices
- ✅ Serves as the foundation for all other services

This creates a solid platform for rapid microservice development while maintaining code quality, consistency, and user experience.

---

## References

- **Foundation Work**: Phase 1-4 Summary (phase-1-4-refactoring-summary-2025-11-06.md)
- **Component Library**: `/src/shared/components/ui/`
- **Hooks Library**: `/src/shared/hooks/`
- **Store Library**: `/src/shared/stores/`
- **Utilities**: `/src/shared/utils/`
- **Validation**: `/src/shared/validation/`

## Sign-Off

**Completion Status**: 🔄 IN PROGRESS
**Next Review**: After Priority 1 tasks complete
**Estimated Completion**: 4 weeks (phased rollout)

Phase 5 builds directly on the solid foundation from Phase 1-4, creating a cohesive and powerful Core UI service that sets the standard for all other microservices.
