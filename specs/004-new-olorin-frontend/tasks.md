# Tasks: New Olorin Frontend - GAIA Look & Feel Migration

**Input**: Design documents from `/specs/004-new-olorin-frontend/`
**Prerequisites**: plan.md, research.md, data-model.md, contracts/, quickstart.md

## Execution Flow

This tasks file was generated from Phase 1 design artifacts:
- **data-model.md**: 11 entities with TypeScript interfaces + Zod schemas
- **contracts/settings-api.contract.ts**: Settings API endpoints (6 endpoints)
- **contracts/progress-api.contract.ts**: Progress API + WebSocket events (6 event types)
- **contracts/results-api.contract.ts**: Results API endpoints (12 endpoints)
- **quickstart.md**: Step-by-step implementation guide with component examples

## Path Conventions

**Project Structure**: Web application (frontend + backend separation)
- Frontend: `olorin-front/src/`
- Shared components: `olorin-front/src/shared/`
- Investigation microservice: `olorin-front/src/microservices/investigation/`
- Tests: `olorin-front/tests/`

## Phase 3.1: Foundation Layer [P]
**CRITICAL: These tasks build the foundation - all [P] can run in parallel**

- [ ] T001 [P] Extend Tailwind config with GAIA corporate colors in `olorin-front/tailwind.config.js`
  - Add corporate.* color palette (bgPrimary, accentPrimary, etc.)
  - Add risk level colors (critical, high, medium, low)
  - Reference: CLAUDE.md GAIA design system section

- [ ] T002 [P] Create TypeScript type definitions from data-model.md in `src/shared/types/wizard.types.ts`
  - Export all 11 TypeScript interfaces (Investigation, Entity, TimeRange, etc.)
  - Export all enums (InvestigationStatus, WizardStep, EntityType, etc.)
  - Must be <200 lines (split if needed into wizard.types.ts + entities.types.ts)

- [ ] T003 [P] Create Zod validation schemas from data-model.md in `src/shared/types/wizard.schemas.ts`
  - Export all 11 Zod schemas (InvestigationSchema, EntitySchema, etc.)
  - Include validation refinements from data-model.md
  - Must be <200 lines (split if needed)

- [ ] T004 [P] Create validation utilities from data-model.md in `src/shared/utils/validation.ts`
  - Implement validateInvestigationSettings helper
  - Implement validateEntityValue helper
  - Implement type guards (isInvestigation, isInvestigationSettings, etc.)
  - Must be <200 lines

- [ ] T005 [P] Create configuration loader in `src/shared/config/wizard.config.ts`
  - Implement loadDataModelConfig() with Zod validation
  - Read from REACT_APP_* environment variables
  - Fail fast on missing/invalid config
  - Reference: data-model.md configuration integration section

- [ ] T006 [P] Add GAIA color palette constants in `src/shared/styles/gaia-palette.ts`
  - Export corporate color object
  - Export risk color mappings
  - Export status color mappings
  - Must be <200 lines

- [ ] T007 [P] Create configuration schema validation in `src/shared/config/config.schema.ts`
  - Define ConfigSchema with Zod for all REACT_APP_* variables
  - Include API URLs, feature flags, UI config, data model limits
  - Reference: CLAUDE.md environment variables section

- [ ] T008 [P] Update environment variables in `olorin-front/.env.example`
  - Add all REACT_APP_* variables from CLAUDE.md
  - Add investigation wizard config variables
  - Add comments explaining each variable
  - NO actual secrets (placeholders only)

- [ ] T009 [P] Update TypeScript config in `olorin-front/tsconfig.json`
  - Add path aliases for @shared, @microservices, @contracts
  - Enable strict mode settings
  - Configure for React 18 types

## Phase 3.2: Shared Component Layer [P]
**CRITICAL: Depends on Phase 3.1 completion. All [P] can run in parallel**

- [ ] T010 [P] Create WizardButton component in `src/shared/components/wizard/WizardButton.tsx`
  - Implement primary, secondary, outline variants
  - Use GAIA corporate colors
  - Implement all 5 interaction states (default, hover, active, disabled, loading)
  - Must be <200 lines
  - Reference: quickstart.md Step 2

