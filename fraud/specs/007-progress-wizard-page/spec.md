# Feature Specification: Enhanced Progress Wizard Page with GAIA Components

**Feature Branch**: `007-progress-wizard-page`
**Created**: 2025-10-31
**Status**: Draft
**Input**: User description: "create a new progress page use /Users/gklainert/Documents/Gaia/gaia-webplugin wizard pages and copy EXACTLY ALL of the components in wizard progress page and implement them in olorin, verify the work completely with olorin data"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Real-Time Investigation Monitoring (Priority: P1)

Investigators need comprehensive real-time visibility into investigation progress across all agents, tools, and data sources during active investigations. This includes EKG activity monitoring, connection status tracking, phase progress indicators, and immediate notification of any failures or anomalies.

**Why this priority**: Core functionality that enables investigators to monitor investigations as they run. Without this, investigators cannot track progress or identify issues in real-time.

**Independent Test**: Can be fully tested by starting an investigation from the Settings page and navigating to the Progress page. Success is measured by seeing all real-time components updating within 3 seconds of backend changes, including EKG waveforms, phase indicators, tool execution status, and agent risk gauges.

**Acceptance Scenarios**:

1. **Given** an active investigation is running, **When** investigator navigates to Progress page, **Then** they see real-time EKG monitor displaying current BPM and activity level
2. **Given** investigation is in progress, **When** a tool completes execution, **Then** tool status updates within 3 seconds without page refresh
3. **Given** investigation encounters an error, **When** tool execution fails, **Then** failure notification appears with error details in log stream
4. **Given** multiple agents are executing tools, **When** viewing progress page, **Then** each agent's risk gauge shows current risk score and execution progress

---

### User Story 2 - Connection Status Awareness (Priority: P1)

Investigators require immediate visibility into the health and status of real-time data connections. The system must clearly indicate when polling is active, when reconnection attempts are being made, and provide easy access to pause, resume, or cancel investigations.

**Why this priority**: Essential for understanding data freshness and investigation reliability. Lost connections can lead to missed updates or incomplete investigations.

**Independent Test**: Can be tested by disconnecting network connection during investigation and observing connection status header behavior. Success is measured by immediate visual indication of connection loss and automatic reconnection attempts.

**Acceptance Scenarios**:

1. **Given** investigation is polling backend, **When** connection is active, **Then** connection status header shows green "Connected" indicator with current tools/sec metric
2. **Given** polling connection fails, **When** system attempts reconnection, **Then** connection status header shows yellow "Reconnecting" with retry count
3. **Given** investigation is running, **When** investigator clicks Pause button, **Then** investigation pauses and status updates to "Paused" with Resume button displayed
4. **Given** connection lost for over 30 seconds, **When** reconnection fails, **Then** prominent error banner displays with "Retry Connection" action button

---

### User Story 3 - Agent Risk Visualization (Priority: P2)

Investigators need comprehensive visualization of agent-specific risk metrics during investigations. Each of the 6 fraud detection agents (Device, Location, Logs, Network, Labels, Risk) requires real-time risk score display with color-coded severity indicators and tool execution progress tracking.

**Why this priority**: Provides granular visibility into which specific agents are detecting elevated risk, enabling investigators to focus on high-risk areas immediately rather than waiting for investigation completion.

**Independent Test**: Can be tested by starting investigation with multiple entities and verifying all 6 agent risk gauges display within the AgentRiskSection with appropriate color coding. Success is measured by accurate risk scores updating in real-time as agents complete tool executions.

**Acceptance Scenarios**:

1. **Given** investigation starts, **When** agents begin executing tools, **Then** all 6 agent risk gauges (Device, Location, Logs, Network, Labels, Risk) display with initial 0 risk scores
2. **Given** Device agent completes 3 tools, **When** aggregate risk exceeds 60%, **Then** Device gauge transitions to amber color with pulsing animation
3. **Given** Location agent detects high-risk anomaly, **When** risk score exceeds 80%, **Then** Location gauge displays red with "SEVERE" indicator and continuous pulse animation
4. **Given** multiple agents have completed, **When** viewing agent risk section, **Then** each gauge shows accurate tools completed count, average execution time, and findings count

---

### User Story 4 - Radar Anomaly Detection (Priority: P2)

Investigators require interactive radar visualization showing real-time anomaly detection across all investigation entities and agents. The radar should display agent positions, detected anomalies with severity levels, and provide filtering capabilities by agent type.

