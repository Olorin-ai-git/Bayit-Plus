# Tasks: Enhanced Frontend Refactoring - Tailwind CSS Migration & 8 Microservices Architecture

**Input**: Design documents from `/specs/001-refactoring-the-frontend/`
**Prerequisites**: plan.md ✅, research.md ✅, data-model.md ✅
**Enhancement**: Structured/Manual Investigation separation + Figma MCP + Playwright MCP

## Execution Flow (main)
```
1. Load plan.md from feature directory
   → ✅ Extracted: TypeScript 4.9.5, React 18.2.0, Tailwind CSS 3.3.0, Module Federation, Figma MCP, Playwright
2. Load optional design documents:
   → ✅ data-model.md: 8 microservices, Figma integration, Playwright testing
   → ❌ contracts/: No contract files found (will be generated)
   → ✅ research.md: Figma MCP decisions, Playwright testing strategy
3. Generate tasks by category:
   → Setup: 8 microservices infrastructure, Figma/Playwright integration
   → Tests: Service isolation tests, E2E tests, visual regression tests
   → Core: Component migration, service implementation, design system
   → Integration: Event bus, WebSocket, cross-service communication
   → Polish: Performance optimization, documentation, CI/CD
4. Apply task rules:
   → Independent services = mark [P] for parallel
   → Shared dependencies = sequential
   → Tests before implementation (TDD)
5. Number tasks sequentially (T001-T070)
6. 8 microservices require enhanced dependency management
7. Create parallel execution examples for service development
8. Validate task completeness for microservices architecture
9. Return: SUCCESS (enhanced tasks ready for execution)
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different services/files, no dependencies)
- Include exact file paths in microservice structure

## Path Conventions (Enhanced Web Application)
```
olorin-front/
├── src/
│   ├── microservices/
│   │   ├── structured-investigation/    # Port 3001
│   │   ├── manual-investigation/        # Port 3002
│   │   ├── agent-analytics/            # Port 3003
│   │   ├── rag-intelligence/           # Port 3004
│   │   ├── visualization/              # Port 3005
│   │   ├── reporting/                  # Port 3006
│   │   ├── core-ui/                    # Port 3007
│   │   └── design-system/              # Port 3008
│   ├── shared/
│   │   ├── components/                 # Tailwind component library
│   │   ├── events/                     # Event bus implementation
│   │   ├── figma/                      # Figma MCP integration
│   │   └── testing/                    # Playwright utilities
└── tests/
    ├── playwright/                     # E2E and visual tests
    ├── contract/                       # Service contract tests
    ├── integration/                    # Cross-service tests
    └── unit/                           # Component unit tests