- [ ] T011 [P] Create WizardCard component in `src/shared/components/wizard/WizardCard.tsx`
  - Implement panel container with GAIA styling
  - Support optional header, body, footer slots
  - Use corporate background colors
  - Must be <200 lines

- [ ] T012 [P] Create CollapsiblePanel component in `src/shared/components/wizard/CollapsiblePanel.tsx`
  - Implement expand/collapse with animation
  - Use GAIA panel pattern (reference: CLAUDE.md collapsible panel pattern)
  - Support chevron icon rotation
  - Must be <200 lines

- [ ] T013 [P] Create WizardInput component in `src/shared/components/wizard/WizardInput.tsx`
  - Implement text input with GAIA styling
  - Support validation states (valid, invalid, pending)
  - Show inline error messages
  - Must be <200 lines

- [ ] T014 [P] Create WizardSelect component in `src/shared/components/wizard/WizardSelect.tsx`
  - Use Headless UI Listbox + Tailwind CSS
  - GAIA corporate colors
  - Support search/filter for large lists
  - Must be <200 lines

- [ ] T015 [P] Create WizardToggle component in `src/shared/components/wizard/WizardToggle.tsx`
  - Use Headless UI Switch
  - GAIA accent colors (orange for enabled)
  - Animated toggle transition
  - Must be <200 lines

- [ ] T016 [P] Create WizardSlider component in `src/shared/components/wizard/WizardSlider.tsx`
  - Implement range slider with GAIA styling
  - Show current value label
  - Support min/max/step props
  - Must be <200 lines

- [ ] T017 [P] Create WizardModal component in `src/shared/components/wizard/WizardModal.tsx`
  - Use Headless UI Dialog
  - GAIA overlay and panel styling
  - Support title, body, actions
  - Must be <200 lines

- [ ] T018 [P] Create WizardNotification component in `src/shared/components/wizard/WizardNotification.tsx`
  - Implement success, error, warning, info variants
  - GAIA notification styles (reference: CLAUDE.md notification system)
  - Support dismissible and auto-dismiss
  - Include action button support
  - Must be <200 lines

## Phase 3.3: Contract Test Layer [P]
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

- [ ] T019 [P] Contract test Settings API in `tests/integration/contracts/settings-api.contract.test.ts`
  - Test POST /api/investigations/execute (start investigation)
  - Test POST /api/investigations/:id/validate (validate settings)
  - Test GET /api/templates (list templates)
  - Test POST /api/templates (save template)
  - Validate responses match Zod schemas from contracts/settings-api.contract.ts
  - Must be <200 lines

- [ ] T020 [P] Contract test Progress API in `tests/integration/contracts/progress-api.contract.test.ts`
  - Test GET /api/investigations/:id/progress (get progress)
  - Test WebSocket connection and event handling
  - Test progress_update, tool_execution_started, tool_execution_completed events
  - Validate event payloads match Zod schemas from contracts/progress-api.contract.ts
  - Must be <200 lines

- [ ] T021 [P] Contract test Results API in `tests/integration/contracts/results-api.contract.test.ts`
  - Test GET /api/investigations/:id/results (get results)
  - Test POST /api/investigations/:id/export (export results)
  - Test GET /api/investigations (list investigations)
  - Validate responses match Zod schemas from contracts/results-api.contract.ts
  - Must be <200 lines

- [ ] T022 [P] Integration test wizard navigation flow in `tests/integration/wizard-navigation.test.tsx`
  - Test step progression: Settings → Progress → Results
  - Test backward navigation (Settings ← Progress)
  - Test forward navigation requires validation
  - Test URL routing matches wizard state
  - Must be <200 lines

## Phase 3.4: Wizard Infrastructure
**CRITICAL: Sequential execution - each task depends on previous**

