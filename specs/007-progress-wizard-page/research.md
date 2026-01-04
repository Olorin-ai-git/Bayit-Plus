# Research: GAIA Progress Page Components for Olorin Integration

**Feature**: 007-progress-wizard-page
**Date**: 2025-10-31
**Researcher**: Implementation Planning Agent
**Spec**: [spec.md](./spec.md)

## Executive Summary

This research document analyzes ALL components in the GAIA Investigation Progress Page and defines the integration strategy for implementing them in Olorin with real investigation data. The GAIA progress page uses a sophisticated polling-based real-time update system with rich visualizations that need to be adapted for Olorin's investigation workflow.

## Component Inventory from GAIA

### Core Page Structure
**File**: `/Users/gklainert/Documents/Gaia/gaia-webplugin/src/js/pages/wizard/InvestigationProgressPage.tsx` (275 lines)

**Main Component**: `InvestigationProgressPage` / `InvestigationProgressPageContent`
- Purpose: Step 2 of 3-step Investigation Wizard
- Function: Real-time monitoring of investigation execution
- Data Source: Polling `/progress` endpoint every 3 seconds
- State Management: React hooks + Redux dispatch

### Component Hierarchy

```
InvestigationProgressPage
├── ConnectionStatusHeader (header controls)
├── EnhancedEKGMonitor (activity visualization)
├── ProgressRiskSection (collapsible)
│   ├── AgentRiskGaugesSection
│   └── InvestigationRadarView
├── ProgressCorrelationSection (collapsible, conditional)
│   └── EntityCorrelationGraph
└── CollaborationOverlay (team features)
```

## Detailed Component Analysis

### 1. ConnectionStatusHeader

**Location**: `gaia-webplugin/src/js/components/wizard/progress/ConnectionStatusHeader.tsx` (233 lines)

**Purpose**: Consolidated connection & activity status header with investigation controls

**Props Interface**:
```typescript
{
  investigationStatus: 'pending' | 'draft' | 'running' | 'submitted' | 'paused' | 'completed' | 'failed' | 'cancelled',
  isConnected: boolean,
  toolsPerSec?: number,
  isProcessing?: boolean,
  onPause?: () => void,
  onCancel?: () => void,
  onResume?: () => void
}
```

**Layout**: 3-section responsive design
- Left: Activity Badge + Connection Indicator + Status Badge
- Center: (empty, can be used for status display)
- Right: Action buttons (Pause/Cancel/Resume based on status)

**Key Features**:
- Real-time connection status with colored indicators
- Tools per second activity metric
- Dynamic action buttons based on investigation state
- Responsive flex layout (sm:flex-row)
- GAIA corporate colors for status badges

**Dependencies**:
- `ConnectionIndicator` component (connection status visualization)
- `ActivityBadge` component (tools/sec metric display)
- Tailwind CSS for styling
- No direct state management (controlled component)

**Olorin Integration Notes**:
- Map Olorin investigation status to GAIA status enum
- Connect to Olorin polling system for isConnected prop
- Implement pause/cancel/resume API calls
- Use existing Olorin connection status from Redux

---

### 2. EnhancedEKGMonitor

**Location**: `gaia-webplugin/src/js/components/wizard/ekg/EnhancedEKGMonitor.tsx` (341 lines)

**Purpose**: Medical-grade EKG activity monitor with real-time metrics and P-Q-R-S-T waveform

**Props Interface**:
```typescript
{
  progress: number,  // percentage 0-100
  completed: number,
  running: number,
  queued: number,
  failed: number,
  isConnected: boolean,
  expectedTotal?: number,
  investigationProgress: InvestigationProgress,
  investigationResults?: InvestigationResults,
  iceConnectionStatus?: ConnectionStatus,
  investigationId?: string
}
```

**Key Features**:
- 60 FPS canvas-based P-Q-R-S-T waveform animation
- BPM calculation: `40 + (toolsPerSec × 6)`
- Dedicated `/ekg-statistics` endpoint polling (3 seconds)
- Real-time metrics gauges grid
- Agent filter dropdown for per-agent statistics
- Agent breakdown gauges from toolFlows
- Responsive canvas sizing based on container width

**Data Sources**:
1. **EKG Statistics Endpoint** (`useEKGStatistics` hook):
   - toolsPerSecond, peakToolsPerSecond
   - completed, running, queued, failed, skipped counts
   - percentage, status, totalExecutions
   - perAgent breakdown (optional)

