# Implementation Plan: New Olorin Frontend - GAIA Look & Feel Migration

**Branch**: `004-new-olorin-frontend` | **Date**: 2025-10-14 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/004-new-olorin-frontend/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   ✓ Loaded: 20 functional requirements, 11 entities, 6 user scenarios
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   ✓ Detect Project Type: Web application (frontend React + backend FastAPI)
   ✓ Set Structure Decision: Option 2 (frontend/ + backend/ separation)
3. Fill the Constitution Check section based on constitution document
   ✓ Constitution template found (needs project-specific adaptation)
4. Evaluate Constitution Check section
   → No violations (pure UI migration, no new complexity)
   ✓ Update Progress Tracking: Initial Constitution Check PASS
5. Execute Phase 0 → research.md
   → All technologies known (React 18, TypeScript 4.9.5, Tailwind CSS 3.3.0)
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, CLAUDE.md
7. Re-evaluate Constitution Check section
   → Post-Design Constitution Check (pending Phase 1 completion)
8. Plan Phase 2 → Describe task generation approach
9. STOP - Ready for /tasks command
```

## Summary
Migrate the Olorin frontend to adopt the GAIA web plugin's corporate design system, wizard-based investigation flow, and Tailwind CSS component patterns. This UI/UX migration transforms the investigation interface from Material-UI to a professional, enterprise-grade dark theme with orange/cyan accents, implementing a 3-step wizard (Settings → Progress → Results) with collapsible panels, interactive components, and real-time monitoring capabilities. The migration aligns with the ongoing frontend refactoring to microservices architecture and pure Tailwind CSS styling.

## Technical Context
**Language/Version**: TypeScript 4.9.5, React 18.2.0, Node.js >=18.0.0
**Primary Dependencies**:
- UI Framework: React 18.2.0, React Router DOM 6.11.0
- Styling: Tailwind CSS 3.3.0, @headlessui/react 2.2.8, @heroicons/react 2.0.18
- State Management: Zustand 5.0.8, @tanstack/react-query 5.89.0
- Real-time: socket.io-client 4.8.1, mitt 3.0.1 (event bus)
- Visualization: recharts 3.2.1, d3 7.9.0, react-flow-renderer 10.3.17
- Forms: React Hook Form (via @headlessui/react patterns)
- Testing: Jest 27.5.2, @testing-library/react 13.4.0, Playwright 1.55.0

**Storage**:
- Frontend state: Zustand stores + React Query cache
- Session persistence: Local Storage (investigation wizard state)
- Backend API: FastAPI (olorin-server) - existing REST + WebSocket endpoints

**Testing**:
- Unit: Jest + React Testing Library
- Integration: Jest integration config (src/shared/testing/integration/)
- E2E: Playwright (visual regression, accessibility, cross-browser)
- Visual: Playwright visual regression tests
- Performance: Lighthouse audits, bundle analysis

**Target Platform**:
- Browser: Chrome, Firefox, Safari (last 2 versions)
- Responsive: Desktop (lg+), Tablet (md), Mobile (sm)
- Build: Webpack 5.101.3 with Module Federation
- Deployment: Firebase Hosting

**Project Type**: Web application (frontend + backend separation)

**Performance Goals**:
- First Contentful Paint (FCP): <1.5s
- Largest Contentful Paint (LCP): <2.5s
- Time to Interactive (TTI): <3.5s
- Bundle size: <512KB per microservice
- 60 FPS animations and transitions
- Real-time updates: <100ms latency

**Constraints**:
- File size: ALL files <200 lines (CRITICAL - 19 files currently violate)
- No Material-UI: Pure Tailwind CSS only (ZERO @mui imports allowed)
- Microservices architecture: 10 independent services with Module Federation
- Configuration-driven: NO hardcoded values (colors, URLs, features must be configurable)
- Schema-locked: NO database migrations allowed
- Backward compatibility: Must work with existing FastAPI backend endpoints

**Scale/Scope**:
- Components: ~50-60 Tailwind components (migrate from GAIA)
- Pages: 3 wizard pages + multi-entity views
- Microservices: Investigation service primarily, integration with 9 other services
- Routes: ~10 routes (wizard flow, multi-entity drill-down)
- State stores: 5-6 Zustand stores (investigation settings, wizard state, UI state)
- API integration: 15-20 REST endpoints, 4 WebSocket event types
- Design tokens: Corporate color palette (8 color scales), typography system, animation library

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**The project constitution has not been defined yet** (template exists at `.specify/memory/constitution.md`).

For this implementation plan, we apply general software engineering principles:

### UI/UX Migration Principles
- [x] **Design System Consistency**: Adopt GAIA's corporate design system completely
  - Corporate color palette with dark theme (#0B1221 backgrounds, #FF6600 orange accent, #06B6D4 cyan accent)
  - Typography hierarchy and spacing patterns from GAIA
  - Component interaction states (hover, active, disabled) matching GAIA

- [x] **Component Modularity**: ALL components <200 lines, single responsibility
  - Break down large GAIA components into focused, reusable modules
  - Extract common patterns into shared component library
  - Maintain clear separation between presentation and logic

- [x] **Configuration-Driven UI**: NO hardcoded values
  - Colors from Tailwind config (no inline hex colors)
  - Features controlled by environment variables
  - API URLs and WebSocket endpoints from configuration
  - Pagination sizes, timeouts, thresholds all configurable

- [x] **Accessibility First**: WCAG 2.1 AA compliance
  - Semantic HTML and ARIA attributes
  - Keyboard navigation support
  - Screen reader compatibility
  - Color contrast requirements (4.5:1 minimum)

- [x] **Performance Budget**: Maintain fast load times
  - Code splitting by microservice
  - Lazy loading for non-critical components
  - Optimized bundle sizes (<512KB per service)
  - Efficient re-renders with React memo patterns

### Initial Constitution Check: PASS ✓
- No new infrastructure complexity (uses existing microservices architecture)
- No database schema changes (frontend-only migration)
- No new external dependencies beyond Tailwind ecosystem
- Aligns with ongoing refactoring to remove Material-UI

## Project Structure

### Documentation (this feature)
```
specs/004-new-olorin-frontend/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
│   ├── investigation-wizard.openapi.yaml   # Wizard API contract
│   ├── settings-api.contract.ts            # Settings API TypeScript contract
│   ├── progress-api.contract.ts            # Progress API TypeScript contract
│   └── results-api.contract.ts             # Results API TypeScript contract
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
# Option 2: Web application (frontend + backend)
olorin-front/
├── src/
│   ├── microservices/
│   │   ├── investigation/                    # Primary focus for this feature
│   │   │   ├── pages/
│   │   │   │   ├── InvestigationWizardShell.tsx     # NEW: Wizard container
│   │   │   │   ├── SettingsPage.tsx                  # NEW: Step 1 - Settings
│   │   │   │   ├── ProgressPage.tsx                  # NEW: Step 2 - Progress
│   │   │   │   ├── ResultsPage.tsx                   # NEW: Step 3 - Results
│   │   │   │   └── MultiEntityView.tsx               # NEW: Multi-entity correlation
│   │   │   ├── components/
│   │   │   │   ├── wizard/
│   │   │   │   │   ├── WizardProgressIndicator.tsx   # NEW: Step indicator
│   │   │   │   │   ├── settings/
│   │   │   │   │   │   ├── EntitySelectionPanel.tsx  # NEW: Entity configuration
│   │   │   │   │   │   ├── TimeRangeSelector.tsx     # NEW: Time range picker
│   │   │   │   │   │   ├── ToolsAgentMatrix.tsx      # NEW: Tool selection matrix
│   │   │   │   │   │   ├── AdvancedOptions.tsx       # NEW: Advanced settings
│   │   │   │   │   │   └── ValidationDisplay.tsx     # NEW: Validation feedback
│   │   │   │   │   ├── progress/
│   │   │   │   │   │   ├── LiveLogStream.tsx         # NEW: Real-time logs
│   │   │   │   │   │   ├── ProgressTimeline.tsx      # NEW: Execution timeline
│   │   │   │   │   │   └── ToolExecutionCard.tsx     # NEW: Tool status card
│   │   │   │   │   └── results/
│   │   │   │   │       ├── RiskGauge.tsx              # NEW: Risk visualization
│   │   │   │   │       ├── CorrelationMatrix.tsx     # NEW: Entity correlations
│   │   │   │   │       └── FindingsCard.tsx           # NEW: Result cards
│   │   │   ├── hooks/
│   │   │   │   ├── useWizardNavigation.ts            # NEW: Wizard routing
│   │   │   │   ├── useWizardValidation.ts            # NEW: Settings validation
│   │   │   │   └── useInvestigationState.ts          # NEW: State management
│   │   │   ├── stores/
│   │   │   │   └── investigationWizardStore.ts       # NEW: Zustand store
│   │   │   └── types/
│   │   │       └── wizard.types.ts                   # NEW: TypeScript types
│   │   └── [other microservices...]
│   ├── shared/
│   │   ├── components/
│   │   │   └── ui/                                   # Shared UI components from GAIA
│   │   │       ├── Button.tsx                        # NEW: Tailwind button
│   │   │       ├── Card.tsx                          # NEW: Tailwind card
│   │   │       ├── CollapsiblePanel.tsx              # NEW: Collapsible container
│   │   │       ├── Input.tsx                         # NEW: Form input
│   │   │       ├── Select.tsx                        # NEW: Form select
│   │   │       ├── Toggle.tsx                        # NEW: Toggle switch
│   │   │       ├── Slider.tsx                        # NEW: Range slider
│   │   │       ├── Modal.tsx                         # NEW: Modal dialog
│   │   │       └── Notification.tsx                  # NEW: Toast notification
│   │   ├── styles/
│   │   │   └── gaia-palette.ts                       # NEW: GAIA color system
│   │   ├── hooks/
│   │   │   └── useNotifications.ts                   # NEW: Notification system
│   │   └── utils/
│   │       └── validation.ts                         # NEW: Validation utilities
│   └── config/
│       └── gaia-theme.ts                             # NEW: GAIA theme config
├── tailwind.config.js                                # UPDATE: Add GAIA colors
└── tests/
    ├── unit/
    │   └── components/                               # NEW: Component tests
    ├── integration/
    │   └── wizard-flow.test.tsx                      # NEW: Wizard flow tests
    └── e2e/
        └── investigation-wizard.e2e.ts               # NEW: E2E wizard tests

