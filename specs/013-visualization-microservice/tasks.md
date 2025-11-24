# Implementation Tasks: Visualization Microservice

**Feature**: Visualization Microservice
**Branch**: `002-visualization-microservice`
**Created**: 2025-11-08
**Total Tasks**: 87
**Estimated Duration**: 6-8 weeks

---

## 📋 Task Overview

This document provides a comprehensive, dependency-ordered task list for implementing the Visualization Microservice. Tasks are organized by functional area (user stories) to enable independent implementation and testing of complete features.

### Task Organization Strategy

- **Phase 1**: Setup & Infrastructure (T001-T015) - Project initialization
- **Phase 2**: Foundational Services (T016-T025) - Core services needed by all stories
- **Phase 3**: Risk Visualization (T026-T034) - US1
- **Phase 4**: Network Visualization (T035-T045) - US2
- **Phase 5**: Geographic Visualization (T046-T054) - US3
- **Phase 6**: Timeline Visualization (T055-T063) - US4
- **Phase 7**: Real-Time Monitoring (T064-T072) - US5
- **Phase 8**: Chart Builder & Dashboards (T073-T082) - US6
- **Phase 9**: Polish & Integration (T083-T087) - Cross-cutting concerns

### Parallel Execution Opportunities

Tasks marked with **[P]** can be executed in parallel with other [P] tasks in the same phase, as they work on different files with no shared dependencies.

---

## Phase 1: Setup & Infrastructure

**Goal**: Initialize project structure, dependencies, and configuration

**Duration**: 1 week

### Tasks

- [ ] T001 Create microservice directory structure at src/microservices/visualization/
- [ ] T002 Initialize Webpack 5 Module Federation configuration for visualization service in webpack.visualization.config.js
- [ ] T003 Configure TypeScript compilation settings in src/microservices/visualization/tsconfig.json
- [ ] T004 Set up Tailwind CSS configuration in src/microservices/visualization/tailwind.config.js
- [ ] T005 [P] Install visualization dependencies: d3@7.9.0, chart.js@4.2.1, vis-network@9.1.13, recharts@3.2.1
- [ ] T006 [P] Install React dependencies: react-chartjs-2@5.2.0, react-flow-renderer@10.3.17
- [ ] T007 [P] Install utility dependencies: @googlemaps/js-api-loader@1.16.8, html2canvas@1.4.1, lucide-react@0.263.0
- [ ] T008 [P] Install schema validation: zod@3.22.4
- [ ] T009 Create environment configuration schema with Zod validation in src/microservices/visualization/config/validation.ts
- [ ] T010 Implement configuration loader with fail-fast validation in src/microservices/visualization/config/environment.ts
- [ ] T011 Create default configuration values in src/microservices/visualization/config/defaults.ts
- [ ] T012 Set up .env.example file with all required configuration variables
- [ ] T013 Create Bootstrap entry point with configuration validation in src/microservices/visualization/bootstrap.tsx
- [ ] T014 Create main App component with error boundaries in src/microservices/visualization/App.tsx
- [ ] T015 Configure Module Federation exports for remote consumption in webpack config

**Validation Criteria**:
- `npm run dev:visualization` starts service on port 3004
- Configuration validation fails for missing GOOGLE_MAPS_API_KEY
- Error boundaries catch and display configuration errors
- TypeScript compilation succeeds with no errors

---

## Phase 2: Foundational Services

**Goal**: Implement core services and utilities needed by all visualization components

**Duration**: 1 week

### Tasks

- [ ] T016 [P] Implement Event Bus singleton for inter-service communication in src/shared/events/EventBus.ts
- [ ] T017 [P] Define event type schemas with Zod validation in src/microservices/visualization/types/events.types.ts
- [ ] T018 [P] Create visualization state management interfaces in src/microservices/visualization/types/visualization.types.ts
- [ ] T019 Implement event bus service integration in src/microservices/visualization/services/eventBusService.ts
- [ ] T020 [P] Create color palette utilities with Olorin corporate colors in src/microservices/visualization/utils/colorPalettes.ts
- [ ] T021 [P] Implement data transformation service for API response normalization in src/microservices/visualization/services/dataTransformService.ts
- [ ] T022 [P] Create export service with PNG/SVG/JSON support in src/microservices/visualization/services/exportService.ts
- [ ] T023 [P] Implement visualization state persistence hook using localStorage in src/microservices/visualization/hooks/useVisualizationState.ts
- [ ] T024 [P] Create event bus subscription hook for component integration in src/microservices/visualization/hooks/useEventBus.ts
- [ ] T025 [P] Implement common UI components: LoadingState, EmptyState, ExportButton in src/microservices/visualization/components/common/