- [ ] T023 Create investigationWizardStore in `src/microservices/investigation/stores/investigationWizardStore.ts`
  - Implement Zustand store with WizardStore interface
  - Include investigation, currentStep, settings, notification state
  - Include actions: setInvestigation, setCurrentStep, setSettings, showNotification, dismissNotification
  - Reference: quickstart.md Step 3.1
  - Must be <200 lines

- [ ] T024 Create useWizardNavigation hook in `src/microservices/investigation/hooks/useWizardNavigation.ts`
  - Implement canNavigateToStep logic (allows backward, requires validation for forward)
  - Implement navigateToStep with React Router integration
  - Use useWizardStore for state
  - Reference: quickstart.md Step 3.2
  - Must be <200 lines

- [ ] T025 Create useWizardValidation hook in `src/microservices/investigation/hooks/useWizardValidation.ts`
  - Implement settings validation using validateInvestigationSettings
  - Return validation errors array
  - Support debounced validation (500ms)
  - Update settings.isValid flag
  - Must be <200 lines

- [ ] T026 Create WizardProgressIndicator component in `src/microservices/investigation/components/wizard/WizardProgressIndicator.tsx`
  - Implement 3-step indicator (Settings, Progress, Results)
  - Show active/completed/future states
  - Use numbered circles with GAIA styling
  - Support click navigation to completed steps
  - Reference: CLAUDE.md wizard progress indicator
  - Must be <200 lines

## Phase 3.5: Settings Page Components [P]
**CRITICAL: Depends on Phase 3.4 completion. All [P] can run in parallel**

- [ ] T027 [P] Create EntitySelectionPanel component in `src/microservices/investigation/components/wizard/settings/EntitySelectionPanel.tsx`
  - Implement multi-entity selection (add/remove entities)
  - Support entity type dropdown (EntityType enum)
  - Validate entity values using validateEntityValue
  - Show primary entity radio selection for multi-entity
  - Show validation errors inline
  - Must be <200 lines

- [ ] T028 [P] Create TimeRangeSelector component in `src/microservices/investigation/components/wizard/settings/TimeRangeSelector.tsx`
  - Implement predefined options (last 24h, 7d, 30d, custom)
  - Custom date range picker
  - Validate end date > start date
  - Must be <200 lines

- [ ] T029 [P] Create ToolMatrixPanel component in `src/microservices/investigation/components/wizard/settings/ToolMatrixPanel.tsx`
  - Implement tool-agent matrix selection (checkboxes)
  - Fetch tools and agents from GET /api/tools
  - Support priority weighting per tool
  - Enable/disable individual tools
  - Must be <200 lines

- [ ] T030 [P] Create AdvancedOptionsPanel component in `src/microservices/investigation/components/wizard/settings/AdvancedOptionsPanel.tsx`
  - Collapsible panel for advanced settings
  - Correlation mode toggle (AND/OR)
  - Execution mode toggle (parallel/sequential)
  - Risk threshold slider (0-100)
  - Enable LLM insights toggle
  - Enable relationship graph toggle
  - Must be <200 lines

- [ ] T031 [P] Create ValidationPanel component in `src/microservices/investigation/components/wizard/settings/ValidationPanel.tsx`
  - Show validation errors from useWizardValidation
  - Color-coded error/warning badges
  - Real-time validation status indicator
  - "Validate Settings" button
  - Must be <200 lines

- [ ] T032 [P] Create TemplateManagementPanel component in `src/microservices/investigation/components/wizard/settings/TemplateManagementPanel.tsx`
  - List available templates from GET /api/templates
  - Load template button (populates settings)
  - Save as template button (POST /api/templates)
  - Delete custom templates (DELETE /api/templates/:id)
  - Must be <200 lines

## Phase 3.6: Settings Page Implementation
**CRITICAL: Depends on Phase 3.5 completion**

- [ ] T033 Create InvestigationSettingsPage in `src/microservices/investigation/pages/InvestigationSettingsPage.tsx`
  - Implement 2-column layout (lg:grid-cols-3, 2/3 left, 1/3 right)
  - Left column: TemplateManagementPanel, EntitySelectionPanel, TimeRangeSelector, ToolMatrixPanel, AdvancedOptionsPanel
  - Right column: Sticky sidebar with ValidationPanel and "Start Investigation" button
  - Wire up all panels to useWizardStore
  - Handle "Start Investigation" → POST /api/investigations/execute
  - Navigate to Progress page on success
  - Reference: quickstart.md Step 4.1
  - Must be <200 lines