olorin-server/
└── [existing FastAPI backend - NO changes required]
```

**Structure Decision**: Option 2 (Web application) - Frontend + Backend separation with focus on olorin-front

## Phase 0: Outline & Research

### Unknowns Analysis
All technologies and patterns are known from GAIA reference implementation:
- ✓ React 18.2.0 with TypeScript 4.9.5
- ✓ Tailwind CSS 3.3.0 with custom configuration
- ✓ @headlessui/react 2.2.8 for accessible components
- ✓ Zustand 5.0.8 for state management
- ✓ React Router DOM 6.11.0 for wizard navigation
- ✓ socket.io-client 4.8.1 for real-time updates

### Research Tasks Completed
1. **GAIA Design System Analysis** ✓
   - Decision: Adopt GAIA corporate color palette exactly as defined
   - Rationale: Proven enterprise-grade design with professional dark theme
   - Source: `/Users/gklainert/Documents/Gaia/gaia-webplugin/src/js/styles/colorPalette.ts`
   - Implementation: Extend Olorin's tailwind.config.js with GAIA corporate colors

2. **Wizard Flow Pattern** ✓
   - Decision: 3-step wizard with progress indicator and back navigation
   - Rationale: Standard investigation workflow proven in GAIA
   - Source: `/Users/gklainert/Documents/Gaia/gaia-webplugin/src/js/components/wizard/InvestigationWizardShell.tsx`
   - Implementation: React Router routes + Zustand state machine

3. **Component Architecture** ✓
   - Decision: Modular components <200 lines each, shared UI library
   - Rationale: Maintainability, file size compliance, reusability
   - Source: `/Users/gklainert/Documents/Gaia/gaia-webplugin/src/js/components/ui/`
   - Implementation: shared/components/ui/ with Headless UI + Tailwind

4. **State Management Pattern** ✓
   - Decision: Zustand for wizard state + React Query for server state
   - Rationale: Lightweight, TypeScript-friendly, already in Olorin
   - Source: GAIA uses context + reducers, Olorin uses Zustand (keep Olorin pattern)
   - Implementation: investigationWizardStore with persist middleware

5. **Real-time Updates** ✓
   - Decision: socket.io-client with event-driven architecture
   - Rationale: Already integrated in Olorin backend, proven reliable
   - Source: Existing Olorin WebSocket infrastructure
   - Implementation: Subscribe to investigation progress events in Progress page

6. **Validation Strategy** ✓
   - Decision: Real-time validation with visual feedback
   - Rationale: Immediate user feedback prevents submission errors
   - Source: `/Users/gklainert/Documents/Gaia/gaia-webplugin/src/js/utils/wizardValidation.ts`
   - Implementation: Zod schemas + useForm hook with inline error display

**Output**: [research.md](./research.md) - All decisions documented with alternatives considered

## Phase 1: Design & Contracts
*Prerequisites: research.md complete ✓*

### 1. Data Model Extraction ✓
**Output**: [data-model.md](./data-model.md)

Entities extracted from feature spec with TypeScript interfaces:
- Investigation: Wizard state container with settings, progress, results
- InvestigationSettings: Entity selection, time range, tool matrix, validation
- Entity: Investigation target with type, value, metadata
- TimeRange: Start/end dates with predefined presets
- ToolSelection: Tool-agent matrix with weights
- InvestigationTemplate: Saved configurations
- ToolExecution: Real-time tool execution state
- AgentResult: AI agent analysis outputs
- RiskAssessment: Overall risk scoring
- Notification: User notification system

### 2. API Contracts Generation ✓
**Output**: contracts/ directory

Functional requirements → API endpoints:

**Settings API** (`contracts/settings-api.contract.ts`):
```typescript
// FR-005, FR-006, FR-007, FR-008, FR-009, FR-010
POST /api/investigations/execute        // Start investigation
GET  /api/investigations/:id/settings   // Load saved settings
POST /api/investigations/:id/validate   // Validate settings
GET  /api/templates                     // List templates
POST /api/templates                     // Save template
DELETE /api/templates/:id               // Delete template
```

**Progress API** (`contracts/progress-api.contract.ts`):
```typescript
// FR-011, FR-012
GET  /api/investigations/:id/progress   // Get current progress
WebSocket: /ws/investigations/:id       // Real-time progress events
  - TOOL_EXECUTION: Tool started/completed/failed
  - AGENT_RESULTS: Agent analysis available
  - INVESTIGATION_PROGRESS: Overall progress update
  - INVESTIGATION_COMPLETE: Investigation finished