**Validation Criteria**:
- Event bus publishes and receives events with type validation
- Color palettes return correct hex values for all severity levels
- Export service generates valid PNG, SVG, and JSON files
- State persistence survives page reload

---

## Phase 3: Risk Visualization (US1)

**Goal**: Implement risk score visualization with gauges and dashboards

**User Story**: As a fraud analyst, I need to see real-time risk scores with visual indicators so that I can quickly assess investigation severity.

**Requirements**: FR-001 through FR-005

**Duration**: 1.5 weeks

### Tasks

- [ ] T026 [P] [US1] Create RiskGauge component with circular gauge rendering in src/microservices/visualization/components/risk/RiskGauge.tsx (<200 lines)
- [ ] T027 [P] [US1] Create HyperGauge component with animated needle in src/microservices/visualization/components/risk/HyperGauge.tsx (<200 lines)
- [ ] T028 [P] [US1] Implement useSpringValue hook for smooth gauge animations in src/microservices/visualization/hooks/useSpringValue.ts
- [ ] T029 [US1] Create RiskGaugeCard wrapper component with severity color coding in src/microservices/visualization/components/risk/RiskGaugeCard.tsx (<200 lines)
- [ ] T030 [US1] Implement RiskDashboard multi-gauge layout component in src/microservices/visualization/components/risk/RiskDashboard.tsx (<200 lines)
- [ ] T031 [US1] Subscribe to 'investigation:risk-updated' events in RiskDashboard
- [ ] T032 [US1] Implement risk trend calculation utility in src/microservices/visualization/utils/riskTrends.ts
- [ ] T033 [US1] Add export functionality to all risk gauge components
- [ ] T034 [US1] Create barrel exports for risk components in src/microservices/visualization/components/risk/index.ts

**Independent Test Criteria**:
- Risk gauges render with correct colors for all severity levels (low, medium, high, critical)
- Gauge animations run at 60 FPS with spring physics
- Real-time updates reflect within 1 second of receiving event
- Multiple gauges display correctly in dashboard layout
- Export generates valid PNG/SVG files

**Parallel Opportunities**: T026, T027, T028 can run in parallel (different files)

---

## Phase 4: Network Visualization (US2)

**Goal**: Implement entity relationship network graphs with interactive exploration

**User Story**: As a fraud analyst, I need to explore entity relationships through network diagrams so that I can understand connections between accounts, devices, and locations.

**Requirements**: FR-006 through FR-012

**Duration**: 2 weeks

### Tasks

- [ ] T035 [P] [US2] Create NetworkGraph component using vis-network in src/microservices/visualization/components/network/NetworkGraph.tsx (<200 lines)
- [ ] T036 [P] [US2] Implement useVisNetwork hook for graph lifecycle management in src/microservices/visualization/hooks/useVisNetwork.ts
- [ ] T037 [P] [US2] Create network layout algorithms utility in src/microservices/visualization/utils/networkLayout.ts
- [ ] T038 [US2] Implement NetworkControls component for zoom/fit/physics toggles in src/microservices/visualization/components/network/NetworkControls.tsx (<200 lines)
- [ ] T039 [US2] Create NetworkStats component showing node/edge counts in src/microservices/visualization/components/network/NetworkStats.tsx (<200 lines)
- [ ] T040 [US2] Subscribe to 'investigation:entity-discovered' events in NetworkGraph
- [ ] T041 [US2] Publish 'visualization:node-selected' events on node click
- [ ] T042 [US2] Publish 'visualization:edge-selected' events on edge click
- [ ] T043 [US2] Implement node color coding by entity type and risk score
- [ ] T044 [US2] Add performance optimization for 1000+ node networks with clustering
- [ ] T045 [US2] Create barrel exports for network components in src/microservices/visualization/components/network/index.ts