## Phase 3.7: Progress Page Components [P]
**CRITICAL: Depends on Phase 3.4 completion. All [P] can run in parallel**

- [ ] T034 [P] Create ProgressGauge component in `src/microservices/investigation/components/wizard/progress/ProgressGauge.tsx`
  - Circular progress gauge (0-100%)
  - GAIA gradient colors based on progress
  - Show percentage label
  - Animated progress transitions
  - Must be <200 lines

- [ ] T035 [P] Create PhaseTimeline component in `src/microservices/investigation/components/wizard/progress/PhaseTimeline.tsx`
  - Display investigation phases vertically
  - Show phase status (pending, running, completed, failed)
  - Show start/end timestamps
  - Progress bar per phase
  - Must be <200 lines

- [ ] T036 [P] Create LiveLogStream component in `src/microservices/investigation/components/wizard/progress/LiveLogStream.tsx`
  - Real-time log display (auto-scroll)
  - Color-coded by level (info: blue, warning: yellow, error: red)
  - Show timestamp, level badge, message
  - Limit to last 100 entries
  - Must be <200 lines

- [ ] T037 [P] Create ToolExecutionCard component in `src/microservices/investigation/components/wizard/progress/ToolExecutionCard.tsx`
  - Display tool name, agent name, status
  - Show spinner for running tools
  - Show checkmark for completed tools
  - Show error icon for failed tools
  - Collapsible to show execution details
  - Must be <200 lines

- [ ] T038 [P] Create EstimatedTimeRemaining component in `src/microservices/investigation/components/wizard/progress/EstimatedTimeRemaining.tsx`
  - Display estimated time remaining
  - Format as minutes/seconds
  - Update every second
  - Show "Calculating..." when null
  - Must be <200 lines

## Phase 3.8: Progress Page Implementation
**CRITICAL: Depends on Phase 3.7 completion**

- [ ] T039 Create InvestigationProgressPage in `src/microservices/investigation/pages/InvestigationProgressPage.tsx`
  - Connect to WebSocket: io(`${REACT_APP_WS_BASE_URL}/investigations/${investigationId}`)
  - Subscribe to progress_update, tool_execution_started, tool_execution_completed, log_entry, investigation_completed events
  - Update state from WebSocket events
  - Display ProgressGauge, PhaseTimeline, LiveLogStream, ToolExecutionCard list, EstimatedTimeRemaining
  - Navigate to Results page on investigation_completed event
  - Reference: quickstart.md Step 4.2
  - Must be <200 lines

## Phase 3.9: Results Page Components [P]
**CRITICAL: Depends on Phase 3.4 completion. All [P] can run in parallel**

- [ ] T040 [P] Create RiskGauge component in `src/microservices/investigation/components/wizard/results/RiskGauge.tsx`
  - Circular gauge with gradient (critical: red, high: amber, medium: cyan, low: gray)
  - Display overall risk score (0-100)
  - Show risk level badge (CRITICAL/HIGH/MEDIUM/LOW)
  - Show confidence score
  - Reference: CLAUDE.md risk level color coding
  - Must be <200 lines

- [ ] T041 [P] Create RiskFactorsPanel component in `src/microservices/investigation/components/wizard/results/RiskFactorsPanel.tsx`
  - List all risk factors with severity badges
  - Show contribution weight per factor
  - Show evidence count per factor
  - Collapsible panel
  - Must be <200 lines

- [ ] T042 [P] Create AgentResultCard component in `src/microservices/investigation/components/wizard/results/AgentResultCard.tsx`
  - Display agent name, risk score, confidence score
  - Show analysis findings (collapsible)
  - List supporting evidence with links
  - Link to related tool executions
  - Must be <200 lines

