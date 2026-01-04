# Quick Start Guide: Enhanced Progress Wizard Page

**Feature**: 007-progress-wizard-page
**Branch**: `007-progress-wizard-page`
**Status**: Planning Phase
**Last Updated**: 2025-10-31

This guide provides quick setup instructions for developers working on the Enhanced Progress Wizard Page feature.

## Prerequisites

Before starting development, ensure you have:

- Node.js 18+ and npm installed
- Olorin repository cloned and dependencies installed
- Access to GAIA web plugin repository for reference
- Understanding of React 18 hooks and TypeScript
- Familiarity with Tailwind CSS
- Knowledge of Olorin's microservices architecture

## Quick Setup

### 1. Checkout Feature Branch

```bash
cd /Users/gklainert/Documents/olorin
git checkout 007-progress-wizard-page
```

### 2. Install Dependencies

```bash
cd olorin-front
npm install
```

### 3. Review Documentation

Read these files in order to understand the feature:

1. **Specification**: `specs/007-progress-wizard-page/spec.md`
   - User stories and acceptance criteria
   - Functional requirements (FR-001 to FR-020)
   - Success criteria and edge cases

2. **Research**: `specs/007-progress-wizard-page/research.md`
   - GAIA component analysis
   - Integration strategy
   - Technical dependencies

3. **Data Model**: `specs/007-progress-wizard-page/data-model.md`
   - TypeScript interfaces
   - Data transformation functions
   - Backend response structures

4. **Contracts**: `specs/007-progress-wizard-page/contracts/data-adapters.ts`
   - Adapter function interfaces
   - Type guards and validators
   - Constants and configurations

## Key Files and Locations

### GAIA Source Components (Reference Only)

```
/Users/gklainert/Documents/Gaia/gaia-webplugin/src/js/
├── pages/wizard/
│   └── InvestigationProgressPage.tsx       # Main progress page
├── components/wizard/
│   ├── progress/
│   │   └── ConnectionStatusHeader.tsx      # Status header with controls
│   ├── ekg/
│   │   ├── EnhancedEKGMonitor.tsx         # EKG waveform monitor
│   │   ├── WaveformDisplay.tsx            # Canvas P-Q-R-S-T waveform
│   │   ├── MetricsGaugesGrid.tsx          # Tool statistics gauges
│   │   └── AgentBreakdownGauges.tsx       # Per-agent tool breakdowns
│   ├── gauges/
│   │   ├── AgentRiskGaugesSection.tsx     # 6 agent risk gauges
│   │   └── LuxGaugesDashboard.tsx         # Circular risk gauges
│   ├── radar/
│   │   └── InvestigationRadarView.tsx     # 360° agent radar
│   └── graph/
│       └── EntityCorrelationGraph.tsx      # Entity relationship graph
└── hooks/
    └── useProgressData.ts                  # Polling hook for progress data
```

### Olorin Target Location

```
/Users/gklainert/Documents/olorin/olorin-front/src/
├── microservices/investigation/
│   ├── pages/
│   │   └── ProgressPage.tsx                # Target page to enhance
│   ├── components/
│   │   ├── ConnectionStatusHeader.tsx      # New: Port from GAIA
│   │   ├── EnhancedEKGMonitor.tsx         # New: Port from GAIA
│   │   ├── AgentRiskGaugesSection.tsx     # New: Port from GAIA
│   │   └── [other GAIA components]        # New: Additional components
│   ├── hooks/
│   │   └── useProgressData.ts              # New: Polling hook
│   └── services/
│       └── dataAdapters.ts                 # New: Data transformation layer
└── shared/
    └── types/
        └── investigation.ts                 # Enhanced types from data-model.md
```

## Running the Progress Page

### 1. Start Backend Services

```bash
cd /Users/gklainert/Documents/olorin
npm run olorin -- --log-level info
```

This starts:
- Backend API on port 8090
- Frontend on port 3000

### 2. Navigate to Progress Page

The progress page is accessible within an active investigation workflow:

1. Open browser to http://localhost:3000
2. Create or select an investigation
3. Navigate through the wizard to the Progress step
4. The enhanced progress page should display with all GAIA components

### 3. Monitor Real-Time Updates

The page polls for updates every 3 seconds. Watch the console for:

```
[ProgressPage] Polling started
[ProgressPage] Fetched progress: { status: 'running', toolsCompleted: 5/20, ... }
[ProgressPage] Polling stopped (investigation completed)
```

## Testing with Sample Data

### Backend Mock Endpoints

During development, use mock investigation data:

```bash
# Create test investigation
curl -X POST http://localhost:8090/api/v1/investigations \
  -H "Content-Type: application/json" \
  -d '{
    "entities": [{"type": "email", "value": "test@example.com"}],
    "timeRange": {"start": "2025-10-15", "end": "2025-10-16"}
  }'

# Poll for progress
curl http://localhost:8090/api/v1/investigations/{id}/progress
```

### Frontend Testing

```bash
cd olorin-front
npm test -- ProgressPage.test.tsx
```

Expected test coverage:
- Component rendering with all GAIA components
- Data adapter transformations
- Polling behavior (start, stop, error handling)
- Terminal status detection
- Agent status derivation from tool executions

## Development Workflow

### 1. Component Porting Strategy

Port GAIA components in this order (highest priority first):

1. **ConnectionStatusHeader** (FR-001)
   - Simple layout component with status display
   - Requires: Status mapping, control handlers

2. **useProgressData Hook** (FR-009)
   - Polling logic with 3-second interval
   - Terminal status detection
   - **CRITICAL**: Memoize API service instance (FR-011)

3. **Data Adapter Layer** (FR-015)
   - Implement all adapter functions from contracts/data-adapters.ts
   - Transform Olorin backend responses to GAIA prop formats
   - Handle missing agentStatuses array

4. **EnhancedEKGMonitor** (FR-002)
   - Complex canvas rendering
   - BPM calculation: `Math.round(40 + toolsPerSec * 6)`
   - Requires: Tool statistics from adapters

5. **AgentRiskGaugesSection** (FR-003)
   - Always display all 6 agents
   - Risk score aggregation from tool executions
   - Color-coded severity indicators

6. **Additional Components** (FR-004 to FR-008)
   - InvestigationRadarView
   - EntityCorrelationGraph
   - CollaborationOverlay (if collaboration enabled)

### 2. Data Transformation Process

For each component, implement the adapter function:

```typescript
// Example: ConnectionStatusHeader
import { adaptToConnectionStatus } from '../services/dataAdapters';

function ProgressPage() {
  const { progress, isPolling } = useProgressData(investigationId);

  const headerProps = adaptToConnectionStatus(
    progress,
    isPolling,
    {
      onPause: () => pauseInvestigation(investigationId),
      onCancel: () => cancelInvestigation(investigationId),
      onResume: () => resumeInvestigation(investigationId)
    }
  );

  return <ConnectionStatusHeader {...headerProps} />;
}
```

### 3. Validation Checklist

Before marking a component complete:

- [ ] Component renders correctly with Olorin data
- [ ] All props match GAIA component interface
- [ ] Data adapter handles null/undefined gracefully
- [ ] Polling works correctly (starts, stops on terminal status)
- [ ] Risk scores calculate correctly (0-100 scale)
- [ ] All 6 agents display (even if inactive)
- [ ] Colors match GAIA Design System
- [ ] Responsive layout works on mobile
- [ ] Unit tests pass with ≥85% coverage
- [ ] TypeScript compiles without errors
- [ ] File size < 200 lines (split if needed)

## Common Issues and Solutions

### Issue 1: Infinite Polling Loop

**Symptom**: useEffect triggers polling on every render

**Cause**: API service instance recreated on each render

**Solution**: Memoize the API service (FR-011)

```typescript
const apiService = useMemo(
  () => new InvestigationProgressService(investigationId),
  [investigationId]
);
```

### Issue 2: Missing agentStatuses Array

**Symptom**: Adapter receives progress without agentStatuses