**Independent Test Criteria**:
- Network graphs render with correct node/edge relationships
- Physics-based layout animates smoothly at 30+ FPS
- Node selection publishes correct event to event bus
- Networks with 100+ nodes load within 2 seconds
- Export captures complete network structure in JSON

**Parallel Opportunities**: T035, T036, T037 can run in parallel (different files)

---

## Phase 5: Geographic Visualization (US3)

**Goal**: Implement interactive maps showing investigation locations

**User Story**: As a fraud analyst, I need to view geographic data on interactive maps so that I can see where suspicious activities occurred.

**Requirements**: FR-013 through FR-018

**Duration**: 1.5 weeks

### Tasks

- [ ] T046 [P] [US3] Create LocationMap component using Google Maps API in src/microservices/visualization/components/maps/LocationMap.tsx (<200 lines)
- [ ] T047 [P] [US3] Create MapControls component for zoom/filter controls in src/microservices/visualization/components/maps/MapControls.tsx (<200 lines)
- [ ] T048 [P] [US3] Create custom MapMarker component with risk color coding in src/microservices/visualization/components/maps/MapMarker.tsx (<200 lines)
- [ ] T049 [US3] Implement Google Maps loader utility using @googlemaps/js-api-loader in src/microservices/visualization/utils/mapLoader.ts
- [ ] T050 [US3] Subscribe to 'investigation:location-detected' events in LocationMap
- [ ] T051 [US3] Publish 'visualization:location-clicked' events on marker click
- [ ] T052 [US3] Publish 'visualization:map-view-changed' events on zoom/pan
- [ ] T053 [US3] Implement marker clustering for dense areas using MarkerClusterer
- [ ] T054 [US3] Create barrel exports for map components in src/microservices/visualization/components/maps/index.ts

**Independent Test Criteria**:
- Maps load with valid Google Maps API key
- Location markers display with correct color coding by type
- Marker click publishes correct event with coordinates
- Clustering activates automatically with 500+ markers
- Map view changes publish correct bounds and zoom level

**Parallel Opportunities**: T046, T047, T048 can run in parallel (different files)

---

## Phase 6: Timeline Visualization (US4)

**Goal**: Implement chronological event timeline with filtering and search

**User Story**: As a fraud analyst, I need to track investigation progress through timelines so that I can understand the sequence of events.

**Requirements**: FR-019 through FR-024

**Duration**: 1.5 weeks

### Tasks

- [ ] T055 [P] [US4] Create Timeline component with virtualized rendering in src/microservices/visualization/components/timeline/Timeline.tsx (<200 lines)
- [ ] T056 [P] [US4] Create TimelineEvent component for individual events in src/microservices/visualization/components/timeline/TimelineEvent.tsx (<200 lines)
- [ ] T057 [P] [US4] Create TimelineFilters component with type/severity/date filters in src/microservices/visualization/components/timeline/TimelineFilters.tsx (<200 lines)
- [ ] T058 [US4] Implement timeline search functionality with debounced input
- [ ] T059 [US4] Subscribe to 'investigation:log-entry' events in Timeline
- [ ] T060 [US4] Publish 'visualization:timeline-event-expanded' events on expand
- [ ] T061 [US4] Publish 'visualization:timeline-filtered' events on filter change
- [ ] T062 [US4] Implement virtualization for 10,000+ events using react-window
- [ ] T063 [US4] Create barrel exports for timeline components in src/microservices/visualization/components/timeline/index.ts

**Independent Test Criteria**:
- Timeline displays events in chronological order
- Color coding applies correctly for all event types
- Search finds events by title and description
- Filters reduce visible events correctly
- Virtualization maintains 60 FPS with 10,000+ events

**Parallel Opportunities**: T055, T056, T057 can run in parallel (different files)

---

## Phase 7: Real-Time Monitoring (US5)

**Goal**: Implement real-time monitoring visualizations (EKG, sparklines, radar)

**User Story**: As a fraud analyst, I need to monitor agent performance through live indicators so that I can track tool execution status in real-time.