2. **Investigation Progress** (fallback):
   - toolFlows array for agent-level breakdowns
   - riskMetrics.byAgent for agent risk scores

**Sub-Components**:
- `WaveformDisplay`: P-Q-R-S-T waveform with BPM display
- `MetricsGaugesGrid`: Circular gauges for tool counts
- `AgentFilterDropdown`: Filter by specific agent(s)
- `AgentBreakdownGauges`: Per-agent tool execution breakdown
- `AgentMetricsDisplay`: Agent-level statistics table

**State Management**:
- Local state for agent filter selection (string | null | Set<string>)
- useMemo for BPM calculation and status determination
- useEffect for container width measurement

**Olorin Integration Notes**:
- Adapt to Olorin's toolExecutions array structure
- Map Olorin agent types to GAIA agent types
- Implement EKG statistics endpoint or use existing progress data
- Ensure canvas performance with large tool counts
- Test with Olorin's 6 agents (Device, Location, Logs, Network, Labels, Risk)

---

### 3. AgentRiskGaugesSection

**Location**: `gaia-webplugin/src/js/components/wizard/gauges/AgentRiskGaugesSection.tsx` (450 lines)

**Purpose**: Collapsible section with real-time agent risk gauges using Lux design

**Props Interface**:
```typescript
{
  investigationId: string,
  agents: AgentStatus[],
  isConnected: boolean,
  onConfigChange?: (config: RiskConfiguration) => void,
  initialConfig?: RiskConfiguration,
  defaultExpanded?: boolean,
  investigationProgress: InvestigationProgress,
  investigationResults?: InvestigationResults
}
```

**Key Features**:
- All 6 agents always displayed (Device, Location, Logs, Network, Labels, Risk)
- Circular Lux-style risk gauges with:
  - Risk score 0-100 (color-coded: gray/green/amber/red)
  - Tools completed / total tools
  - Pulsing animation for severe risk (≥70)
  - Agent status indicator (pending/running/completed/failed)
- Risk calculation from toolFlows:
  - Extracts risk from individual tool executions
  - Aggregates per agent (average of all tools)
  - Normalizes to 0-1 scale
- localStorage configuration for thresholds

**Data Extraction Logic**:
```typescript
// Risk from toolFlows (authoritative source)
function calculateRiskPerAgentFromToolFlows(toolFlows) {
  // Aggregate risk from flow.result.riskScore || flow.riskScore
  // Average across all tools per agent
  // Normalize to 0-1 scale
}

// Agent statuses from backend or built from toolFlows
function buildAgentStatusesFromToolFlows(toolFlows) {
  // Group by agentType
  // Count completed vs total tools
  // Determine running/completed status
}
```

**Sub-Components**:
- `LuxGaugesDashboard`: Renders grid of 6 agent gauges
- `CircularProgressGauge`: Individual gauge with SVG circular progress
- Agent color schemes (AGENT_COLORS constant)

**Olorin Integration Notes**:
- Map Olorin toolExecutions to toolFlows format
- Ensure agentType field exists on tool executions
- Extract riskScore from Olorin tool results
- Implement risk aggregation per agent
- Test with Olorin's 6 agent types
- Verify color transitions at thresholds (40, 60, 80)

---

### 4. InvestigationRadarView

**Location**: `gaia-webplugin/src/js/components/InvestigationPage/radar/InvestigationRadarView.tsx` (referenced but file not examined)

**Purpose**: 360-degree radar visualization of agent positions and anomaly blips

**Expected Props** (from GAIA usage):
```typescript
{
  investigationId: string,
  sandbox: SandboxContext,
  entityId: string,
  entityType: string,
  userId: string,
  investigationProgress: InvestigationProgress,
  investigationResults?: InvestigationResults
}
```

**Key Features** (inferred from spec):
- Circular radar with 6 agent positions around perimeter
- Anomaly blips with severity-based colors (low/medium/high/critical)
- Interactive hover tooltips showing:
  - Anomaly type and description
  - Severity level
  - Timestamp
  - Affected entity
- Agent filtering to show/hide specific agent anomalies
- Animation as new anomalies appear
- Max 10 most recent/severe anomalies visible

