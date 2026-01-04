# Tasks: Enhanced Progress Wizard Page with GAIA Components

**Input**: Design documents from `/specs/007-progress-wizard-page/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/data-adapters.ts, quickstart.md

**Feature Branch**: `007-progress-wizard-page`
**Test Coverage Target**: 85% minimum (SC-010)
**Performance Goals**: 60 FPS canvas, <50ms polling, <500KB bundle, <100MB memory

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1-US6)
- Include exact file paths in descriptions

## Path Conventions

This feature uses **Web App** structure:
- **Frontend**: `olorin-front/src/microservices/investigation/`
- **Tests**: `olorin-front/src/microservices/investigation/__tests__/`
- **Shared Types**: `olorin-front/src/shared/types/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and dependency management

- [ ] T001 Verify vis-network 9.x dependency in olorin-front/package.json (for EntityCorrelationGraph)
- [ ] T002 [P] Create constants directory structure: `olorin-front/src/microservices/investigation/constants/`
- [ ] T003 [P] Create services directory structure: `olorin-front/src/microservices/investigation/services/`
- [ ] T004 [P] Create hooks directory structure: `olorin-front/src/microservices/investigation/hooks/`
- [ ] T005 [P] Create components directory for GAIA ports: `olorin-front/src/microservices/investigation/components/`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### TypeScript Interfaces & Types

- [ ] T006 [P] Add InvestigationProgress interface to `olorin-front/src/shared/types/investigation.ts` (from data-model.md)
- [ ] T007 [P] Add ToolExecution interface to `olorin-front/src/shared/types/investigation.ts` (from data-model.md)
- [ ] T008 [P] Add AgentStatus interface to `olorin-front/src/shared/types/investigation.ts` (from data-model.md)
- [ ] T009 [P] Add PhaseProgress interface to `olorin-front/src/shared/types/investigation.ts` (from data-model.md)
- [ ] T010 [P] Add AnomalyDetection interface to `olorin-front/src/shared/types/investigation.ts` (from data-model.md)
- [ ] T011 [P] Add EntityRelationship interface to `olorin-front/src/shared/types/investigation.ts` (from data-model.md)

### Configuration Constants

- [ ] T012 [P] Create `olorin-front/src/microservices/investigation/constants/agentConfig.ts` with AGENT_DISPLAY_NAMES and AGENT_COLORS from environment variables
- [ ] T013 [P] Create `olorin-front/src/microservices/investigation/constants/riskThresholds.ts` with RISK_THRESHOLDS (40, 60, 80) from environment variables
- [ ] T014 [P] Create `olorin-front/src/microservices/investigation/constants/pollingConfig.ts` with POLLING_CONFIG intervals from environment variables

### Data Adapter Layer (Core Transformation Functions)

- [ ] T015 [P] Implement buildAgentStatuses() helper in `olorin-front/src/microservices/investigation/services/dataAdapters.ts` (derives agent data from tool executions)
- [ ] T016 [P] Implement calculateAverageRisk() helper in `olorin-front/src/microservices/investigation/services/dataAdapters.ts` (aggregates risk per agent)
- [ ] T017 [P] Implement extractRiskScore() helper in `olorin-front/src/microservices/investigation/services/dataAdapters.ts` (extracts and normalizes risk 0-100)
- [ ] T018 [P] Implement extractAnomalies() helper in `olorin-front/src/microservices/investigation/services/dataAdapters.ts` (finds anomaly-type findings)
- [ ] T019 [P] Implement calculateToolStats() helper in `olorin-front/src/microservices/investigation/services/dataAdapters.ts` (counts tools by status)
- [ ] T020 [P] Implement mapStatus() helper in `olorin-front/src/microservices/investigation/services/dataAdapters.ts` (Olorin status → GAIA status)

### API Service & Polling Hook

- [ ] T021 Create InvestigationProgressService class in `olorin-front/src/microservices/investigation/services/investigationProgressService.ts` (Axios client for /progress endpoint)
- [ ] T022 Implement useProgressData hook in `olorin-front/src/microservices/investigation/hooks/useProgressData.ts` with:
  - 3-second polling interval (POLLING_CONFIG.PROGRESS_INTERVAL_MS)
  - Terminal status detection (completed/failed/cancelled stops polling)
  - **CRITICAL**: Memoize API service instance to prevent infinite loop (FR-011)
  - Exponential backoff retry logic (POLLING_CONFIG.RETRY_BACKOFF_MS)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Real-Time Investigation Monitoring (Priority: P1) 🎯 MVP