**Requirements**: FR-025 through FR-029

**Duration**: 1.5 weeks

### Tasks

- [ ] T064 [P] [US5] Create EKGMonitor component with canvas waveform in src/microservices/visualization/components/monitoring/EKGMonitor.tsx (<200 lines)
- [ ] T065 [P] [US5] Create TPSSparkline component with Chart.js in src/microservices/visualization/components/monitoring/TPSSparkline.tsx (<200 lines)
- [ ] T066 [P] [US5] Create RadarVisualization component with D3.js in src/microservices/visualization/components/monitoring/RadarVisualization.tsx (<200 lines)
- [ ] T067 [P] [US5] Implement useRadarAnimation hook for smooth rotation in src/microservices/visualization/hooks/useRadarAnimation.ts
- [ ] T068 [P] [US5] Create radar geometry calculation utilities in src/microservices/visualization/utils/radarGeometry.ts
- [ ] T069 [US5] Subscribe to 'agent:heartbeat' events in EKGMonitor
- [ ] T070 [US5] Subscribe to 'agent:tps-updated' events in TPSSparkline
- [ ] T071 [US5] Implement 60 FPS rendering for all real-time components using requestAnimationFrame
- [ ] T072 [US5] Create barrel exports for monitoring components in src/microservices/visualization/components/monitoring/index.ts

**Independent Test Criteria**:
- EKG waveform animates smoothly at 60 FPS
- Sparkline updates reflect latest 30 TPS samples
- Radar visualization rotates with anomaly highlighting
- Canvas rendering maintains performance with rapid updates
- Connection status indicator shows real-time WebSocket state

**Parallel Opportunities**: T064, T065, T066, T067, T068 can run in parallel (different files)

---

## Phase 8: Chart Builder & Dashboards (US6)

**Goal**: Implement interactive chart builder with 15 chart types and multi-view dashboards

**User Story**: As a fraud analyst, I need to create custom charts to analyze fraud patterns so that I can explore data from different perspectives.

**Requirements**: FR-030 through FR-035

**Duration**: 2 weeks

### Tasks

- [ ] T073 [P] [US6] Create ChartBuilder wizard component in src/microservices/visualization/components/charts/ChartBuilder.tsx (<200 lines)
- [ ] T074 [P] [US6] Create ChartRenderer component supporting 15 chart types in src/microservices/visualization/components/charts/ChartRenderer.tsx (<200 lines)
- [ ] T075 [P] [US6] Create DataVisualization dashboard component in src/microservices/visualization/components/charts/DataVisualization.tsx (<200 lines)
- [ ] T076 [P] [US6] Implement chart configuration helpers in src/microservices/visualization/utils/chartHelpers.ts
- [ ] T077 [US6] Implement chart type validation and compatibility checks
- [ ] T078 [US6] Create chart configuration persistence using localStorage
- [ ] T079 [US6] Publish 'visualization:chart-created' events on chart save
- [ ] T080 [US6] Publish 'visualization:dashboard-view-changed' events on view switch
- [ ] T081 [US6] Implement all 5 color palette options across chart types
- [ ] T082 [US6] Create barrel exports for chart components in src/microservices/visualization/components/charts/index.ts

**Independent Test Criteria**:
- Chart builder wizard completes successfully for all 15 types
- Chart configurations save and load from localStorage
- Dashboard switches between 4 views (overview, risk analysis, geographic, trends)
- Color palettes apply uniformly across all chart types
- Invalid chart configurations show specific error messages

**Parallel Opportunities**: T073, T074, T075, T076 can run in parallel (different files)

---

## Phase 9: Polish & Integration

**Goal**: Complete cross-cutting concerns, documentation, and production readiness

**Duration**: 1 week

### Tasks

- [ ] T083 Implement comprehensive error boundaries for all visualization categories
- [ ] T084 Add accessibility features: keyboard navigation, screen reader support, ARIA labels
- [ ] T085 Optimize bundle sizes with code splitting and lazy loading
- [ ] T086 Create integration tests for event bus communication with other microservices
- [ ] T087 Update README and quickstart guide with actual implementation details