**Olorin Integration Notes**:
- Map Olorin anomaly detections to radar blips
- Position agents at consistent angles (Device: 0°, Location: 60°, etc.)
- Color-code anomalies by severity from Olorin data
- Extract anomalies from investigation results or progress
- Test with multi-entity investigations

---

### 5. EntityCorrelationGraph

**Location**: `gaia-webplugin/src/js/components/InvestigationPage/LazyComponents.tsx` → `LazyEntityCorrelationGraph`

**Purpose**: Network graph visualization of entities and their relationships

**Expected Props** (from GAIA usage):
```typescript
{
  investigationId: string,
  apiService?: ApiService,
  width: number,
  height: number,
  layout: 'force' | 'hierarchical' | 'circular',
  showMetrics: boolean,
  collapsible: boolean,
  minimizable: boolean,
  enablePolling: boolean,
  pollInterval: number  // 30000ms default
}
```

**Key Features**:
- Lazy-loaded component for performance
- Force-directed graph layout with vis-network
- Entities as nodes, relationships as edges
- Edge thickness reflects relationship strength (0-100)
- Interactive node clicking and selection
- Real-time updates via polling
- Metrics overlay showing entity count and relationship count

**Data Structure** (inferred):
```typescript
{
  entities: [{ id, type, value, label }],
  relationships: [{
    source: entityId,
    target: entityId,
    type: 'shared_device' | 'shared_location' | 'shared_behavior',
    strength: 0-100,
    timestamp: Date,
    evidence: ToolExecution[]
  }]
}
```

**Olorin Integration Notes**:
- Map Olorin entities to graph nodes
- Extract relationships from investigation progress
- Calculate relationship strength from shared attributes
- Use vis-network or similar for graph rendering
- Lazy-load to avoid performance impact
- Only show when 2+ entities in investigation

---

### 6. CollaborationOverlay

**Location**: `gaia-webplugin/src/js/components/wizard/CollaborationOverlay.tsx` (referenced but not detailed)

**Purpose**: Team-based investigation features overlay

**Expected Props** (from GAIA usage):
```typescript
{
  investigationId: string,
  isOpen: boolean,
  onClose: () => void,
  messages: Message[],
  relatedInvestigations: Investigation[],
  teamMembers: TeamMember[],
  aiContext: AIContext | null,
  onSendMessage: (message: string) => void,
  onTypingStatusChange: (isTyping: boolean) => void
}
```

**Key Features** (inferred):
- Modal/drawer overlay for collaboration
- Real-time messaging between team members
- Related investigations discovery
- AI context and recommendations
- Typing indicators
- Team member presence

**Olorin Integration Notes**:
- Lower priority (P3) - implement after core features
- May require backend collaboration API
- Consider WebSocket for real-time messaging
- Integration with Olorin user management

---

## GAIA vs Olorin Comparison

### Similarities

1. **Polling-Based Updates**:
   - Both use 3-second polling interval
   - Both poll `/progress` endpoint
   - Both stop polling on terminal status

2. **React + TypeScript**:
   - Both use React 18 with TypeScript
   - Both use hooks (useState, useEffect, useMemo)
   - Similar component composition patterns

3. **Tailwind CSS**:
   - Both use Tailwind for styling
   - Both avoid Material-UI
   - Similar responsive design patterns

4. **Investigation Structure**:
   - Both have investigation ID
   - Both track tool executions
   - Both have agent statuses
   - Both support multi-entity investigations

### Differences

| Aspect | GAIA | Olorin |
|--------|------|--------|
| **State Management** | Redux + Context | Zustand + hooks |
| **EKG Statistics** | Dedicated `/ekg-statistics` endpoint | Derive from progress data |
| **Agent Risk Data** | byAgent in riskMetrics | Need to calculate from toolExecutions |
| **Component Organization** | Flat component structure | Microservices architecture |
| **Data Fetching** | useProgressData hook with Redux dispatch | Custom polling hooks per feature |
| **Relationship Tracking** | Built-in from backend | Need to derive from results |
| **Collaboration** | CollaborationOverlay component | Not yet implemented |

### Gaps in Olorin

1. **Missing Components** (need to copy from GAIA):
   - ConnectionStatusHeader
   - EnhancedEKGMonitor
   - AgentRiskGaugesSection
   - InvestigationRadarView
   - EntityCorrelationGraph (lazy-loaded)
   - CollaborationOverlay