**Goal**: Comprehensive real-time visibility into investigation progress with EKG monitoring, connection status, and agent risk gauges

**Independent Test**: Start investigation from Settings page, navigate to Progress page, verify all real-time components update within 3 seconds

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T023 [P] [US1] Contract test for adaptToEKGMonitor() in `olorin-front/src/microservices/investigation/__tests__/unit/dataAdapters.test.ts`
- [ ] T024 [P] [US1] Contract test for adaptToAgentRiskGauges() in `olorin-front/src/microservices/investigation/__tests__/unit/dataAdapters.test.ts`
- [ ] T025 [P] [US1] Integration test for ProgressPage real-time updates in `olorin-front/src/microservices/investigation/__tests__/integration/ProgressPage.integration.test.tsx`
- [ ] T026 [P] [US1] Unit test for useProgressData hook polling behavior in `olorin-front/src/microservices/investigation/__tests__/unit/useProgressData.test.ts`

### Adapter Functions for User Story 1

- [ ] T027 [P] [US1] Implement adaptToEKGMonitor() in `olorin-front/src/microservices/investigation/services/dataAdapters.ts` (transforms progress → EKG props)
- [ ] T028 [P] [US1] Implement adaptToAgentRiskGauges() in `olorin-front/src/microservices/investigation/services/dataAdapters.ts` (transforms progress → risk gauges props)

### EKG Monitor Component (FR-002)

- [ ] T029 [P] [US1] Port WaveformDisplay component to `olorin-front/src/microservices/investigation/components/WaveformDisplay.tsx` (<120 lines, canvas P-Q-R-S-T at 60 FPS)
- [ ] T030 [P] [US1] Port MetricsGaugesGrid component to `olorin-front/src/microservices/investigation/components/MetricsGaugesGrid.tsx` (<100 lines, tool statistics)
- [ ] T031 [P] [US1] Port AgentBreakdownGauges component to `olorin-front/src/microservices/investigation/components/AgentBreakdownGauges.tsx` (<110 lines, per-agent breakdowns)
- [ ] T032 [US1] Port EnhancedEKGMonitor component to `olorin-front/src/microservices/investigation/components/EnhancedEKGMonitor.tsx` (<150 lines, coordinates sub-components)
  - Depends on: T029, T030, T031
  - BPM calculation: `Math.round(40 + toolsPerSec * 6)`
  - Uses WaveformDisplay, MetricsGaugesGrid, AgentBreakdownGauges
  - Agent filter dropdown for per-agent statistics

### Agent Risk Gauges Component (FR-003)

- [ ] T033 [P] [US1] Port LuxGaugesDashboard component to `olorin-front/src/microservices/investigation/components/LuxGaugesDashboard.tsx` (<150 lines, circular risk gauges)
- [ ] T034 [US1] Port AgentRiskGaugesSection component to `olorin-front/src/microservices/investigation/components/AgentRiskGaugesSection.tsx` (<180 lines)
  - Depends on: T033
  - Always displays all 6 agents (Device, Location, Logs, Network, Labels, Risk)
  - Uses adaptToAgentRiskGauges() for data transformation
  - Color-coded severity: gray (0-39), green (40-59), amber (60-79), red (80-100)

### Unit Tests for User Story 1 Components

- [ ] T035 [P] [US1] Unit test for EnhancedEKGMonitor in `olorin-front/src/microservices/investigation/__tests__/unit/EnhancedEKGMonitor.test.tsx` (verify BPM calculation, waveform rendering)
- [ ] T036 [P] [US1] Unit test for AgentRiskGaugesSection in `olorin-front/src/microservices/investigation/__tests__/unit/AgentRiskGaugesSection.test.tsx` (verify 6 agents display, color coding)
- [ ] T037 [P] [US1] Performance test for WaveformDisplay in `olorin-front/src/microservices/investigation/__tests__/unit/WaveformDisplay.test.tsx` (verify 60 FPS with requestAnimationFrame)

**Checkpoint**: At this point, User Story 1 should be fully functional with EKG monitor and agent risk gauges updating in real-time