**Validation Criteria**:
- All error boundaries catch and display errors gracefully
- Keyboard navigation works for all interactive visualizations
- Bundle size is under 500KB per visualization category
- Integration tests pass for all event subscriptions and publications
- Documentation matches actual implementation

---

## Task Dependencies

### Critical Path

```
Setup (Phase 1)
  → Foundational Services (Phase 2)
    → Risk Visualization (Phase 3) [Can start first]
    → Network Visualization (Phase 4) [Parallel with Risk]
    → Geographic Visualization (Phase 5) [Parallel with Network]
    → Timeline Visualization (Phase 6) [Parallel with Geographic]
    → Real-Time Monitoring (Phase 7) [Parallel with Timeline]
    → Chart Builder (Phase 8) [Parallel with Monitoring]
      → Polish & Integration (Phase 9)
```

### User Story Execution Order

**Independent Stories** (can implement in parallel after Phase 2):
- US1: Risk Visualization
- US2: Network Visualization
- US3: Geographic Visualization
- US4: Timeline Visualization
- US5: Real-Time Monitoring
- US6: Chart Builder & Dashboards

**Recommended MVP Scope** (for first release):
- Phase 1: Setup & Infrastructure
- Phase 2: Foundational Services
- Phase 3: Risk Visualization (US1)
- Phase 4: Network Visualization (US2)
- Phase 9: Polish & Integration (minimal)

This MVP provides core visualization capabilities (risk + relationships) while establishing the architecture for adding remaining features incrementally.

---

## Parallel Execution Examples

### Within Phase 3 (Risk Visualization)

Execute in parallel:
1. Developer A: T026 (RiskGauge) + T027 (HyperGauge)
2. Developer B: T028 (useSpringValue hook)

Then sequentially:
3. T029 (RiskGaugeCard) - needs T026 complete
4. T030 (RiskDashboard) - needs T029 complete
5. T031-T034 (Integration) - needs T030 complete

### Within Phase 4 (Network Visualization)

Execute in parallel:
1. Developer A: T035 (NetworkGraph)
2. Developer B: T036 (useVisNetwork hook)
3. Developer C: T037 (network layout algorithms)

Then sequentially:
4. T038-T039 (Controls + Stats) - needs T035 complete
5. T040-T044 (Integration) - needs T038-T039 complete

### Across Multiple Phases (After Phase 2)

Execute in parallel:
- Team 1: Phase 3 (Risk Visualization)
- Team 2: Phase 4 (Network Visualization)
- Team 3: Phase 5 (Geographic Visualization)
- Team 4: Phase 6 (Timeline Visualization)

All converge at Phase 9 (Polish & Integration)

---

## Implementation Strategy

### Incremental Delivery Approach

1. **Week 1**: Complete Phase 1 (Setup) and Phase 2 (Foundational)
2. **Week 2-3**: Implement MVP (Phase 3 Risk + Phase 4 Network)
3. **Week 4**: Deploy MVP, gather feedback, iterate
4. **Week 5-6**: Add Phase 5 Geographic + Phase 6 Timeline
5. **Week 7**: Add Phase 7 Real-Time + Phase 8 Chart Builder
6. **Week 8**: Polish, performance optimization, documentation

### Quality Gates

Each phase must pass these gates before proceeding:

- **Code Quality**: All files under 200 lines, TypeScript compilation succeeds, no linting errors
- **Performance**: Real-time visualizations maintain target FPS, load times meet requirements
- **Testing**: Independent test criteria for phase passes
- **Integration**: Event bus events publish and subscribe correctly
- **Documentation**: Phase completion documented in plan.md

---

## File Size Compliance

**CRITICAL**: All `.tsx` and `.ts` files MUST be under 200 lines.

**Enforcement**:
- Run `npm run check:file-sizes` after each task
- If a file exceeds 200 lines, refactor immediately into smaller modules
- Use composition and separation of concerns to maintain modularity

**Common Patterns for 200-Line Compliance**:
- Extract hooks to separate files (e.g., useVisNetwork, useSpringValue)
- Create utility modules for calculations (e.g., radarGeometry, networkLayout)
- Split large components into smaller focused components
- Use barrel exports (index.ts) to maintain clean imports

---

## Technology Stack Reference

