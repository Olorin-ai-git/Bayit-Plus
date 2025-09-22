# Implementation Tasks: Hybrid Graph Investigation UI

**Feature**: Hybrid Graph Investigation UI Concepts
**Location**: `/Users/gklainert/Documents/olorin/olorin-front/src/microservices/autonomous-investigation`
**Branch**: `003-hybrid-graph-investigation`
**Created**: 2025-01-21

## Task Overview

This document defines 47 executable tasks for implementing the Hybrid Graph Investigation UI within the autonomous-investigation microservice. Tasks are ordered by dependencies and include parallel execution opportunities marked with [P].

### Technology Stack
- **Frontend**: React 18+ with TypeScript
- **Styling**: Tailwind CSS (no Material-UI)
- **Graph**: D3.js for Network Explorer, React Flow for other concepts
- **State**: React Query + Zustand
- **Virtualization**: react-window for timeline
- **Charts**: Recharts for summary visualizations
- **Testing**: Jest + React Testing Library + Cypress

## Setup Tasks (T001-T008)

### T001: Project Structure Setup
**File**: `/Users/gklainert/Documents/olorin/olorin-front/src/microservices/autonomous-investigation/`
**Description**: Create complete microservice directory structure
**Commands**:
```bash
mkdir -p src/microservices/autonomous-investigation/{components,hooks,stores,types,utils,assets}
mkdir -p src/microservices/autonomous-investigation/components/{power-grid,command-center,evidence-trail,network-explorer}
mkdir -p src/microservices/autonomous-investigation/components/shared/{graph,timeline,evidence,export}
mkdir -p src/microservices/autonomous-investigation/__tests__/{components,hooks,integration}
```
**Dependencies**: None
**Estimated Time**: 30 minutes

### T002: TypeScript Configuration [P]
**File**: `/Users/gklainert/Documents/olorin/olorin-front/tsconfig.json`
**Description**: Add path mappings for autonomous-investigation microservice
**Key Changes**:
```json
{
  "compilerOptions": {
    "paths": {
      "@/autonomous-investigation/*": ["src/microservices/autonomous-investigation/*"]
    }
  }
}
```
**Dependencies**: T001
**Estimated Time**: 15 minutes

### T003: Package Dependencies [P]
**File**: `/Users/gklainert/Documents/olorin/olorin-front/package.json`
**Description**: Install required dependencies for graph visualization and UI
**Commands**:
```bash
npm install @types/d3 d3 react-flow-renderer @tanstack/react-query zustand react-window react-window-infinite-loader recharts lucide-react
npm install --save-dev @types/react-window @testing-library/react @testing-library/jest-dom
```
**Dependencies**: T001
**Estimated Time**: 10 minutes

### T004: Core Type Definitions [P]
**File**: `/Users/gklainert/Documents/olorin/olorin-front/src/microservices/autonomous-investigation/types/index.ts`
**Description**: Implement complete TypeScript interfaces from data model
**Key Interfaces**: Investigation, Domain, Evidence, TimelineEvent, GraphNode, GraphEdge, AgentTool, RiskProgression
**Dependencies**: T001
**Estimated Time**: 2 hours

### T005: Shared Types Export [P]
**File**: `/Users/gklainert/Documents/olorin/olorin-front/src/shared/types/investigation.ts`
**Description**: Create shared type definitions for cross-microservice usage
**Key Types**: Core investigation entities, API response types, event types
**Dependencies**: T004
**Estimated Time**: 1 hour

### T006: Environment Configuration [P]
**File**: `/Users/gklainert/Documents/olorin/olorin-front/.env.development.local`
**Description**: Set up development environment variables
**Key Variables**:
```bash
REACT_APP_AUTONOMOUS_INVESTIGATION_API=http://localhost:3001/api/v1
REACT_APP_WS_URL=ws://localhost:3001/ws
REACT_APP_ENABLE_MOCK_DATA=true
REACT_APP_GRAPH_DEBUG_MODE=true
```
**Dependencies**: T001
**Estimated Time**: 15 minutes