---

## Phase 4: User Story 2 - Connection Status Awareness (Priority: P1) 🎯 MVP

**Goal**: Immediate visibility into polling health with pause/resume/cancel controls

**Independent Test**: Disconnect network during investigation, observe connection status header behavior and reconnection attempts

### Tests for User Story 2

- [ ] T038 [P] [US2] Contract test for adaptToConnectionStatus() in `olorin-front/src/microservices/investigation/__tests__/unit/dataAdapters.test.ts`
- [ ] T039 [P] [US2] Integration test for connection status changes in `olorin-front/src/microservices/investigation/__tests__/integration/ConnectionStatus.integration.test.tsx`

### Adapter Function for User Story 2

- [ ] T040 [US2] Implement adaptToConnectionStatus() in `olorin-front/src/microservices/investigation/services/dataAdapters.ts` (transforms progress → connection header props)

### Connection Status Component (FR-001)

- [ ] T041 [US2] Port ConnectionStatusHeader component to `olorin-front/src/microservices/investigation/components/ConnectionStatusHeader.tsx` (<180 lines)
  - 3-section layout: Activity Badge + Connection + Status Badge | Control buttons
  - Shows: investigationStatus, isConnected, toolsPerSec, processing indicator
  - Controls: onPause, onCancel, onResume handlers
  - Uses adaptToConnectionStatus() for data transformation
  - Responsive design with Tailwind CSS

### Integration with ProgressPage

- [ ] T042 [US2] Update ProgressPage.tsx to integrate ConnectionStatusHeader at top of page
  - Import and render ConnectionStatusHeader
  - Wire up pause/resume/cancel handlers
  - Pass polling state (isPolling from useProgressData)

### Unit Tests for User Story 2 Components

- [ ] T043 [P] [US2] Unit test for ConnectionStatusHeader in `olorin-front/src/microservices/investigation/__tests__/unit/ConnectionStatusHeader.test.tsx` (verify status display, button actions)

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently with full real-time monitoring and connection awareness

---

## Phase 5: User Story 4 - Radar Anomaly Detection (Priority: P2)

**Goal**: Interactive radar visualization showing real-time anomaly detection across all agents

**Independent Test**: Run investigation with 2+ entities, observe radar as anomalies are detected, verify top 10 anomalies display

### Tests for User Story 4

- [ ] T044 [P] [US4] Contract test for adaptToRadarView() in `olorin-front/src/microservices/investigation/__tests__/unit/dataAdapters.test.ts`
- [ ] T045 [P] [US4] Integration test for radar anomaly visualization in `olorin-front/src/microservices/investigation/__tests__/integration/RadarView.integration.test.tsx`

### Adapter Function for User Story 4

- [ ] T046 [US4] Implement adaptToRadarView() in `olorin-front/src/microservices/investigation/services/dataAdapters.ts` (transforms progress → radar props, extracts top 10 anomalies)

### Radar Visualization Component (FR-004)

- [ ] T047 [US4] Port InvestigationRadarView component to `olorin-front/src/microservices/investigation/components/InvestigationRadarView.tsx` (<190 lines)
  - 360° radar with 6 agent positions (Device, Location, Logs, Network, Labels, Risk)
  - Anomaly blips with severity color coding (low=yellow, medium=orange, high=red, critical=red pulsing)
  - Hover tooltips showing: anomaly type, severity, timestamp, affected entity
  - Agent filter toggle to show/hide specific agent anomalies
  - Uses extractAnomalies() via adaptToRadarView() for top 10 anomalies
  - Canvas-based rendering for smooth animations

### Integration with ProgressPage

- [ ] T048 [US4] Update ProgressPage.tsx to integrate InvestigationRadarView in collapsible section
  - Add "Anomaly Radar" collapsible section
  - Pass investigation progress data via adaptToRadarView()

### Unit Tests for User Story 4 Components

- [ ] T049 [P] [US4] Unit test for InvestigationRadarView in `olorin-front/src/microservices/investigation/__tests__/unit/InvestigationRadarView.test.tsx` (verify anomaly positioning, filtering, top 10 limit)

**Checkpoint**: User Stories 1, 2, AND 4 should all work independently with radar providing spatial anomaly context

---

## Phase 6: User Story 5 - Entity Relationship Tracking (Priority: P3)