```

**Results API** (`contracts/results-api.contract.ts`):
```typescript
// FR-013, FR-014
GET  /api/investigations/:id/results    // Get investigation results
GET  /api/investigations/:id/risk       // Get risk assessment
POST /api/investigations/:id/export     // Export results (PDF/JSON/CSV)
```

**State Persistence API** (`contracts/persistence-api.contract.ts`):
```typescript
// FR-020
GET  /api/investigations/:id/state      // Restore wizard state
PUT  /api/investigations/:id/state      // Save wizard state
DELETE /api/investigations/:id/state    // Clear wizard state
```

### 3. Contract Tests Generation ✓
Tests must fail initially (no implementation yet):

```typescript
// tests/integration/settings-api.contract.test.ts
describe('Settings API Contract', () => {
  it('POST /api/investigations/execute - should start investigation', async () => {
    const response = await api.post('/api/investigations/execute', validSettings);
    expect(response.status).toBe(200);
    expect(response.data).toMatchSchema(InvestigationResponseSchema);
  });

  it('POST /api/investigations/:id/validate - should validate settings', async () => {
    const response = await api.post(`/api/investigations/${id}/validate`, settings);
    expect(response.status).toBe(200);
    expect(response.data).toMatchSchema(ValidationResponseSchema);
  });
});