### T007: ESLint Configuration [P]
**File**: `/Users/gklainert/Documents/olorin/olorin-front/.eslintrc.js`
**Description**: Configure ESLint rules for microservice
**Key Rules**: React hooks, TypeScript strict mode, accessibility rules
**Dependencies**: T001
**Estimated Time**: 30 minutes

### T008: Bundle Analysis Setup [P]
**File**: `/Users/gklainert/Documents/olorin/olorin-front/scripts/analyze-bundle.js`
**Description**: Create bundle size monitoring for 200KB limit
**Features**: Per-concept bundle analysis, size warnings, performance tracking
**Dependencies**: T003
**Estimated Time**: 45 minutes

## Test Setup Tasks (T009-T016) [P]

### T009: Investigation API Contract Tests [P]
**File**: `/Users/gklainert/Documents/olorin/olorin-front/src/microservices/autonomous-investigation/__tests__/contracts/investigation-api.test.ts`
**Description**: Test all Investigation Management API endpoints
**Coverage**: POST /investigations, GET /investigations/{id}, GET /investigations, PATCH /investigations/{id}
**Mock Data**: Use contract examples from investigation-api.md
**Dependencies**: T004, T005
**Estimated Time**: 3 hours

### T010: Evidence API Contract Tests [P]
**File**: `/Users/gklainert/Documents/olorin/olorin-front/src/microservices/autonomous-investigation/__tests__/contracts/evidence-api.test.ts`
**Description**: Test Evidence APIs and data validation
**Coverage**: GET /investigations/{id}/evidence, POST /investigations/{id}/evidence
**Dependencies**: T004, T005
**Estimated Time**: 2 hours

### T011: Timeline API Contract Tests [P]
**File**: `/Users/gklainert/Documents/olorin/olorin-front/src/microservices/autonomous-investigation/__tests__/contracts/timeline-api.test.ts`
**Description**: Test Timeline event APIs and filtering
**Coverage**: GET /investigations/{id}/timeline with pagination and filters
**Dependencies**: T004, T005
**Estimated Time**: 2 hours

### T012: Graph API Contract Tests [P]
**File**: `/Users/gklainert/Documents/olorin/olorin-front/src/microservices/autonomous-investigation/__tests__/contracts/graph-api.test.ts`
**Description**: Test Graph data API and layout options
**Coverage**: GET /investigations/{id}/graph with different layouts
**Dependencies**: T004, T005
**Estimated Time**: 2 hours

### T013: Export API Contract Tests [P]
**File**: `/Users/gklainert/Documents/olorin/olorin-front/src/microservices/autonomous-investigation/__tests__/contracts/export-api.test.ts`
**Description**: Test report generation and export APIs
**Coverage**: POST /investigations/{id}/export, GET /exports/{id}
**Dependencies**: T004, T005
**Estimated Time**: 2 hours

### T014: WebSocket Contract Tests [P]
**File**: `/Users/gklainert/Documents/olorin/olorin-front/src/microservices/autonomous-investigation/__tests__/contracts/websocket.test.ts`
**Description**: Test real-time event subscriptions and message handling
**Coverage**: Connection, authentication, event subscriptions, message types
**Dependencies**: T004, T005
**Estimated Time**: 3 hours

### T015: Data Model Validation Tests [P]
**File**: `/Users/gklainert/Documents/olorin/olorin-front/src/microservices/autonomous-investigation/__tests__/models/validation.test.ts`
**Description**: Test all data model interfaces and validation rules
**Coverage**: Investigation, Domain, Evidence, TimelineEvent validation
**Dependencies**: T004
**Estimated Time**: 2 hours

### T016: Mock Data Generator [P]
**File**: `/Users/gklainert/Documents/olorin/olorin-front/src/microservices/autonomous-investigation/utils/mockData.ts`
**Description**: Create comprehensive mock data for development and testing
**Coverage**: Complete investigation scenarios, realistic data, edge cases
**Dependencies**: T004
**Estimated Time**: 3 hours

## Core Infrastructure Tasks (T017-T025)