- [ ] T043 [P] Create NetworkDiagramVisualization component in `src/microservices/investigation/components/wizard/results/NetworkDiagramVisualization.tsx`
  - Use react-flow-renderer or d3 for network graph
  - Render nodes (entity, event, tool, agent types)
  - Render edges (correlation, execution, finding, evidence types)
  - Color nodes by risk score
  - Support force/hierarchical/circular layouts
  - Must be <200 lines

- [ ] T044 [P] Create TimelineVisualization component in `src/microservices/investigation/components/wizard/results/TimelineVisualization.tsx`
  - Display events on timeline (tool executions, findings, anomalies)
  - Color-code by severity (low, medium, high, critical)
  - Support zoom and pan
  - Show event details on hover/click
  - Must be <200 lines

- [ ] T045 [P] Create CorrelationMatrixVisualization component in `src/microservices/investigation/components/wizard/results/CorrelationMatrixVisualization.tsx`
  - Display entity correlation matrix as heatmap
  - Show correlation scores (0-1) with color intensity
  - Support filtering by threshold
  - Show shared indicators on cell hover
  - Must be <200 lines

- [ ] T046 [P] Create EvidenceTablePanel component in `src/microservices/investigation/components/wizard/results/EvidenceTablePanel.tsx`
  - Paginated evidence table
  - Columns: type, source, timestamp, description, trust score
  - Filter by evidence type
  - Sort by timestamp or trust score
  - Must be <200 lines

- [ ] T047 [P] Create ExportOptionsPanel component in `src/microservices/investigation/components/wizard/results/ExportOptionsPanel.tsx`
  - Export format selector (PDF, JSON, CSV)
  - Section checkboxes (risk_assessment, agent_results, tool_executions, timeline, evidence)
  - Include visualization checkbox
  - Include raw data checkbox
  - Export button → POST /api/investigations/:id/export
  - Download from response.downloadUrl
  - Must be <200 lines

## Phase 3.10: Results Page Implementation
**CRITICAL: Depends on Phase 3.9 completion**

- [ ] T048 Create InvestigationResultsPage in `src/microservices/investigation/pages/InvestigationResultsPage.tsx`
  - Fetch results from GET /api/investigations/:id/results
  - Display RiskGauge, RiskFactorsPanel, AgentResultCard list
  - Tabbed visualizations: Network Diagram, Timeline, Correlation Matrix
  - Display EvidenceTablePanel, ExportOptionsPanel
  - Reference: quickstart.md Step 4.3
  - Must be <200 lines

## Phase 3.11: MultiEntityView Component
**CRITICAL: Depends on Phase 3.10 completion**

- [ ] T049 Create MultiEntityView component in `src/microservices/investigation/components/wizard/MultiEntityView.tsx`
  - Display multiple entities with correlation mode (AND/OR)
  - Show primary entity indicator
  - Drill-down to per-entity results
  - Correlation score matrix between entities
  - Must be <200 lines

## Phase 3.12: Wizard Container
**CRITICAL: Depends on Phase 3.6, 3.8, 3.10 completion**

- [ ] T050 Create InvestigationWizardShell in `src/microservices/investigation/components/wizard/InvestigationWizardShell.tsx`
  - Implement React Router routes: /investigation/settings, /investigation/progress, /investigation/results
  - Include WizardProgressIndicator at top
  - Apply GAIA dark theme background (bg-corporate-bgPrimary)
  - Max-width container with padding
  - Reference: quickstart.md Step 5
  - Must be <200 lines

## Phase 3.13: Integration Tests [P]
**CRITICAL: Depends on Phase 3.12 completion. All [P] can run in parallel**

- [ ] T051 [P] Integration test complete wizard flow in `tests/integration/wizard-flow.test.tsx`
  - User Story 2: Complete wizard flow from Settings to Results
  - Configure settings, start investigation, monitor progress, view results
  - Verify API calls, WebSocket events, state updates, navigation
  - Must be <200 lines

- [ ] T052 [P] Integration test settings validation in `tests/integration/settings-validation.test.tsx`
  - User Story 3: Settings page validation scenarios
  - Test entity validation errors, multi-entity primary selection, tool selection requirements
  - Must be <200 lines