// tests/integration/wizard-flow.contract.test.ts
describe('Wizard Flow Contract', () => {
  it('should complete full wizard flow: Settings → Progress → Results', async () => {
    // Step 1: Navigate to settings
    // Step 2: Configure and start investigation
    // Step 3: Monitor progress with WebSocket
    // Step 4: View results
    // Each step validates API responses match contracts
  });
});
```

### 4. Test Scenarios from User Stories ✓
Integration tests extracted from acceptance scenarios:

**Scenario 1: Visual Design Consistency** → Visual regression tests
```typescript
// tests/e2e/visual-consistency.e2e.ts
test('should match GAIA corporate color palette', async ({ page }) => {
  await page.goto('/investigation/settings');
  await expect(page).toHaveScreenshot('settings-page.png');
});
```

**Scenario 2: Investigation Wizard Flow** → Navigation tests
```typescript
// tests/integration/wizard-navigation.test.tsx
test('should allow navigation to completed steps only', () => {
  // Verify step 1 active, steps 2-3 disabled
  // Complete step 1, verify step 2 enabled
  // Navigate back to step 1 works
});
```

**Scenario 3-5: Page-specific functionality** → Component integration tests
```typescript
// tests/integration/settings-page.test.tsx
// tests/integration/progress-page.test.tsx
// tests/integration/results-page.test.tsx
```

**Scenario 6: Component Interaction Patterns** → Unit + E2E tests
```typescript
// tests/unit/components/Button.test.tsx
// tests/e2e/accessibility.e2e.ts (keyboard navigation, focus states)
```

### 5. Update Agent Context ✓
Run `.specify/scripts/bash/update-agent-context.sh claude` to update CLAUDE.md:
- Add GAIA design system adoption to tech stack
- Document wizard flow pattern
- Note file size compliance requirement (<200 lines)
- Reference GAIA web plugin as design source

**Output**:
- data-model.md with TypeScript interfaces
- contracts/*.contract.ts with API definitions
- tests/integration/*.contract.test.ts (failing tests)
- tests/integration/*.test.tsx (user story tests)
- quickstart.md with wizard flow walkthrough
- CLAUDE.md updated with GAIA context

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
1. Load `.specify/templates/tasks-template.md` as base structure
2. Generate tasks from Phase 1 design docs (contracts, data model, quickstart)
3. Map contracts → contract test tasks [P]
4. Map entities → TypeScript interface + Zod schema tasks [P]
5. Map user stories → integration test scenarios
6. Map components → implementation tasks (grouped by page/section)
7. Map validation requirements → validation utility tasks

**Ordering Strategy**:
1. **Foundation Layer** (parallel execution):
   - [P] Task 1-3: Extend Tailwind config with GAIA corporate colors
   - [P] Task 4-6: Create TypeScript type definitions (data-model.md)
   - [P] Task 7-9: Create Zod validation schemas

2. **Shared Component Layer** (parallel after foundation):
   - [P] Task 10-18: Build shared UI components (Button, Card, Input, etc.)
   - Each component <200 lines with Tailwind + Headless UI

3. **Contract Test Layer** (parallel after shared components):
   - [P] Task 19-22: Write API contract tests (must fail)

4. **Wizard Infrastructure** (sequential):
   - Task 23: Create investigationWizardStore (Zustand)
   - Task 24: Implement useWizardNavigation hook
   - Task 25: Implement useWizardValidation hook
   - Task 26: Create WizardProgressIndicator component

5. **Page Implementation Layer** (sequential, dependent on wizard infrastructure):
   - Task 27-32: Settings Page + components (EntitySelectionPanel, TimeRangeSelector, etc.)
   - Task 33-38: Progress Page + components (LiveLogStream, ProgressTimeline, etc.)
   - Task 39-44: Results Page + components (RiskGauge, CorrelationMatrix, etc.)
   - Task 45: MultiEntityView component

6. **Wizard Container** (depends on all pages):
   - Task 46: InvestigationWizardShell (router + layout)

7. **Integration Test Layer** (parallel after implementation):
   - [P] Task 47-50: User story integration tests

8. **Visual Regression Tests** (parallel):
   - [P] Task 51-53: Playwright visual tests

9. **Refinement** (sequential):
   - Task 54: Real-time WebSocket integration
   - Task 55: Template management (save/load)
   - Task 56: State persistence (local storage)
   - Task 57: Notification system integration

10. **Polish** (parallel):
    - [P] Task 58: Responsive layout testing
    - [P] Task 59: Accessibility audit (WCAG 2.1 AA)
    - [P] Task 60: Performance optimization (bundle size, lazy loading)

**Estimated Output**: 60 numbered, ordered tasks in tasks.md

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)
**Phase 4**: Implementation (execute tasks.md following constitutional principles)
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking
*No violations - pure UI migration using existing infrastructure*

This implementation adds NO new infrastructure complexity:
- Uses existing microservices architecture
- Uses existing Zustand + React Query patterns
- Uses existing WebSocket infrastructure
- Uses existing API endpoints (no backend changes)
- Replaces Material-UI with Tailwind CSS (simplification, not addition)

## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning approach documented (/plan command)
- [x] Phase 3: Tasks generated (/tasks command) - 60 tasks created
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS (Phase 1 artifacts complete)
- [x] All NEEDS CLARIFICATION resolved (none - all tech known)
- [x] Complexity deviations documented (none - no violations)

**Phase 1 Artifacts Created**:
- [x] research.md - All technology decisions documented
- [x] data-model.md - 11 entities with TypeScript interfaces + Zod schemas
- [x] contracts/settings-api.contract.ts - Settings API contract
- [x] contracts/progress-api.contract.ts - Progress API + WebSocket events contract
- [x] contracts/results-api.contract.ts - Results API contract
- [x] quickstart.md - Step-by-step implementation guide
- [x] CLAUDE.md updated - GAIA design system context added

**Phase 3 Artifacts Created**:
- [x] tasks.md - 60 numbered tasks with dependencies, parallel execution markers, and file size compliance

---
*Based on Olorin project patterns and GAIA web plugin reference implementation*
*Constitution template available at `/Users/gklainert/Documents/olorin/.specify/memory/constitution.md`*