### T017: React Query Client Setup
**File**: `/Users/gklainert/Documents/olorin/olorin-front/src/microservices/autonomous-investigation/App.tsx`
**Description**: Configure React Query client with optimal settings
**Features**: Caching strategy, error handling, retry logic
**Dependencies**: T003, T006
**Estimated Time**: 1 hour

### T018: Investigation Data Hooks
**File**: `/Users/gklainert/Documents/olorin/olorin-front/src/microservices/autonomous-investigation/hooks/useInvestigation.ts`
**Description**: Implement React Query hooks for investigation data
**Features**: useInvestigation, useInvestigations, useCreateInvestigation, useUpdateInvestigation
**Dependencies**: T004, T017
**Estimated Time**: 3 hours

### T019: Evidence Data Hooks [P]
**File**: `/Users/gklainert/Documents/olorin/olorin-front/src/microservices/autonomous-investigation/hooks/useEvidence.ts`
**Description**: Implement hooks for evidence management
**Features**: useEvidence, useAddEvidence, evidence filtering, verification
**Dependencies**: T004, T017
**Estimated Time**: 2 hours

### T020: Timeline Data Hooks [P]
**File**: `/Users/gklainert/Documents/olorin/olorin-front/src/microservices/autonomous-investigation/hooks/useTimeline.ts`
**Description**: Implement timeline event hooks with virtualization support
**Features**: useTimeline, filtering, pagination, virtualization helpers
**Dependencies**: T004, T017
**Estimated Time**: 2.5 hours

### T021: Graph Data Hooks [P]
**File**: `/Users/gklainert/Documents/olorin/olorin-front/src/microservices/autonomous-investigation/hooks/useGraphData.ts`
**Description**: Implement graph data hooks with layout management
**Features**: useGraphData, layout switching, node/edge management
**Dependencies**: T004, T017
**Estimated Time**: 2.5 hours

### T022: WebSocket Integration Hook
**File**: `/Users/gklainert/Documents/olorin/olorin-front/src/microservices/autonomous-investigation/hooks/useWebSocket.ts`
**Description**: Implement WebSocket connection and real-time updates
**Features**: Connection management, auto-reconnect, event handling, React Query invalidation
**Dependencies**: T004, T017, T018
**Estimated Time**: 4 hours

### T023: Investigation Store
**File**: `/Users/gklainert/Documents/olorin/olorin-front/src/microservices/autonomous-investigation/stores/investigationStore.ts`
**Description**: Create Zustand store for UI state management
**Features**: Selected investigation, UI preferences, local state, persistence
**Dependencies**: T004, T017
**Estimated Time**: 2 hours

### T024: Export Utilities [P]
**File**: `/Users/gklainert/Documents/olorin/olorin-front/src/microservices/autonomous-investigation/utils/export.ts`
**Description**: Implement client-side export functionality
**Features**: PDF generation, CSV export, JSON serialization, file download
**Dependencies**: T004
**Estimated Time**: 3 hours

### T025: Performance Utilities [P]
**File**: `/Users/gklainert/Documents/olorin/olorin-front/src/microservices/autonomous-investigation/utils/performance.ts`
**Description**: Create performance monitoring and optimization utilities
**Features**: Bundle size tracking, render performance, graph optimization
**Dependencies**: T004
**Estimated Time**: 2 hours

## Shared Component Tasks (T026-T032)

### T026: Graph Visualization Base
**File**: `/Users/gklainert/Documents/olorin/olorin-front/src/microservices/autonomous-investigation/components/shared/graph/GraphBase.tsx`
**Description**: Create foundational graph component with D3.js integration
**Features**: SVG rendering, zoom/pan, node/edge rendering, accessibility support
**Dependencies**: T003, T004, T021
**Estimated Time**: 6 hours

### T027: Graph Interactions [P]
**File**: `/Users/gklainert/Documents/olorin/olorin-front/src/microservices/autonomous-investigation/components/shared/graph/GraphInteractions.tsx`
**Description**: Implement graph interaction handlers
**Features**: Node selection, hover effects, lasso selection, keyboard navigation
**Dependencies**: T026
**Estimated Time**: 4 hours