2. **Missing Hooks** (need to implement or adapt):
   - useProgressData (GAIA-specific, adapt for Olorin)
   - useEKGStatistics (may not need separate endpoint)
   - useAgentRiskUpdates (for ICE events)

3. **Missing Utilities**:
   - getToolExecutionStats (aggregate statistics)
   - calculateBPMDynamic (BPM from tools/sec)
   - calculateRiskPerAgentFromToolFlows (risk aggregation)
   - Agent type mapping (canonical names)

4. **Data Structure Mismatches**:
   - GAIA: `agentStatuses` array in progress response
   - Olorin: Need to derive from `toolExecutions` array
   - GAIA: `riskMetrics.byAgent` object
   - Olorin: Need to calculate from tool risk scores

---

## Integration Strategy

### Phase 1: Foundation Components (P1)

**Goal**: Get basic real-time monitoring working

1. **Copy ConnectionStatusHeader**:
   - Direct copy with minimal changes
   - Map Olorin status enum to GAIA enum
   - Connect to Olorin polling state
   - Implement pause/cancel/resume handlers

2. **Adapt EnhancedEKGMonitor**:
   - Copy component structure
   - Remove EKG statistics endpoint dependency
   - Calculate metrics from Olorin progress data
   - Test with Olorin toolExecutions format
   - Verify BPM calculation with Olorin tools/sec

3. **Create Data Adapters**:
   - `adaptOlorinProgressToGAIA`: Transform Olorin progress format
   - `calculateToolExecutionStats`: Aggregate from toolExecutions
   - `extractAgentStatuses`: Build agent statuses from tools
   - `calculateAgentRisk`: Aggregate risk scores per agent

### Phase 2: Risk Visualization (P2)

**Goal**: Show agent-specific risk in real-time

1. **Copy AgentRiskGaugesSection**:
   - Direct copy of component
   - Implement risk calculation from Olorin tools
   - Map Olorin agent types to GAIA colors
   - Test gauge animations and thresholds

2. **Copy InvestigationRadarView**:
   - Adapt for Olorin anomaly structure
   - Map agent positions consistently
   - Extract anomalies from Olorin results
   - Implement filtering and hover tooltips

### Phase 3: Advanced Features (P3)

**Goal**: Entity correlation and collaboration

1. **Copy EntityCorrelationGraph**:
   - Lazy-load for performance
   - Extract relationships from Olorin data
   - Calculate relationship strength
   - Conditional rendering (2+ entities)

2. **Copy CollaborationOverlay**:
   - Optional feature (lower priority)
   - May require backend API additions
   - Consider WebSocket for messaging

### Phase 4: Integration & Polish

1. **Update Olorin Progress Page**:
   - Replace existing components with GAIA components
   - Wire up all data adapters
   - Add collapsible sections
   - Test with real investigation data

2. **Styling Consistency**:
   - Apply GAIA corporate colors
   - Ensure responsive layouts
   - Match GAIA component spacing
   - Verify dark theme compatibility

3. **Performance Optimization**:
   - Lazy-load heavy components
   - Memoize expensive calculations
   - Virtualize long lists (logs, tools)
   - Monitor memory usage

---

## Technical Dependencies

### From GAIA (to copy/adapt):
- `/wizard/progress/ConnectionStatusHeader.tsx`
- `/wizard/ekg/EnhancedEKGMonitor.tsx`
- `/wizard/ekg/WaveformDisplay.tsx`
- `/wizard/ekg/MetricsGaugesGrid.tsx`
- `/wizard/ekg/AgentFilterDropdown.tsx`
- `/wizard/ekg/AgentBreakdownGauges.tsx`
- `/wizard/ekg/ConnectionIndicator.tsx`
- `/wizard/ekg/ActivityBadge.tsx`
- `/wizard/gauges/AgentRiskGaugesSection.tsx`
- `/wizard/gauges/LuxGaugesDashboard.tsx`
- `/InvestigationPage/radar/InvestigationRadarView.tsx`
- `/InvestigationPage/LazyComponents.tsx` (EntityCorrelationGraph)
- `/wizard/CollaborationOverlay.tsx`

### Shared Libraries:
- React 18
- TypeScript 4.9+
- Tailwind CSS 3.x
- Zustand (Olorin) vs Redux (GAIA)
- vis-network (for entity graph)
- Canvas API (for EKG waveform)