**Why this priority**: Provides spatial and temporal context for detected anomalies, helping investigators understand patterns and relationships between different types of suspicious activity.

**Independent Test**: Can be tested by running investigation with 2+ entities and observing radar visualization as anomalies are detected. Success measured by accurate anomaly positioning on radar, correct severity color coding, and smooth animation as new anomalies appear.

**Acceptance Scenarios**:

1. **Given** investigation analyzing multiple entities, **When** Device agent detects anomaly, **Then** red blip appears at Device agent position on radar with severity indicator
2. **Given** radar showing multiple anomalies, **When** investigator hovers over anomaly blip, **Then** tooltip displays anomaly type, severity, timestamp, and affected entity
3. **Given** 15+ anomalies detected, **When** viewing radar, **Then** only most recent/severe 10 anomalies display to prevent overcrowding
4. **Given** multiple agent types active, **When** investigator toggles agent filter, **Then** radar displays only anomalies from selected agent types

---

### User Story 5 - Entity Relationship Tracking (Priority: P3)

For investigations with multiple entities, investigators need to visualize discovered relationships between entities as they are detected during the investigation. The entity correlation graph should show entities as nodes and relationships as edges with strength indicators.

**Why this priority**: Helps investigators understand connections between suspicious accounts, devices, or behaviors that may indicate coordinated fraud activity. Less critical than individual entity monitoring but valuable for complex investigations.

**Independent Test**: Can be tested by starting investigation with 3+ entities and observing entity graph as relationships are discovered. Success measured by accurate relationship visualization with bidirectional edges and strength indicators.

**Acceptance Scenarios**:

1. **Given** investigation with 3 entities, **When** system detects shared device fingerprint, **Then** entity graph shows edge connecting related entities with "Shared Device" label
2. **Given** multiple relationships detected, **When** viewing entity graph, **Then** edge thickness reflects relationship strength (0-100 scale)
3. **Given** entity graph with 10+ entities, **When** investigator clicks entity node, **Then** graph highlights all connected relationships and related entities
4. **Given** no relationships detected yet, **When** viewing entity graph, **Then** entities display as disconnected nodes with "Analyzing..." status

---

### User Story 6 - Investigation Progress Details (Priority: P3)

Investigators require detailed visibility into investigation execution including phase progression, tool execution timeline, and comprehensive log stream. This provides audit trail and troubleshooting capability for complex investigations.

**Why this priority**: Important for understanding investigation execution details and troubleshooting, but not required for basic monitoring functionality. Provides value for advanced users and post-investigation analysis.

**Independent Test**: Can be tested by expanding ProgressDetailsSection and verifying phase indicators, tool execution timeline, and log stream all update in real-time. Success measured by accurate phase completion percentages, chronological tool execution display, and complete log message capture.

**Acceptance Scenarios**:

1. **Given** investigation in Phase 2 of 5, **When** viewing progress details, **Then** phase indicator shows Phase 1 complete (green checkmark), Phase 2 in progress (blue pulse), Phases 3-5 pending (gray)
2. **Given** 20 tools executed, **When** viewing tool execution timeline, **Then** tools display in chronological order with execution time, status, and agent assignment
3. **Given** investigation generating logs, **When** viewing log stream, **Then** logs appear in real-time with color-coded severity (info=blue, warning=yellow, error=red)
4. **Given** log stream with 100+ messages, **When** scrolling to bottom, **Then** auto-scroll maintains view at latest messages as new logs arrive

---

### Edge Cases

- What happens when investigation completes or fails while user is viewing Progress page?
  - System detects terminal status (completed/failed/cancelled) via polling
  - Polling stops automatically to conserve resources
  - Completion banner displays with appropriate success/failure styling
  - "View Results" button becomes enabled for completed investigations
  - Final state persists on page for review before navigation

- How does system handle partial data when investigation just started?
  - All visualizations show loading/initializing states with skeleton screens
  - Components gracefully handle empty arrays for tools, phases, anomalies
  - Agent gauges display as "Pending" with 0 risk until first tool completes
  - EKG monitor shows flat line with 0 BPM until tools begin executing
  - Entity graph shows single nodes without relationships until correlation detected

- What happens when polling fails or connection is unstable?
  - Connection status header immediately shows "Reconnecting" state
  - Automatic retry with exponential backoff (3s, 6s, 12s, max 30s)
  - After 5 failed retries, displays error banner with manual "Retry" button
  - Cached data remains displayed with "Last updated: X seconds ago" timestamp
  - All real-time components continue showing last known state during reconnection