### T028: Timeline Base Component
**File**: `/Users/gklainert/Documents/olorin/olorin-front/src/microservices/autonomous-investigation/components/shared/timeline/TimelineBase.tsx`
**Description**: Create virtualized timeline component
**Features**: Virtualization with react-window, event rendering, filtering
**Dependencies**: T003, T004, T020
**Estimated Time**: 5 hours

### T029: Timeline Event Component [P]
**File**: `/Users/gklainert/Documents/olorin/olorin-front/src/microservices/autonomous-investigation/components/shared/timeline/TimelineEvent.tsx`
**Description**: Individual timeline event component
**Features**: Expandable details, status indicators, performance optimization
**Dependencies**: T028
**Estimated Time**: 3 hours

### T030: Evidence Panel Component
**File**: `/Users/gklainert/Documents/olorin/olorin-front/src/microservices/autonomous-investigation/components/shared/evidence/EvidencePanel.tsx`
**Description**: Evidence display and interaction component
**Features**: Evidence details, verification controls, linking to timeline
**Dependencies**: T004, T019
**Estimated Time**: 4 hours

### T031: Domain Cards Component [P]
**File**: `/Users/gklainert/Documents/olorin/olorin-front/src/microservices/autonomous-investigation/components/shared/DomainCards.tsx`
**Description**: Domain analysis results component
**Features**: Risk score display, indicators, status tracking, drill-down
**Dependencies**: T004, T018
**Estimated Time**: 3 hours

### T032: Export Dialog Component [P]
**File**: `/Users/gklainert/Documents/olorin/olorin-front/src/microservices/autonomous-investigation/components/shared/export/ExportDialog.tsx`
**Description**: Export configuration and progress dialog
**Features**: Format selection, progress tracking, download handling
**Dependencies**: T024
**Estimated Time**: 2.5 hours

## UI Concept Implementation Tasks (T033-T040)

### T033: Power Grid Concept (Analyst-Dense)
**File**: `/Users/gklainert/Documents/olorin/olorin-front/src/microservices/autonomous-investigation/components/power-grid/PowerGridConcept.tsx`
**Description**: Implement maximum information density layout for expert investigators
**Features**: Tab-based navigation, compact panels, command palette, multi-investigation support
**Dependencies**: T026, T027, T028, T029, T030, T031
**Estimated Time**: 8 hours

### T034: Command Center Concept (Kanban/Swimlane)
**File**: `/Users/gklainert/Documents/olorin/olorin-front/src/microservices/autonomous-investigation/components/command-center/CommandCenterConcept.tsx`
**Description**: Implement workflow management interface for team leads
**Features**: Kanban board, drag-drop, SLA tracking, team coordination, bulk operations
**Dependencies**: T026, T028, T031
**Estimated Time**: 7 hours

### T035: Evidence Trail Concept (Timeline-First)
**File**: `/Users/gklainert/Documents/olorin/olorin-front/src/microservices/autonomous-investigation/components/evidence-trail/EvidenceTrailConcept.tsx`
**Description**: Implement chronological audit trail interface for compliance
**Features**: Detailed timeline, evidence examination, audit controls, immutable records
**Dependencies**: T028, T029, T030, T032
**Estimated Time**: 8 hours

### T036: Network Explorer Concept (Graph-First)
**File**: `/Users/gklainert/Documents/olorin/olorin-front/src/microservices/autonomous-investigation/components/network-explorer/NetworkExplorerConcept.tsx`
**Description**: Implement advanced graph analysis interface for technical users
**Features**: Multiple layouts, advanced filtering, path analysis, clustering
**Dependencies**: T026, T027, T030
**Estimated Time**: 10 hours

### T037: Concept Router Component
**File**: `/Users/gklainert/Documents/olorin/olorin-front/src/microservices/autonomous-investigation/components/ConceptRouter.tsx`
**Description**: Route between UI concepts based on user preferences
**Features**: Concept selection, state preservation, URL routing
**Dependencies**: T033, T034, T035, T036, T023
**Estimated Time**: 2 hours