**Goal**: Visualize discovered relationships between entities as force-directed graph

**Independent Test**: Start investigation with 3+ entities, observe graph as relationships are discovered, verify edge strength indicators

### Tests for User Story 5

- [ ] T050 [P] [US5] Contract test for adaptToEntityGraph() in `olorin-front/src/microservices/investigation/__tests__/unit/dataAdapters.test.ts`
- [ ] T051 [P] [US5] Integration test for entity graph visualization in `olorin-front/src/microservices/investigation/__tests__/integration/EntityGraph.integration.test.tsx`

### Adapter Function for User Story 5

- [ ] T052 [US5] Implement adaptToEntityGraph() in `olorin-front/src/microservices/investigation/services/dataAdapters.ts` (transforms progress → entity graph props)

### Entity Graph Component (FR-005)

- [ ] T053 [US5] Port EntityCorrelationGraph component to `olorin-front/src/microservices/investigation/components/EntityCorrelationGraph.tsx` (<180 lines)
  - Uses vis-network library for force-directed graph layout
  - Entity nodes with labels (email, device ID, IP, etc.)
  - Relationship edges with strength indicators (0-100 scale affects thickness)
  - Edge labels showing relationship type ("Shared Device", "Same Location", etc.)
  - Click node to highlight connected relationships
  - Collapsible and minimizable
  - Polling every 30 seconds for relationship updates (POLLING_CONFIG.ENTITY_GRAPH_INTERVAL_MS)

### Integration with ProgressPage

- [ ] T054 [US5] Update ProgressPage.tsx to integrate EntityCorrelationGraph in collapsible section
  - Add "Entity Relationships" collapsible section
  - Pass investigation progress data via adaptToEntityGraph()
  - Handle single-entity case (hide section or show single node)

### Unit Tests for User Story 5 Components

- [ ] T055 [P] [US5] Unit test for EntityCorrelationGraph in `olorin-front/src/microservices/investigation/__tests__/unit/EntityCorrelationGraph.test.tsx` (verify node/edge rendering, relationship strength)

**Checkpoint**: User Stories 1, 2, 4, AND 5 should all work independently with entity graph showing discovered relationships

---

## Phase 7: User Story 6 - Investigation Progress Details (Priority: P3)

**Goal**: Detailed visibility into phase progression, tool execution timeline, and log stream

**Independent Test**: Expand ProgressDetailsSection, verify phase indicators, tool timeline, and log stream all update in real-time

### Implementation for User Story 6

> **NOTE**: These components may already exist in ProgressPage.tsx. If so, enhance them with GAIA styling and real-time updates.

- [ ] T056 [US6] Enhance or create PhaseProgressIndicator component in `olorin-front/src/microservices/investigation/components/PhaseProgressIndicator.tsx` (<120 lines)
  - Shows 5 investigation phases (Data Collection, Agent Analysis, Correlation, Risk Assessment, Report Generation)
  - Phase 1 complete: green checkmark
  - Phase 2 in progress: blue pulsing indicator
  - Phases 3-5 pending: gray with percentage
  - Uses phaseProgress from InvestigationProgress interface

- [ ] T057 [US6] Enhance or create ToolExecutionTimeline component in `olorin-front/src/microservices/investigation/components/ToolExecutionTimeline.tsx` (<150 lines)
  - Chronological list of tool executions
  - Shows: tool name, agent, execution time, status, findings count
  - Color-coded status: queued (gray), running (blue pulse), completed (green), failed (red)
  - Virtualized scrolling for 1000+ tool executions (performance SC-014)

- [ ] T058 [US6] Enhance or create LogStreamViewer component in `olorin-front/src/microservices/investigation/components/LogStreamViewer.tsx` (<150 lines)
  - Real-time log messages with color-coded severity
  - info=blue, warning=yellow, error=red, debug=gray
  - Auto-scroll to bottom as new logs arrive
  - "Pause auto-scroll" button for reviewing older logs
  - Virtualized scrolling for 1000+ log messages

### Integration with ProgressPage

- [ ] T059 [US6] Update ProgressPage.tsx to integrate all progress detail components in collapsible ProgressDetailsSection
  - Add PhaseProgressIndicator
  - Add ToolExecutionTimeline
  - Add LogStreamViewer
  - Make section collapsible with default expanded state