```

## Phase 3.1: Infrastructure Setup
- [ ] T001 Create enhanced project structure for 8 microservices per implementation plan
- [ ] T002 Install enhanced dependencies: Webpack 5 Module Federation, Tailwind CSS 3.3.0, Figma Plugin API, Playwright
- [ ] T003 [P] Configure TypeScript 4.9.5 with strict mode and path mapping for microservices
- [ ] T004 [P] Configure Tailwind CSS 3.3.0 with design tokens and component variants
- [ ] T005 [P] Configure ESLint and Prettier for TypeScript React microservices
- [ ] T006 Set up Webpack 5 Module Federation configuration for shell application in `webpack.config.js`
- [ ] T007 [P] Initialize Figma MCP integration in `src/shared/figma/figma-mcp.ts`
- [ ] T008 [P] Initialize Playwright MCP configuration in `playwright.config.ts`

## Phase 3.2: Event Bus and Shared Infrastructure
- [ ] T009 Create event bus implementation in `src/shared/events/eventBus.ts`
- [ ] T010 Create WebSocket manager in `src/shared/services/websocketManager.ts`
- [ ] T011 Create shared TypeScript interfaces in `src/shared/types/index.ts`
- [ ] T012 [P] Create shared React hooks in `src/shared/hooks/`
- [ ] T013 [P] Create shared utilities in `src/shared/utils/`

## Phase 3.3: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.4
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

### Service Isolation Tests [P]
- [ ] T014 [P] Structured Investigation service test in `tests/playwright/structured-investigation/service-isolation.spec.ts`
- [ ] T015 [P] Manual Investigation service test in `tests/playwright/manual-investigation/service-isolation.spec.ts`
- [ ] T016 [P] Agent Analytics service test in `tests/playwright/agent-analytics/service-isolation.spec.ts`
- [ ] T017 [P] RAG Intelligence service test in `tests/playwright/rag-intelligence/service-isolation.spec.ts`
- [ ] T018 [P] Visualization service test in `tests/playwright/visualization/service-isolation.spec.ts`
- [ ] T019 [P] Reporting service test in `tests/playwright/reporting/service-isolation.spec.ts`
- [ ] T020 [P] Core UI service test in `tests/playwright/core-ui/service-isolation.spec.ts`
- [ ] T021 [P] Design System service test in `tests/playwright/design-system/service-isolation.spec.ts`

### Cross-Service Integration Tests [P]
- [ ] T022 [P] Investigation handoff test (structured → manual) in `tests/playwright/cross-service/investigation-handoff.spec.ts`
- [ ] T023 [P] Event bus communication test in `tests/playwright/cross-service/event-bus.spec.ts`
- [ ] T024 [P] WebSocket real-time updates test in `tests/playwright/cross-service/websocket-updates.spec.ts`
- [ ] T025 [P] Design system propagation test in `tests/playwright/cross-service/design-system-sync.spec.ts`

### Visual Regression Tests [P]
- [ ] T026 [P] Component library visual test in `tests/playwright/visual-regression/component-library.spec.ts`
- [ ] T027 [P] Figma design consistency test in `tests/playwright/visual-regression/figma-consistency.spec.ts`
- [ ] T028 [P] Responsive design test in `tests/playwright/visual-regression/responsive-design.spec.ts`

## Phase 3.4: Design System Service (Foundation - Port 3008)
- [ ] T029 Create Design System service entry point in `src/microservices/design-system/App.tsx`
- [ ] T030 Create Figma token sync in `src/microservices/design-system/services/figmaSync.ts`
- [ ] T031 Create design token provider in `src/microservices/design-system/components/DesignTokenProvider.tsx`
- [ ] T032 Create component library manager in `src/microservices/design-system/services/componentLibrary.ts`
- [ ] T033 Create design validation service in `src/microservices/design-system/services/validation.ts`
- [ ] T034 Configure Design System webpack config in `src/microservices/design-system/webpack.config.js`

## Phase 3.5: Core UI Service (Foundation - Port 3007)
- [ ] T035 Create Core UI service entry point in `src/microservices/core-ui/App.tsx`
- [ ] T036 Create authentication provider in `src/microservices/core-ui/components/AuthProvider.tsx`
- [ ] T037 [P] Create navigation bar component in `src/microservices/core-ui/components/NavigationBar.tsx`
- [ ] T038 [P] Create protected route component in `src/microservices/core-ui/components/ProtectedRoute.tsx`
- [ ] T039 [P] Create notification system in `src/microservices/core-ui/components/NotificationSystem.tsx`
- [ ] T040 Configure Core UI webpack config in `src/microservices/core-ui/webpack.config.js`

## Phase 3.6: Tailwind Component Library
- [ ] T041 [P] Create Button component with Tailwind in `src/shared/components/base/Button.tsx`
- [ ] T042 [P] Create Input component with Tailwind in `src/shared/components/forms/Input.tsx`
- [ ] T043 [P] Create Card component with Tailwind in `src/shared/components/layout/Card.tsx`
- [ ] T044 [P] Create Modal component with Tailwind in `src/shared/components/feedback/Modal.tsx`
- [ ] T045 [P] Create Table component with Tailwind in `src/shared/components/data/Table.tsx`
- [ ] T046 [P] Create Loading component with Tailwind in `src/shared/components/feedback/Loading.tsx`

## Phase 3.7: Investigation Services (Core Features)

### Structured Investigation Service (Port 3001)
- [ ] T047 Create Structured Investigation service entry point in `src/microservices/structured-investigation/App.tsx`
- [ ] T048 Create AI orchestration manager in `src/microservices/structured-investigation/services/orchestrationManager.ts`
- [ ] T049 Create structured investigation panel in `src/microservices/structured-investigation/components/StructuredInvestigationPanel.tsx`
- [ ] T050 Create risk calculation engine in `src/microservices/structured-investigation/services/riskCalculation.ts`
- [ ] T051 Configure Structured Investigation webpack config in `src/microservices/structured-investigation/webpack.config.js`

### Manual Investigation Service (Port 3002)
- [ ] T052 Create Manual Investigation service entry point in `src/microservices/manual-investigation/App.tsx`
- [ ] T053 Create investigation workflow manager in `src/microservices/manual-investigation/services/workflowManager.ts`
- [ ] T054 [P] Create manual investigation panel in `src/microservices/manual-investigation/components/ManualInvestigationPanel.tsx`
- [ ] T055 [P] Create collaboration tools in `src/microservices/manual-investigation/components/CollaborationTools.tsx`
- [ ] T056 Configure Manual Investigation webpack config in `src/microservices/manual-investigation/webpack.config.js`

## Phase 3.8: Supporting Services [P]

### Agent Analytics Service (Port 3003)
- [ ] T057 [P] Create Agent Analytics service entry point in `src/microservices/agent-analytics/App.tsx`
- [ ] T058 [P] Migrate AgentDetailsTable component to `src/microservices/agent-analytics/components/AgentDetailsTable.tsx`
- [ ] T059 [P] Create agent performance dashboard in `src/microservices/agent-analytics/components/PerformanceDashboard.tsx`

### RAG Intelligence Service (Port 3004)
- [ ] T060 [P] Create RAG Intelligence service entry point in `src/microservices/rag-intelligence/App.tsx`
- [ ] T061 [P] Migrate RAG components to `src/microservices/rag-intelligence/components/`
- [ ] T062 [P] Create RAG analytics dashboard in `src/microservices/rag-intelligence/components/AnalyticsDashboard.tsx`

### Visualization Service (Port 3005)
- [ ] T063 [P] Create Visualization service entry point in `src/microservices/visualization/App.tsx`
- [ ] T064 [P] Create interactive investigation graph in `src/microservices/visualization/components/InteractiveGraph.tsx`
- [ ] T065 [P] Create location map component in `src/microservices/visualization/components/LocationMap.tsx`

### Reporting Service (Port 3006)
- [ ] T066 [P] Create Reporting service entry point in `src/microservices/reporting/App.tsx`
- [ ] T067 [P] Create report builder in `src/microservices/reporting/components/ReportBuilder.tsx`
- [ ] T068 [P] Create export controls in `src/microservices/reporting/components/ExportControls.tsx`

## Phase 3.9: Integration and Communication
- [ ] T069 Implement cross-service investigation handoff between structured and manual services
- [ ] T070 Set up event bus integration across all 8 microservices
- [ ] T071 Configure WebSocket integration for real-time updates
- [ ] T072 Implement service health monitoring and recovery
- [ ] T073 Create shell application routing in `src/App.tsx`

## Phase 3.10: File Size Compliance
- [ ] T074 [P] Split RAGPage.tsx (2,273 lines) into compliant modules under 200 lines
- [ ] T075 [P] Split InvestigationPage.tsx (1,913 lines) into investigation service components
- [ ] T076 [P] Split AgentDetailsTable.tsx (994 lines) into agent analytics service components
- [ ] T077 [P] Verify all remaining files are under 200 lines and refactor if needed

## Phase 3.11: Performance and Polish
- [ ] T078 [P] Implement code splitting and lazy loading for all 8 microservices
- [ ] T079 [P] Configure service worker for caching and offline capability
- [ ] T080 [P] Set up bundle analysis and size monitoring
- [ ] T081 Run Lighthouse performance audit and optimize to meet <3s load time requirement
- [ ] T082 [P] Implement comprehensive error boundaries for all services
- [ ] T083 [P] Set up monitoring and logging for microservices health

## Phase 3.12: Testing and Validation
- [ ] T084 [P] Run all Playwright E2E tests and ensure 100% pass rate
- [ ] T085 [P] Run visual regression tests against Figma designs
- [ ] T086 [P] Validate Material-UI removal (0 @mui imports remaining)
- [ ] T087 [P] Validate bundle size reduction (target: 40% reduction)
- [ ] T088 [P] Run performance benchmarks (target: 60fps scrolling)

## Dependencies
```
Infrastructure (T001-T013) → Tests (T014-T028) → Core Services (T029-T073) → Polish (T074-T088)