### T038: Main Application Component
**File**: `/Users/gklainert/Documents/olorin/olorin-front/src/microservices/autonomous-investigation/App.tsx`
**Description**: Main application with concept selector and providers
**Features**: Query client provider, WebSocket provider, error boundaries
**Dependencies**: T017, T022, T023, T037
**Estimated Time**: 2 hours

### T039: Microservice Entry Point [P]
**File**: `/Users/gklainert/Documents/olorin/olorin-front/src/microservices/autonomous-investigation/index.ts`
**Description**: Export main application for microservice loading
**Dependencies**: T038
**Estimated Time**: 30 minutes

### T040: Performance Optimization
**File**: Multiple files - code splitting and lazy loading
**Description**: Implement dynamic imports and bundle optimization
**Features**: Concept lazy loading, D3.js on-demand loading, route-based splitting
**Dependencies**: T033, T034, T035, T036, T025
**Estimated Time**: 4 hours

## Integration Tasks (T041-T044)

### T041: Microservice Event Bus Integration
**File**: `/Users/gklainert/Documents/olorin/olorin-front/src/microservices/autonomous-investigation/services/eventBus.ts`
**Description**: Integrate with Olorin microservice event system
**Features**: Event publishing, subscription handling, cross-service communication
**Dependencies**: T022, T038
**Estimated Time**: 3 hours

### T042: Core UI Components Integration [P]
**File**: `/Users/gklainert/Documents/olorin/olorin-front/src/microservices/autonomous-investigation/components/shared/CoreUIIntegration.ts`
**Description**: Integrate with shared Core UI Service components
**Features**: Import shared components, maintain design consistency
**Dependencies**: T038
**Estimated Time**: 2 hours

### T043: Authentication Integration [P]
**File**: `/Users/gklainert/Documents/olorin/olorin-front/src/microservices/autonomous-investigation/hooks/useAuth.ts`
**Description**: Integrate with existing authentication system
**Features**: JWT token management, role-based access, session handling
**Dependencies**: T018, T022
**Estimated Time**: 2 hours

### T044: Module Federation Setup
**File**: `/Users/gklainert/Documents/olorin/olorin-front/webpack.config.js`
**Description**: Configure Webpack Module Federation for autonomous-investigation
**Features**: Expose microservice, shared dependencies, runtime loading
**Dependencies**: T038, T039
**Estimated Time**: 3 hours

## Polish Tasks (T045-T047) [P]

### T045: Accessibility Compliance Testing [P]
**File**: `/Users/gklainert/Documents/olorin/olorin-front/src/microservices/autonomous-investigation/__tests__/accessibility/wcag-compliance.test.ts`
**Description**: Comprehensive WCAG 2.1 Level AA testing
**Coverage**: Keyboard navigation, screen reader support, color contrast, ARIA labels
**Tools**: axe-core, jest-axe, manual testing checklist
**Dependencies**: T033, T034, T035, T036
**Estimated Time**: 6 hours

### T046: Performance Testing [P]
**File**: `/Users/gklainert/Documents/olorin/olorin-front/src/microservices/autonomous-investigation/__tests__/performance/bundle-analysis.test.ts`
**Description**: Bundle size and runtime performance testing
**Coverage**: 200KB bundle limit, 60fps interactions, memory usage
**Tools**: Lighthouse CI, webpack-bundle-analyzer, React DevTools Profiler
**Dependencies**: T040, T045
**Estimated Time**: 4 hours

### T047: Integration Testing Suite [P]
**File**: `/Users/gklainert/Documents/olorin/olorin-front/src/microservices/autonomous-investigation/__tests__/integration/e2e.test.ts`
**Description**: End-to-end testing with Cypress
**Coverage**: Complete investigation workflows, real-time updates, export functionality
**Tools**: Cypress, real API mocking, visual regression testing
**Dependencies**: T041, T042, T043, T044
**Estimated Time**: 8 hours

## Task Dependencies and Execution Order

### Phase 1: Foundation (Week 1)
**Sequential**: T001 → T002, T003, T004, T005, T006, T007, T008
**Parallel Groups**:
- Group A [P]: T002, T003, T006, T007 (Configuration tasks)
- Group B [P]: T004, T005 (Type definitions)
- Group C [P]: T008 (Bundle analysis)