### Unit Tests for User Story 6 Components

- [ ] T060 [P] [US6] Unit test for PhaseProgressIndicator in `olorin-front/src/microservices/investigation/__tests__/unit/PhaseProgressIndicator.test.tsx` (verify phase states, percentages)
- [ ] T061 [P] [US6] Unit test for ToolExecutionTimeline in `olorin-front/src/microservices/investigation/__tests__/unit/ToolExecutionTimeline.test.tsx` (verify chronological order, virtualization)
- [ ] T062 [P] [US6] Unit test for LogStreamViewer in `olorin-front/src/microservices/investigation/__tests__/unit/LogStreamViewer.test.tsx` (verify auto-scroll, color coding, virtualization)

**Checkpoint**: All 6 user stories should now be independently functional with complete progress details

---

## Phase 8: User Story 3 - Agent Risk Visualization (Priority: P2)

**Goal**: Comprehensive agent-specific risk metrics with real-time updates

**Independent Test**: Start investigation with multiple entities, verify all 6 agent gauges display with color coding based on risk scores

> **NOTE**: This user story is partially implemented in Phase 3 (AgentRiskGaugesSection). This phase adds enhanced visualizations and drill-down capabilities if needed.

### Tests for User Story 3

- [ ] T063 [P] [US3] Integration test for agent risk gauge color transitions in `olorin-front/src/microservices/investigation/__tests__/integration/AgentRiskGauges.integration.test.tsx`

### Enhanced Agent Visualizations (if needed beyond Phase 3)

- [ ] T064 [US3] Add agent drill-down modal to AgentRiskGaugesSection (show detailed tool list per agent)
  - Click agent gauge to open modal
  - Shows all tools executed by that agent
  - Displays findings, execution times, risk contributions
  - <150 lines in AgentDetailModal.tsx

### Integration Test for User Story 3

- [ ] T065 [US3] End-to-end test verifying all 6 agents display correctly with accurate risk calculation from tool executions

**Checkpoint**: User Story 3 enhancements complete, all agent risk visualizations working with real-time updates

---

## Phase 9: Collaboration Overlay (Optional - FR-006)

**Goal**: Real-time collaboration indicators showing other investigators viewing the same investigation

**Independent Test**: Open same investigation in two browser windows, verify presence indicators appear

> **NOTE**: This is OPTIONAL and only implemented if collaboration feature is enabled in backend

### Implementation for Collaboration (Optional)

- [ ] T066 [P] [Collaboration] Check if collaboration feature is enabled via environment variable (REACT_APP_ENABLE_COLLABORATION)
- [ ] T067 [Collaboration] Port CollaborationOverlay component to `olorin-front/src/microservices/investigation/components/CollaborationOverlay.tsx` (<120 lines)
  - Shows avatars of other investigators viewing this investigation
  - Real-time presence via WebSocket or polling
  - Hover to see investigator name and last activity time
  - Positioned as floating overlay in top-right corner

### Integration with ProgressPage

- [ ] T068 [Collaboration] Update ProgressPage.tsx to conditionally render CollaborationOverlay if feature enabled
  - Check REACT_APP_ENABLE_COLLABORATION flag
  - Only render if backend supports collaboration endpoints

**Checkpoint**: Collaboration overlay (if enabled) shows real-time investigator presence

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories, performance optimization, and final quality checks

### Performance Optimization

- [ ] T069 [P] [Polish] Profile canvas rendering performance with Chrome DevTools, ensure 60 FPS for EKG waveform (SC-011)
- [ ] T070 [P] [Polish] Measure polling overhead with Performance API, ensure <50ms per request (SC-012)
- [ ] T071 [P] [Polish] Analyze bundle size with webpack-bundle-analyzer, ensure progress page <500KB (SC-013)
- [ ] T072 [P] [Polish] Memory profiling with 1000+ tool executions, ensure <100MB usage (SC-014)

### File Size Compliance

- [ ] T073 [Polish] Run file size check script, verify all files <200 lines per SYSTEM MANDATE
  - If any file exceeds limit, split into smaller modules
  - Priority files to check: EnhancedEKGMonitor, AgentRiskGaugesSection, EntityCorrelationGraph

### Test Coverage