- How does system handle investigation with only 1 entity (no relationships)?
  - Entity graph section either hides or shows single entity node
  - Relationship tracking hook returns empty array without errors
  - Radar visualization scales to focus on single entity's agent activity
  - All other components function normally (agent gauges, EKG, phases, logs)

- What happens when agent risk data is unavailable or incomplete?
  - Agent gauges display with 0 risk score and "Initializing" status
  - Missing agent data does not crash or hide the gauge
  - Once data arrives via polling, gauge animates to actual risk score
  - "Last updated" timestamp shows when agent data was last received

- How does system handle extremely long-running investigations?
  - Log stream implements virtualization for 1000+ messages to maintain performance
  - Polling interval may adjust based on investigation activity (more frequent when active)
  - Browser memory monitored; older log messages pruned if memory threshold exceeded
  - Tool execution timeline collapses completed tools after threshold (e.g., 50 visible)
  - Phase indicators remain expanded to show overall progress regardless of duration

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display ConnectionStatusHeader with current investigation status, connection indicator (connected/reconnecting/disconnected), tools per second metric, and action buttons (Pause/Cancel/Resume)
- **FR-002**: System MUST render EnhancedEKGMonitor with medical-grade P-Q-R-S-T waveform driven by tools per second converted to BPM, displaying metrics for completed, running, queued, failed, and skipped tools
- **FR-003**: System MUST display AgentRiskGaugesSection showing all 6 fraud detection agents (Device, Location, Logs, Network, Labels, Risk) with real-time risk scores, tool execution progress, and color-coded severity indicators
- **FR-004**: System MUST render InvestigationRadarView with 360-degree circular layout showing agent positions, detected anomalies as blips with severity-based colors, and interactive hover tooltips
- **FR-005**: System MUST display EntityCorrelationGraph visualizing entities as nodes and discovered relationships as edges with strength indicators when investigation involves multiple entities
- **FR-006**: System MUST implement CollaborationOverlay for team-based investigations showing related investigations, team member activity, AI context, and real-time messaging
- **FR-007**: System MUST provide ProgressRiskSection combining agent risk gauges and radar visualization in collapsible panel with default expanded state
- **FR-008**: System MUST display ProgressCorrelationSection showing entity relationship graph in collapsible panel when multiple entities are being investigated
- **FR-009**: System MUST implement useProgressData hook polling /progress endpoint every 3 seconds to fetch investigation status, tool executions, agent statuses, and risk metrics
- **FR-010**: System MUST automatically stop polling when investigation reaches terminal status (completed, failed, or cancelled) to conserve backend resources
- **FR-011**: System MUST memoize WizardProgressApiService instance to prevent infinite polling loop due to dependency changes in useEffect
- **FR-012**: System MUST calculate aggregate statistics (completed, running, queued, failed, skipped, total) from toolExecutions array for display in metrics components
- **FR-013**: System MUST extract agentStatuses array from progress data for display in AgentRiskGaugesSection with canonical agent type mapping
- **FR-014**: System MUST display phase progress indicators showing initialization, analysis, correlation, assessment, and reporting phases with completion percentages
- **FR-015**: System MUST render tool execution timeline in chronological order showing tool name, agent, execution time, status, and result summary
- **FR-016**: System MUST display real-time log stream with color-coded severity (info, warning, error) and auto-scroll to latest messages
- **FR-017**: System MUST show loading state with centered spinner and "Loading investigation progress..." message while initial data loads
- **FR-018**: System MUST display "No investigation ID found" message with "Back to Settings" button when investigationId is missing
- **FR-019**: System MUST provide state management for collapsible sections (showRadarView, showCorrelationGraph) with default expanded state for improved UX
- **FR-020**: System MUST handle ICE connection status from Redux state with fallback to true to prevent false disconnection warnings

### Key Entities