### Olorin-Specific:
- Wizard store (Zustand)
- Investigation service API
- Polling hooks (adapt GAIA useProgressData)
- Router (React Router)

---

## Implementation Risks & Mitigations

### Risk 1: Data Structure Mismatches
**Impact**: GAIA components expect different data format than Olorin provides

**Mitigation**:
- Create adapter layer between Olorin data and GAIA components
- Write comprehensive data transformation functions
- Add TypeScript interfaces for both formats
- Test transformations with real Olorin investigation data

### Risk 2: Performance with Large Investigations
**Impact**: Canvas animations and large arrays may cause lag

**Mitigation**:
- Lazy-load heavy components (EntityCorrelationGraph)
- Implement virtualization for long lists
- Memoize expensive calculations
- Monitor and profile during development
- Set thresholds for component activation (e.g., hide graph if 50+ entities)

### Risk 3: Real-time Update Reliability
**Impact**: Polling failures or delays cause stale data

**Mitigation**:
- Implement robust polling with exponential backoff
- Show connection status clearly
- Cache last known state during reconnection
- Add manual refresh button
- Display "Last updated" timestamps

### Risk 4: Agent Type Mapping
**Impact**: Olorin agents may not map cleanly to GAIA's 6 agent types

**Mitigation**:
- Create canonical agent type mapping
- Document mapping in code comments
- Add fallback for unknown agent types
- Test with all Olorin agent types

### Risk 5: Missing Backend Endpoints
**Impact**: Some GAIA features rely on endpoints Olorin doesn't have

**Mitigation**:
- Identify required endpoints early (e.g., `/ekg-statistics`)
- Decide if endpoints needed or can derive from `/progress`
- Document any required backend changes
- Gracefully degrade features if endpoints unavailable

### Risk 6: State Management Differences
**Impact**: GAIA uses Redux, Olorin uses Zustand

**Mitigation**:
- Adapt Redux patterns to Zustand
- Keep components as controlled (props-driven)
- Minimize direct store dependencies
- Document state flow clearly

---

## Success Criteria Mapping

| Success Criterion | GAIA Component | Verification Method |
|-------------------|----------------|---------------------|
| SC-001: Load < 2s | All components | Performance profiling |
| SC-002: Updates < 3s | useProgressData hook | Network tab monitoring |
| SC-003: Polling reliability < 5% failure | Polling infrastructure | Error rate logging |
| SC-004: Gauge color transitions | AgentRiskGaugesSection | Visual testing + unit tests |
| SC-005: Connection status < 1s | ConnectionStatusHeader | Connection simulation |
| SC-006: Graph render < 1s | EntityCorrelationGraph | Performance profiling |
| SC-007: Radar anomalies < 2s | InvestigationRadarView | Real-time data testing |
| SC-008: Log stream chronological | (existing component) | Log ordering tests |
| SC-009: Phase accuracy | (existing component) | Phase sync testing |
| SC-010: Terminal state handling | All components | State transition tests |
| SC-011: Collapse animations < 300ms | Section containers | Animation performance |
| SC-012: EKG 60 FPS | EnhancedEKGMonitor | FPS monitoring |
| SC-013: Memory < 50MB | All components | Memory profiling |
| SC-014: Timeline scrolling 200+ | (existing component) | Virtualization testing |
| SC-015: Polling recovery | useProgressData hook | Failure simulation |

---

## Next Steps

1. **Phase 1 (P1)**: Create data model mapping GAIA and Olorin structures
2. **Phase 1 (P1)**: Define API contracts for data adapters
3. **Phase 1 (P1)**: Write quickstart guide for component integration
4. **Phase 2**: Generate detailed tasks.md with implementation order
5. **Phase 2**: Begin copying components in dependency order
6. **Phase 2**: Implement data adapters and transformations
7. **Phase 3**: Integration testing with real Olorin investigations
8. **Phase 3**: Performance optimization and polish

---

## Conclusion

The GAIA Investigation Progress Page provides a comprehensive, production-ready set of components for real-time investigation monitoring. All components can be successfully integrated into Olorin with a well-designed adapter layer to handle data structure differences. The primary implementation challenge is ensuring data transformation between Olorin's format and GAIA's expected structure, which can be solved with TypeScript interfaces and transformation functions. Performance considerations require lazy-loading and virtualization for heavy components. Overall feasibility is HIGH with an estimated implementation timeline of 3-4 weeks for all 6 user stories.