- [ ] T074 [Polish] Run jest coverage report, verify ≥85% coverage (SC-010)
- [ ] T075 [Polish] Add missing unit tests for any components below 85% coverage
- [ ] T076 [P] [Polish] Create mock investigation progress fixture in `olorin-front/src/microservices/investigation/__tests__/mocks/mockInvestigationProgress.ts`

### Error Handling & Edge Cases

- [ ] T077 [P] [Polish] Add error boundaries around all GAIA components for graceful degradation
- [ ] T078 [P] [Polish] Handle terminal status detection (completed/failed/cancelled) - stop polling, show completion banner
- [ ] T079 [P] [Polish] Handle partial data when investigation just started - show skeleton screens
- [ ] T080 [P] [Polish] Handle polling failures - exponential backoff, retry button after 5 failures
- [ ] T081 [P] [Polish] Handle single-entity investigations - hide or adapt entity graph
- [ ] T082 [P] [Polish] Handle missing agent risk data - show "Initializing" status, don't crash gauges

### GAIA Design System Compliance

- [ ] T083 [Polish] Verify all components use GAIA corporate colors from AGENT_COLORS constant
- [ ] T084 [Polish] Verify color transitions match GAIA thresholds (gray 0-39, green 40-59, amber 60-79, red 80-100)
- [ ] T085 [Polish] Ensure Tailwind CSS classes match GAIA design patterns (no Material-UI)

### Documentation & Validation

- [ ] T086 [P] [Polish] Update quickstart.md with final component locations and setup instructions
- [ ] T087 [P] [Polish] Run all tests from quickstart.md to validate setup instructions
- [ ] T088 [P] [Polish] Add JSDoc comments to all adapter functions and hooks
- [ ] T089 [P] [Polish] Update spec.md success criteria with actual test results

### Final Integration Testing

- [ ] T090 [Polish] End-to-end test: Complete investigation flow from Settings → Progress → Results
- [ ] T091 [Polish] End-to-end test: Verify <3 dropped updates per hour over 1-hour investigation (SC-015)
- [ ] T092 [Polish] Cross-browser testing: Chrome, Firefox, Safari, Edge (verify Canvas API compatibility)
- [ ] T093 [Polish] Responsive testing: Mobile, tablet, desktop layouts

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phases 3-8)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Recommended priority order: US1 (P1) → US2 (P1) → US4 (P2) → US5 (P3) → US6 (P3) → US3 (P2)
- **Collaboration (Phase 9)**: Optional - only if backend supports collaboration
- **Polish (Phase 10)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1) - Real-Time Monitoring**: Can start after Foundational (Phase 2) - No dependencies on other stories
  - Includes: EKG Monitor, Agent Risk Gauges
  - MVP Core: Must be completed first

- **User Story 2 (P1) - Connection Status**: Can start after Foundational (Phase 2) - Integrates with US1 but independently testable
  - Includes: Connection Status Header
  - MVP Core: Must be completed first

- **User Story 4 (P2) - Radar Detection**: Can start after Foundational (Phase 2) - Independent of US1/US2
  - Includes: Radar Visualization
  - Uses shared extractAnomalies() helper

- **User Story 5 (P3) - Entity Relationships**: Can start after Foundational (Phase 2) - Independent of other stories
  - Includes: Entity Correlation Graph
  - Requires vis-network dependency (verified in T001)

- **User Story 6 (P3) - Progress Details**: Can start after Foundational (Phase 2) - Independent of other stories
  - Includes: Phase Indicator, Tool Timeline, Log Viewer
  - May enhance existing components

- **User Story 3 (P2) - Agent Risk Visualization**: Partially implemented in Phase 3 (US1), enhancements in Phase 8
  - Enhanced drill-down capabilities
  - Depends on: US1 completion

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Adapter functions before components
- Sub-components before parent components
- Components before integration with ProgressPage
- Story complete before moving to next priority

### Parallel Opportunities