- **InvestigationProgress**: Represents real-time investigation execution state including status (pending/running/completed/failed/cancelled), completion percentage, phase information, tool executions array, agent statuses array, risk metrics (overall and byAgent), entity relationships array, and ICE connection indicator
- **ToolExecution**: Represents individual tool execution including tool name, agent type, execution status (queued/running/completed/failed/skipped), start/end timestamps, result data, and risk score contribution
- **AgentStatus**: Represents fraud detection agent state including agent type (device/location/logs/network/labels/risk), execution status, tools completed count, total tools count, average execution time, findings count, and risk score
- **PhaseProgress**: Represents investigation phase state including phase ID, phase name, status (pending/in_progress/completed), completion percentage, start/end timestamps, and associated tool executions
- **AnomalyDetection**: Represents detected fraud indicator including anomaly type, severity level (low/medium/high/critical), affected entity ID, detecting agent, timestamp, confidence score, and supporting evidence
- **EntityRelationship**: Represents discovered connection between entities including source entity ID, target entity ID, relationship type (shared device/location/behavior), strength indicator (0-100), discovery timestamp, and supporting tool executions

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Progress page displays all real-time components (EKG monitor, connection status, agent gauges, radar) within 2 seconds of page load
- **SC-002**: Tool execution status updates appear on Progress page within 3 seconds of backend status change without requiring page refresh
- **SC-003**: Polling system successfully fetches investigation updates every 3 seconds with less than 5% polling failure rate under normal network conditions
- **SC-004**: Agent risk gauges accurately reflect risk scores from backend with color transitions (gray→green→amber→red) based on severity thresholds (0-39, 40-59, 60-79, 80-100)
- **SC-005**: Connection status indicator correctly shows connected/reconnecting/disconnected states with less than 1 second latency from actual connection change
- **SC-006**: Entity correlation graph renders all entities and relationships within 1 second when relationship data updates
- **SC-007**: Radar visualization displays new anomalies within 2 seconds of detection with correct positioning based on detecting agent
- **SC-008**: Log stream displays all investigation logs in chronological order with no message loss and auto-scrolling maintains latest view
- **SC-009**: Phase progress indicators accurately show completion percentage for each phase synchronized with backend phase tracking
- **SC-010**: System gracefully handles terminal investigation states (completed/failed/cancelled) by stopping polling and displaying appropriate completion banner
- **SC-011**: All collapsible sections (risk, correlation, progress details) expand/collapse smoothly within 300ms with preserved state during session
- **SC-012**: EKG monitor waveform animates at 60 FPS with BPM calculation accurately reflecting current tools per second activity level
- **SC-013**: Component memory footprint remains under 50MB even for long-running investigations with 100+ tool executions and 500+ log messages
- **SC-014**: Tool execution timeline supports scrolling through 200+ tool executions without performance degradation or UI lag
- **SC-015**: Progress page successfully recovers from temporary polling failures by automatically retrying with exponential backoff without data loss

## Assumptions

- Backend /progress endpoint is already implemented and returns complete InvestigationProgress JSON structure
- InvestigationWizardContext provides access to investigation state, settings, and dispatch function for updates
- WebSocket ICE events are available as backup for real-time updates (not primary data source)
- Redux store maintains investigation state synchronized with backend via polling
- All GAIA components (EnhancedEKGMonitor, AgentRiskGaugesSection, InvestigationRadarView, EntityCorrelationGraph) are already implemented in GAIA codebase
- Frontend has WizardProgressApiService class for making /progress API calls
- useProgressData hook is available for polling management with automatic cleanup
- Agent type mapping between backend canonical types and frontend display names is established
- Risk metrics structure includes both overall risk score and byAgent breakdown
- Tool executions array provides all necessary fields including agent assignments
- Investigation lifecycle phases (initialization, analysis, correlation, assessment, reporting) are standardized
- CollaborationOverlay functionality is already implemented but not yet integrated into Progress page
- Browser supports modern React hooks (useState, useEffect, useMemo) and context API

## Dependencies

- GAIA web plugin codebase at `/Users/gklainert/Documents/Gaia/gaia-webplugin/` as reference for component structure and styling
- Existing Olorin Progress page at `/Users/gklainert/Documents/olorin/olorin-front/src/microservices/investigation/pages/ProgressPage.tsx` as integration target
- Olorin backend /progress API endpoint providing real-time investigation data
- React 18 with TypeScript for type safety
- Tailwind CSS for styling (no Material-UI allowed per SYSTEM MANDATE)
- Zustand for wizard state management
- React Router for navigation between wizard pages

## Out of Scope

- Implementation of backend /progress API endpoint (assumed already exists)
- WebSocket ICE push notification system (exists but not primary data source)
- Investigation execution engine and agent framework
- Authentication and authorization for Progress page access
- PDF report generation from Progress page view
- Historical investigation comparison or playback features
- Collaborative editing of investigation settings from Progress page
- Mobile-responsive design (focus on desktop experience)
- Accessibility compliance (WCAG 2.1 AA) - will be addressed in separate feature
- Internationalization and localization of Progress page text
- Performance profiling and optimization beyond basic requirements