Critical Path:
T006 (Module Federation) → All service webpack configs
T009 (Event Bus) → T070 (Cross-service integration)
T029-T034 (Design System) → T041-T046 (Component Library)
T035-T040 (Core UI) → T073 (Shell routing)
```

## Parallel Execution Examples

### Setup Phase (can run together)
```bash
# Infrastructure tasks (T003-T005, T007-T008)
Task: "Configure TypeScript 4.9.5 with strict mode for microservices"
Task: "Configure Tailwind CSS 3.3.0 with design tokens"
Task: "Configure ESLint and Prettier for TypeScript React"
Task: "Initialize Figma MCP integration"
Task: "Initialize Playwright MCP configuration"
```

### Service Isolation Tests (T014-T021)
```bash
# All service tests can run in parallel
Task: "Structured Investigation service test"
Task: "Manual Investigation service test"
Task: "Agent Analytics service test"
Task: "RAG Intelligence service test"
Task: "Visualization service test"
Task: "Reporting service test"
Task: "Core UI service test"
Task: "Design System service test"
```

### Supporting Services (T057-T068)
```bash
# Independent services can be developed in parallel
Task: "Create Agent Analytics service entry point"
Task: "Create RAG Intelligence service entry point"
Task: "Create Visualization service entry point"
Task: "Create Reporting service entry point"
```

### Component Library (T041-T046)
```bash
# Independent components
Task: "Create Button component with Tailwind"
Task: "Create Input component with Tailwind"
Task: "Create Card component with Tailwind"
Task: "Create Modal component with Tailwind"
```

## Notes
- **[P] tasks**: Different services/files, can run in parallel
- **Sequential tasks**: Same service or shared dependencies
- **File size compliance**: All .tsx/.ts files must be under 200 lines
- **Zero tolerance**: No Material-UI imports allowed after migration
- **Figma sync**: Design changes should auto-propagate to components
- **Playwright**: E2E tests must cover cross-service communication

## Enhanced Validation Checklist
*GATE: Checked before task completion*

### Architecture Compliance
- [ ] All 8 microservices are independently deployable
- [ ] Module Federation correctly configured for runtime composition
- [ ] Event bus handles all cross-service communication
- [ ] WebSocket integration works across all services

### Design System Integration
- [ ] Figma MCP successfully syncs design tokens
- [ ] All components generated from Figma designs
- [ ] Visual regression tests pass at 98% similarity
- [ ] Design consistency maintained across services

### Testing Coverage
- [ ] All microservices have isolation tests
- [ ] Cross-service integration fully tested
- [ ] Playwright E2E tests cover user journeys
- [ ] Visual regression catches design drift

### Performance Requirements
- [ ] Bundle size reduced by 40% (Module Federation + code splitting)
- [ ] Page load time under 3 seconds on 3G
- [ ] 60fps scrolling performance maintained
- [ ] All files under 200 lines

### Migration Completeness
- [ ] Zero Material-UI imports remain (@mui/*)
- [ ] Zero styled-components usage
- [ ] All components use Tailwind CSS exclusively
- [ ] All existing functionality preserved or enhanced

## Success Metrics
- ✅ **8 microservices** running independently
- ✅ **0 Material-UI imports** remaining
- ✅ **100% files under 200 lines**
- ✅ **Figma design sync** automated
- ✅ **Playwright testing** comprehensive
- ✅ **40% bundle reduction** achieved
- ✅ **<3s page load time** on 3G networks
- ✅ **All functionality preserved** or enhanced