Within Foundational Phase (Phase 2):
```bash
# All TypeScript interfaces can be written in parallel (T006-T011)
Task: "Add InvestigationProgress interface to investigation.ts"
Task: "Add ToolExecution interface to investigation.ts"
Task: "Add AgentStatus interface to investigation.ts"
Task: "Add PhaseProgress interface to investigation.ts"
Task: "Add AnomalyDetection interface to investigation.ts"
Task: "Add EntityRelationship interface to investigation.ts"

# All constants can be created in parallel (T012-T014)
Task: "Create agentConfig.ts with AGENT_DISPLAY_NAMES and AGENT_COLORS"
Task: "Create riskThresholds.ts with RISK_THRESHOLDS"
Task: "Create pollingConfig.ts with POLLING_CONFIG"

# All helper functions can be implemented in parallel (T015-T020)
Task: "Implement buildAgentStatuses() helper"
Task: "Implement calculateAverageRisk() helper"
Task: "Implement extractRiskScore() helper"
Task: "Implement extractAnomalies() helper"
Task: "Implement calculateToolStats() helper"
Task: "Implement mapStatus() helper"
```

Within User Story 1 (Phase 3):
```bash
# All tests can be written in parallel (T023-T026)
Task: "Contract test for adaptToEKGMonitor()"
Task: "Contract test for adaptToAgentRiskGauges()"
Task: "Integration test for ProgressPage real-time updates"
Task: "Unit test for useProgressData hook"

# Adapter functions can be implemented in parallel (T027-T028)
Task: "Implement adaptToEKGMonitor()"
Task: "Implement adaptToAgentRiskGauges()"

# EKG sub-components can be ported in parallel (T029-T031)
Task: "Port WaveformDisplay component"
Task: "Port MetricsGaugesGrid component"
Task: "Port AgentBreakdownGauges component"

# Tests can run in parallel (T035-T037)
Task: "Unit test for EnhancedEKGMonitor"
Task: "Unit test for AgentRiskGaugesSection"
Task: "Performance test for WaveformDisplay"
```

Once Foundational phase completes, multiple developers can work on different user stories in parallel:
```bash
# Developer A: User Story 1 (Phase 3)
Task: "Implement EKG Monitor components"

# Developer B: User Story 2 (Phase 4)
Task: "Implement Connection Status Header"

# Developer C: User Story 4 (Phase 5)
Task: "Implement Radar Visualization"
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2 Only - Both P1)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (EKG + Risk Gauges)
4. Complete Phase 4: User Story 2 (Connection Status)
5. **STOP and VALIDATE**: Test both stories independently
6. Deploy/demo MVP with real-time monitoring + connection awareness

**MVP Deliverable**: Investigators can monitor investigations in real-time with EKG activity visualization, agent risk gauges, and connection status awareness. Core P1 functionality complete.

### Incremental Delivery (Add P2/P3 Stories)

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 + 2 → Test independently → Deploy/Demo (MVP! Core real-time monitoring)
3. Add User Story 4 → Test independently → Deploy/Demo (+ Radar anomaly detection)
4. Add User Story 5 → Test independently → Deploy/Demo (+ Entity relationship graph)
5. Add User Story 6 → Test independently → Deploy/Demo (+ Detailed progress logs)
6. Add User Story 3 enhancements → Test independently → Deploy/Demo (+ Agent drill-down)
7. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together (Phases 1-2)
2. Once Foundational is done, split work:
   - **Developer A**: User Story 1 (Phase 3) - EKG Monitor + Risk Gauges
   - **Developer B**: User Story 2 (Phase 4) - Connection Status
   - **Developer C**: User Story 4 (Phase 5) - Radar Visualization
3. Stories complete and integrate independently
4. Team reconvenes for Polish phase (performance optimization, testing)

---

## Notes

- **[P] tasks**: Different files, no dependencies - can run in parallel
- **[Story] label**: Maps task to specific user story for traceability (US1-US6)
- **Each user story**: Independently completable and testable
- **Tests first**: Verify tests fail before implementing (TDD approach)
- **File size limit**: Every file MUST be <200 lines (SYSTEM MANDATE) - split if needed
- **No hardcoded values**: All config via environment variables (SYSTEM MANDATE)
- **No mock data**: Real backend integration only (SYSTEM MANDATE)
- **Commit frequently**: After each task or logical group
- **Checkpoints**: Stop at any checkpoint to validate story independently
- **CRITICAL FR-011**: Memoize API service instance in useProgressData hook to prevent infinite polling loop
- **Performance goals**: 60 FPS canvas, <50ms polling, <500KB bundle, <100MB memory, ≥85% test coverage
- **GAIA accuracy**: Components must match GAIA design pixel-perfect with exact corporate colors