- [ ] T053 [P] Integration test progress monitoring in `tests/integration/progress-monitoring.test.tsx`
  - User Story 4: Progress page real-time updates
  - Test WebSocket event handling, log streaming, tool execution updates
  - Must be <200 lines

- [ ] T054 [P] Integration test results visualization in `tests/integration/results-visualization.test.tsx`
  - User Story 5: Results page visualization interactions
  - Test risk gauge, network diagram, timeline, correlation matrix
  - Must be <200 lines

## Phase 3.14: Visual Regression Tests [P]
**CRITICAL: Depends on Phase 3.12 completion. All [P] can run in parallel**

- [ ] T055 [P] Visual test GAIA design consistency in `tests/e2e/visual/gaia-design.e2e.ts`
  - User Story 1: Verify GAIA corporate color palette application
  - Screenshot settings page, progress page, results page
  - Compare against GAIA reference screenshots
  - Must be <200 lines

- [ ] T056 [P] Visual test responsive layouts in `tests/e2e/visual/responsive.e2e.ts`
  - Test mobile (sm), tablet (md), desktop (lg, xl) layouts
  - Verify 2-column layout on desktop, single column on mobile
  - Must be <200 lines

- [ ] T057 [P] Visual test component interaction states in `tests/e2e/visual/interactions.e2e.ts`
  - User Story 6: Test hover, active, disabled, loading states
  - Screenshot buttons, inputs, toggles in all states
  - Must be <200 lines

## Phase 3.15: Refinement
**CRITICAL: Depends on Phase 3.12 completion. Sequential execution**

- [ ] T058 Integrate WebSocket retry logic in `src/shared/services/websocket.service.ts`
  - Implement exponential backoff reconnection
  - Handle connection errors gracefully
  - Show connection status indicator
  - Configuration-driven retry limits (REACT_APP_WS_MAX_RETRIES)
  - Must be <200 lines

- [ ] T059 Implement state persistence in `src/microservices/investigation/hooks/useWizardPersistence.ts`
  - Save wizard state to Local Storage every 30s (REACT_APP_WIZARD_AUTO_SAVE_INTERVAL_MS)
  - Restore wizard state on page reload
  - Clear on investigation completion or cancellation
  - Must be <200 lines

- [ ] T060 Create useNotifications hook in `src/shared/hooks/useNotifications.ts`
  - Implement notification queue with auto-dismiss
  - Support success, error, warning, info types
  - Configurable auto-dismiss timeout
  - Action button support
  - Must be <200 lines

## Dependencies

**Phase Dependencies**:
- Phase 3.2 depends on Phase 3.1
- Phase 3.4 depends on Phase 3.2, 3.3
- Phase 3.5 depends on Phase 3.4
- Phase 3.6 depends on Phase 3.5
- Phase 3.7 depends on Phase 3.4
- Phase 3.8 depends on Phase 3.7
- Phase 3.9 depends on Phase 3.4
- Phase 3.10 depends on Phase 3.9
- Phase 3.11 depends on Phase 3.10
- Phase 3.12 depends on Phase 3.6, 3.8, 3.10
- Phase 3.13 depends on Phase 3.12
- Phase 3.14 depends on Phase 3.12
- Phase 3.15 depends on Phase 3.12

**Critical Path**:
T001-T009 → T010-T018 → T019-T022 → T023 → T024 → T025 → T026 → T027-T032 → T033 → T050

**Parallel Execution Opportunities**:
- T001-T009: All foundation tasks [P]
- T010-T018: All shared component tasks [P]
- T019-T022: All contract test tasks [P]
- T027-T032: All settings page components [P]
- T034-T038: All progress page components [P]
- T040-T047: All results page components [P]
- T051-T054: All integration tests [P]
- T055-T057: All visual regression tests [P]

## Parallel Example