**Cause**: Olorin backend doesn't include agentStatuses in response

**Solution**: Use buildAgentStatuses() helper to derive from toolExecutions

```typescript
const agents = progress.agentStatuses
  ?? buildAgentStatuses(progress.toolExecutions);
```

### Issue 3: Risk Score Out of Range

**Symptom**: Risk gauges show values > 100 or NaN

**Cause**: Backend returns 0-1 scale, GAIA expects 0-100

**Solution**: Normalize in extractRiskScore()

```typescript
function extractRiskScore(tool: ToolExecution): number | null {
  const raw = tool.result?.riskScore ?? tool.result?.risk;
  if (raw == null) return null;
  return raw <= 1 ? raw * 100 : raw; // Normalize 0-1 to 0-100
}
```

### Issue 4: EKG Waveform Not Animating

**Symptom**: Canvas shows static line, no waveform movement

**Cause**: Missing requestAnimationFrame loop or incorrect BPM calculation

**Solution**: Verify animate() function runs at 60 FPS

```typescript
const animate = useCallback(() => {
  // Draw waveform
  animationFrameRef.current = requestAnimationFrame(animate);
}, [/* dependencies */]);

useEffect(() => {
  animate();
  return () => cancelAnimationFrame(animationFrameRef.current);
}, [animate]);
```

### Issue 5: Agent Colors Don't Match

**Symptom**: Gauge colors differ from GAIA design system

**Cause**: Hardcoded colors instead of using AGENT_COLORS constant

**Solution**: Import and use AGENT_COLORS from constants

```typescript
import { AGENT_COLORS } from '../constants';

<CircularProgressGauge
  color={AGENT_COLORS[agentType].primary}
  secondaryColor={AGENT_COLORS[agentType].secondary}
/>
```

## Performance Optimization

### Critical Performance Requirements

Per SC-011 to SC-014, the page must maintain:

- **Canvas Rendering**: 60 FPS for EKG waveform
- **Polling Overhead**: <50ms per request
- **Bundle Size**: <500KB for progress page code
- **Memory Usage**: <100MB with 1000+ tool executions

### Optimization Techniques

1. **Memoization**: Use useMemo for expensive calculations
2. **Lazy Loading**: Code-split EntityCorrelationGraph (large dependency)
3. **Canvas Optimization**: Batch canvas operations, avoid unnecessary redraws
4. **Data Throttling**: Limit anomaly array to top 10 for radar
5. **Windowing**: If tool list > 100 items, use virtual scrolling

## Next Steps

After reviewing this quickstart:

1. **Read all documentation** in specs/007-progress-wizard-page/
2. **Set up development environment** per instructions above
3. **Review GAIA source components** to understand behavior
4. **Wait for implementation tasks** to be generated via `/speckit.tasks`
5. **Follow task order** for systematic component porting

## Support and References

### Documentation

- **Specification**: `specs/007-progress-wizard-page/spec.md`
- **Research**: `specs/007-progress-wizard-page/research.md`
- **Data Model**: `specs/007-progress-wizard-page/data-model.md`
- **Contracts**: `specs/007-progress-wizard-page/contracts/data-adapters.ts`
- **Implementation Plan**: `specs/007-progress-wizard-page/plan.md` (when complete)
- **Tasks Breakdown**: `specs/007-progress-wizard-page/tasks.md` (when generated)

### Technical Resources

- **GAIA Design System**: Context provided in olorin-front/CLAUDE.md
- **Olorin Architecture**: docs/architecture/ (read all documentation as per rule 0.1)
- **Tailwind CSS**: https://tailwindcss.com/docs
- **React 18 Hooks**: https://react.dev/reference/react
- **Zustand State**: https://github.com/pmndrs/zustand

### Troubleshooting

For issues not covered here:

1. Check browser console for errors
2. Verify backend logs for API errors
3. Review data adapter transformations in debugger
4. Compare with GAIA component behavior
5. Consult data-model.md for data structure details

---

**Ready to proceed?** Wait for implementation tasks to be generated, then start with Task 1 (highest priority component).