### Phase 2: Testing Foundation (Week 1-2)
**Parallel Groups**:
- API Tests [P]: T009, T010, T011, T012, T013, T014
- Model Tests [P]: T015, T016

### Phase 3: Core Infrastructure (Week 2-3)
**Sequential**: T017 → T018
**Parallel Groups**:
- Data Hooks [P]: T019, T020, T021 (after T018)
- WebSocket [P]: T022 (after T018)
- Utilities [P]: T023, T024, T025

### Phase 4: Shared Components (Week 3-4)
**Sequential**: T026 → T027, T028 → T029
**Parallel Groups**:
- UI Components [P]: T030, T031, T032 (after T026, T028)

### Phase 5: UI Concepts (Week 4-6)
**Sequential**: T033, T034, T035, T036 → T037 → T038 → T039
**Parallel**: T040 (optimization)

### Phase 6: Integration (Week 6-7)
**Parallel Groups**:
- Integration [P]: T041, T042, T043, T044

### Phase 7: Polish (Week 7-8)
**Parallel Groups**:
- Testing [P]: T045, T046, T047

## Parallel Execution Examples

### Week 1 Parallel Tasks
```bash
# Terminal 1: Type definitions
Task(subagent_type="typescript-pro", description="Core type definitions", prompt="Implement TypeScript interfaces from data-model.md in /Users/gklainert/Documents/olorin/olorin-front/src/microservices/autonomous-investigation/types/index.ts")

# Terminal 2: Configuration
Task(subagent_type="frontend-developer", description="TypeScript configuration", prompt="Configure tsconfig.json path mappings for autonomous-investigation microservice")

# Terminal 3: Dependencies
Task(subagent_type="frontend-developer", description="Package dependencies", prompt="Install D3.js, React Query, Zustand and other required dependencies")
```

### Week 2 API Contract Testing
```bash
# All can run in parallel
Task(subagent_type="test-writer-fixer", description="Investigation API tests", prompt="Create comprehensive tests for Investigation Management API endpoints using contract specifications")

Task(subagent_type="test-writer-fixer", description="Evidence API tests", prompt="Test Evidence APIs with proper data validation and error handling")

Task(subagent_type="test-writer-fixer", description="Timeline API tests", prompt="Implement Timeline API tests with pagination and filtering scenarios")
```

### Week 4 Shared Components
```bash
# After T026 and T028 complete
Task(subagent_type="frontend-developer", description="Evidence panel", prompt="Implement evidence display component with verification controls")

Task(subagent_type="frontend-developer", description="Domain cards", prompt="Create domain analysis results component with risk visualization")

Task(subagent_type="frontend-developer", description="Export dialog", prompt="Build export configuration dialog with progress tracking")
```

## Success Criteria Per Task

### Functional Criteria
- All components render without errors
- API integration working with proper error handling
- Real-time updates functional via WebSocket
- Export functionality generates valid files
- Graph interactions meet 60fps requirement

### Technical Criteria
- Bundle size under 200KB per concept
- Test coverage above 80%
- TypeScript strict mode compliance
- ESLint rules passing
- WCAG 2.1 Level AA compliance

### Performance Criteria
- Initial load under 2 seconds
- Graph rendering at 60fps with 300 nodes
- Timeline virtualization smooth with 10k+ events
- Memory usage stable during extended use

## Risk Mitigation

### High-Risk Tasks
- **T026, T027**: Graph visualization complexity - Consider React Flow fallback
- **T022**: WebSocket integration - Implement reconnection and fallback
- **T040**: Bundle optimization - Monitor size continuously
- **T045**: Accessibility - Start early, test frequently

### Monitoring
- Bundle size analysis after each concept (T033-T036)
- Performance testing after shared components (T026-T032)
- Accessibility testing throughout development
- Integration testing after each phase

This task breakdown provides clear, executable instructions for implementing the Hybrid Graph Investigation UI with proper dependency management, parallel execution opportunities, and comprehensive quality assurance.