Launch foundation tasks together (T001-T009):
```bash
Task: "Extend Tailwind config with GAIA corporate colors in tailwind.config.js"
Task: "Create TypeScript type definitions in src/shared/types/wizard.types.ts"
Task: "Create Zod validation schemas in src/shared/types/wizard.schemas.ts"
Task: "Create validation utilities in src/shared/utils/validation.ts"
Task: "Create configuration loader in src/shared/config/wizard.config.ts"
Task: "Add GAIA color palette constants in src/shared/styles/gaia-palette.ts"
Task: "Create configuration schema validation in src/shared/config/config.schema.ts"
Task: "Update environment variables in .env.example"
Task: "Update TypeScript config in tsconfig.json"
```

Launch contract tests together (T019-T022):
```bash
Task: "Contract test Settings API in tests/integration/contracts/settings-api.contract.test.ts"
Task: "Contract test Progress API in tests/integration/contracts/progress-api.contract.test.ts"
Task: "Contract test Results API in tests/integration/contracts/results-api.contract.test.ts"
Task: "Integration test wizard navigation flow in tests/integration/wizard-navigation.test.tsx"
```

## Validation Checklist

- [x] All contracts have corresponding tests (T019-T021 cover settings, progress, results APIs)
- [x] All entities have TypeScript + Zod definitions (T002-T003 cover all 11 entities from data-model.md)
- [x] All tests come before implementation (T019-T022 before T023-T060)
- [x] Parallel tasks truly independent (all [P] tasks operate on different files)
- [x] Each task specifies exact file path (all tasks include full paths)
- [x] No task modifies same file as another [P] task (verified - no conflicts)
- [x] All components under 200 lines (explicitly stated in each task)
- [x] Configuration-driven (T005, T007 ensure config validation)
- [x] GAIA design system adoption (T001, T006, T010-T018)
- [x] WebSocket integration (T039, T058)
- [x] Template management (T032)
- [x] State persistence (T059)
- [x] Notification system (T060)

## Notes

- **[P] tasks**: Different files, no dependencies - can run in parallel
- **File size**: ALL tasks specify <200 lines requirement
- **Testing approach**: TDD - contract tests (T019-T022) MUST be written and failing before implementation
- **Configuration**: NO hardcoded values - all from environment variables
- **Styling**: Pure Tailwind CSS with GAIA corporate colors - NO Material-UI
- **Architecture**: Microservices with Module Federation
- **Commits**: Commit after completing each task
- **Reference**: quickstart.md provides component examples for implementation guidance

## Estimated Task Duration

**Total**: 60 tasks
- **Foundation (9 tasks)**: 1-2 hours (parallel execution)
- **Shared Components (9 tasks)**: 2-3 hours (parallel execution)
- **Contract Tests (4 tasks)**: 1-2 hours (parallel execution)
- **Wizard Infrastructure (4 tasks)**: 2-3 hours (sequential)
- **Settings Page (7 tasks)**: 3-4 hours (6 parallel + 1 integration)
- **Progress Page (6 tasks)**: 2-3 hours (5 parallel + 1 integration)
- **Results Page (9 tasks)**: 4-5 hours (8 parallel + 1 integration)
- **MultiEntityView (1 task)**: 1 hour
- **Wizard Container (1 task)**: 1 hour
- **Integration Tests (4 tasks)**: 2 hours (parallel execution)
- **Visual Tests (3 tasks)**: 1-2 hours (parallel execution)
- **Refinement (3 tasks)**: 1-2 hours (sequential)

**Total Estimated Time**: 20-30 hours (with parallel execution optimization)

## Success Criteria

- [ ] All 60 tasks completed
- [ ] All contract tests passing
- [ ] All integration tests passing
- [ ] All visual regression tests passing
- [ ] Zero Material-UI imports remaining
- [ ] All files under 200 lines
- [ ] GAIA design system fully adopted
- [ ] WebSocket real-time updates working
- [ ] Template management functional
- [ ] State persistence working
- [ ] Configuration validation passing
- [ ] TypeScript strict mode passing
- [ ] ESLint/Prettier passing
- [ ] Build succeeds without errors
- [ ] Ready for deployment to Firebase Hosting