**From plan.md**:

- **Core**: TypeScript 5.x, React 18.2
- **Visualization**: D3.js 7.9.0, Chart.js 4.2.1, vis-network 9.1.13, recharts 3.2.1
- **React Integration**: react-chartjs-2 5.2.0, react-flow-renderer 10.3.17
- **Maps**: @googlemaps/js-api-loader 1.16.8
- **Utilities**: html2canvas 1.4.1, lucide-react 0.263.0, zod 3.22.4
- **Styling**: Tailwind CSS 3.x (Olorin corporate palette)
- **Build**: Webpack 5 Module Federation

---

## Configuration Requirements

**Environment Variables Required** (from contracts/config.ts):

### Critical (MUST be set):
```bash
VISUALIZATION_BASE_URL=http://localhost:3004
GOOGLE_MAPS_API_KEY=<your-api-key>
```

### Optional (have defaults):
```bash
VISUALIZATION_PORT=3004
EVENT_BUS_TYPE=local
VISUALIZATION_TARGET_FPS=60
VISUALIZATION_MAX_NETWORK_NODES=1000
# ... see contracts/config.ts for complete list
```

**Fail-Fast Validation**: Service will NOT start if required configuration is missing or invalid.

---

## Success Metrics (from spec.md)

### Performance Targets

- Real-time visualizations: **60 FPS consistently**
- Network graphs (100+ nodes): Load within **2 seconds**
- Map visualizations (500+ markers): Render within **3 seconds**
- Timeline (1,000 events): Display within **1 second**
- Dashboard view switching: Within **2 seconds**
- Export generation: Within **5 seconds**
- Event bus latency: Under **50 milliseconds**

### User Experience Targets

- Visualization interactions respond within **100 milliseconds**
- Chart builder completion time averages under **2 minutes**
- Zero data loss during real-time updates

### System Reliability Targets

- 99.9% uptime during investigation periods
- WebSocket auto-recovery within 5 seconds
- Memory stable during 8-hour sessions
- 99% export success rate

---

## Format Validation

✅ **All tasks follow required checklist format**:
- Checkbox prefix: `- [ ]`
- Task ID: T001-T087 (sequential)
- [P] marker: Indicates parallelizable tasks
- [US#] label: Indicates user story for Phases 3-8
- File path: Exact location for implementation
- Description: Clear action with context

**Example Task Formats**:
- ✅ `- [ ] T001 Create microservice directory structure at src/microservices/visualization/`
- ✅ `- [ ] T026 [P] [US1] Create RiskGauge component with circular gauge rendering in src/microservices/visualization/components/risk/RiskGauge.tsx (<200 lines)`
- ✅ `- [ ] T040 [US2] Subscribe to 'investigation:entity-discovered' events in NetworkGraph`

---

## Summary

- **Total Tasks**: 87
- **Setup & Infrastructure**: 15 tasks (Phase 1)
- **Foundational Services**: 10 tasks (Phase 2)
- **Risk Visualization (US1)**: 9 tasks (Phase 3)
- **Network Visualization (US2)**: 11 tasks (Phase 4)
- **Geographic Visualization (US3)**: 9 tasks (Phase 5)
- **Timeline Visualization (US4)**: 9 tasks (Phase 6)
- **Real-Time Monitoring (US5)**: 9 tasks (Phase 7)
- **Chart Builder (US6)**: 10 tasks (Phase 8)
- **Polish & Integration**: 5 tasks (Phase 9)
- **Parallelizable Tasks**: 42 tasks marked [P]
- **Independent User Stories**: 6 (can implement in parallel after Phase 2)
- **MVP Tasks**: ~34 tasks (Phases 1, 2, 3, 4, and minimal Phase 9)

---

**Next Steps**:

1. ✅ Review this task list with stakeholders
2. ✅ Assign tasks to development team
3. ✅ Begin with Phase 1 (Setup & Infrastructure)
4. ✅ Use TodoWrite tool to track progress during implementation
5. ✅ Update plan.md with progress markers after each phase
6. ✅ Run `/speckit.implement` when ready to begin automated implementation

**Generated**: 2025-11-08
**Last Updated**: 2025-11-08
