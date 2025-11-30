# Tasks: Running Investigations Monitoring

**Input**: Design documents from `/specs/023-parallel-investigations-monitor/`
**Prerequisites**: plan.md (required), spec.md (required for user stories)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing. Each story can be implemented and tested independently before moving to the next.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4, US5)
- Include exact file paths in descriptions

---

## Phase 1: Setup & Component Refactoring

**Purpose**: Break down the 249-line ParallelInvestigationsPage into focused, testable modules

- [x] T001 Create directory structure for ParallelInvestigationsPage module in `olorin-front/src/microservices/investigation/pages/ParallelInvestigationsPage/`
- [x] T002 [P] Create empty component files:
  - `ParallelInvestigationsPage.tsx`
  - `InvestigationsTable.tsx`
  - `InvestigationFilters.tsx`
  - `useInvestigationPolling.ts`
  - `index.ts`
- [x] T003 Create test directory structure: `olorin-front/src/microservices/investigation/__tests__/integration/ParallelInvestigationsPage.test.tsx`
- [x] T004 Create types file with interfaces in `olorin-front/src/microservices/investigation/types/index.ts` (if extending existing types)

**Checkpoint**: Component structure ready for implementation

---

## Phase 2: Configuration & Infrastructure

**Purpose**: Set up configuration management for polling, feature flags, and API endpoints

**⚠️ CRITICAL**: Must complete before user story implementation

- [x] T005 [P] Define configuration schema in `olorin-front/src/config/investigationConfig.ts` with:
  - Polling intervals (fast/slow) from environment variables
  - API base URL (from env)
  - Feature flags for filters, real-time updates
  - UI settings (pagination size, etc.)
- [x] T006 [P] Create config loader/validator using Zod schema with fail-fast behavior
- [x] T007 Create `.env.example` with required environment variables:
  - `REACT_APP_INVESTIGATION_POLLING_INTERVAL_MS` (default from const, e.g., 10000)
  - `REACT_APP_API_BASE_URL`
  - `REACT_APP_FEATURE_ENABLE_STATUS_FILTER`
  - `REACT_APP_FEATURE_ENABLE_REAL_TIME_UPDATES`
- [x] T008 Document configuration in `quickstart.md`:
  - Required environment variables
  - Configuration schema
  - How to override defaults
  - Feature flag usage

**Checkpoint**: Configuration framework ready - user story implementation can begin

---

## Phase 3: User Story 1 - Monitor Running Investigations in Real-Time (Priority: P1) 🎯 MVP

**Goal**: Display all running investigations in a table with automatic 10-second polling

**Independent Test**: Can access `/investigation/parallel`, see table with investigation data (ID, Status, Risk Score, Entity, Start Time), automatic refresh every 10 seconds

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T009 [P] [US1] Integration test: Page loads and displays investigations table
  - File: `olorin-front/src/microservices/investigation/__tests__/integration/ParallelInvestigationsPage.test.tsx`
  - Verify table renders with correct columns
  - Verify investigations from API are displayed
  - No hardcoded test data - use mocked API responses
- [ ] T010 [P] [US1] Integration test: Automatic polling refreshes data
  - File: `olorin-front/src/microservices/investigation/__tests__/integration/ParallelInvestigationsPage.test.tsx`
  - Mock API and verify calls every 10 seconds
  - Verify UI updates with new data

### Implementation for User Story 1

- [ ] T011 [P] [US1] Create `useInvestigationPolling.ts` hook (<100 lines):
  - File: `olorin-front/src/microservices/investigation/pages/ParallelInvestigationsPage/useInvestigationPolling.ts`
  - Configuration-driven polling interval (read from config)
  - Call investigationService.getInvestigations() with search filter for 'auto-comp-'
  - Return: `{ investigations, loading, error, refetch }`
  - Stop polling on component unmount
  - Configuration via environment variables (no hardcoded 10000ms)

- [ ] T012 [P] [US1] Create `InvestigationsTable.tsx` component (<100 lines):
  - File: `olorin-front/src/microservices/investigation/pages/ParallelInvestigationsPage/InvestigationsTable.tsx`
  - Accept `investigations` prop and `onRowClick` callback
  - Use shared Table component with CORRECT API:
    - Create `TableConfig<Investigation>` object
    - Define columns with function-based accessors: `accessor: (row) => row.fieldName`
    - Provide `getRowKey: (row) => row.id`
  - Columns: Investigation ID, Entity Value, Status, Risk Score, Start Time
  - Status color coding (green=completed, blue=in-progress, red=error)
  - Risk score color coding (red >0.7, yellow 0.4-0.7, green <0.4)
  - Show skeleton loader while loading
  - Navigate on row click to `/investigation/progress?id={investigationId}`

- [ ] T013 [US1] Create `ParallelInvestigationsPage.tsx` main component (<100 lines):
  - File: `olorin-front/src/microservices/investigation/pages/ParallelInvestigationsPage/ParallelInvestigationsPage.tsx`
  - Use `useInvestigationPolling` hook
  - Render `InvestigationsTable` component
  - Handle loading/error/empty states at page level
  - Pass polling data to table
  - All configuration from environment variables (no hardcoded values)

- [ ] T014 [US1] Create `index.ts` barrel export:
  - File: `olorin-front/src/microservices/investigation/pages/ParallelInvestigationsPage/index.ts`
  - Export ParallelInvestigationsPage as default

- [ ] T015 [US1] Verify routing is configured:
  - File: `olorin-front/src/microservices/investigation/InvestigationApp.tsx`
  - Route `/parallel` exists and points to ParallelInvestigationsPage
  - Verify route displays correctly when navigating to `/investigation/parallel`

- [ ] T016 [US1] Add loading state UI:
  - Show spinner/skeleton while data is loading
  - Use shared components from `@shared/components/` (Tailwind CSS only)

- [ ] T017 [US1] Verify configuration compliance:
  - All polling intervals from config (no hardcoded)
  - All API URLs from config
  - All feature flags from config
  - No hardcoded values in component code

**Checkpoint**: User Story 1 (real-time monitoring) fully functional and independently testable. Page loads, displays investigations, auto-refreshes every 10 seconds.

---

## Phase 4: User Story 2 - Filter Investigations by Status (Priority: P2)

**Goal**: Add status filter controls to view investigations by status (IN_PROGRESS, COMPLETED, ERROR, CANCELLED)

**Independent Test**: Click filter controls, select status(es), verify table updates to show only matching investigations

### Tests for User Story 2

> **NOTE: Write tests FIRST**

- [ ] T018 [P] [US2] Integration test: Status filter controls appear
  - File: `olorin-front/src/microservices/investigation/__tests__/integration/ParallelInvestigationsPage.test.tsx`
  - Verify filter UI renders when `REACT_APP_FEATURE_ENABLE_STATUS_FILTER=true`
  - Verify filter hidden when feature disabled

- [ ] T019 [P] [US2] Integration test: Filter changes table display
  - File: `olorin-front/src/microservices/investigation/__tests__/integration/ParallelInvestigationsPage.test.tsx`
  - Select single status filter, verify API called with correct status parameter
  - Verify table shows only matching investigations
  - Clear filter, verify all investigations display again

### Implementation for User Story 2

- [ ] T020 [US2] Create `InvestigationFilters.tsx` component (<100 lines):
  - File: `olorin-front/src/microservices/investigation/pages/ParallelInvestigationsPage/InvestigationFilters.tsx`
  - Feature flag controlled: `REACT_APP_FEATURE_ENABLE_STATUS_FILTER`
  - Multi-select checkbox or dropdown for statuses: IN_PROGRESS, COMPLETED, ERROR, CANCELLED
  - Accept `selectedStatuses` and `onStatusChange` props
  - Display "Clear filters" button when filters applied
  - Render with Tailwind CSS only (no Material-UI)
  - Return as null if feature flag disabled

- [ ] T021 [US2] Update `useInvestigationPolling.ts` to support status filtering:
  - File: `olorin-front/src/microservices/investigation/pages/ParallelInvestigationsPage/useInvestigationPolling.ts`
  - Add `statusFilter` parameter
  - Pass selected statuses to investigationService.getInvestigations()
  - Note: Backend may need API enhancement for multi-status filtering (refer to plan.md)

- [ ] T022 [US2] Update `ParallelInvestigationsPage.tsx` to integrate filters:
  - File: `olorin-front/src/microservices/investigation/pages/ParallelInvestigationsPage/ParallelInvestigationsPage.tsx`
  - Add state for selected statuses
  - Render `InvestigationFilters` component
  - Pass selected statuses to polling hook
  - Verify filter changes trigger new API call

- [ ] T023 [US2] Verify filter feature flag behavior:
  - Controls visibility and functionality
  - Can be toggled via `REACT_APP_FEATURE_ENABLE_STATUS_FILTER` environment variable

**Checkpoint**: User Stories 1 & 2 both work independently. Page displays investigations, auto-refreshes, can filter by status.

---

## Phase 5: User Story 3 - Navigate to Individual Investigation Details (Priority: P1)

**Goal**: Click investigation row to open detailed progress page

**Independent Test**: Click investigation in table, verify navigation to `/investigation/progress?id={investigationId}` and page loads

### Tests for User Story 3

> **NOTE: Write tests FIRST**

- [ ] T024 [P] [US3] Integration test: Row click navigation works
  - File: `olorin-front/src/microservices/investigation/__tests__/integration/ParallelInvestigationsPage.test.tsx`
  - Click investigation row
  - Verify navigation to correct URL with investigation ID
  - Verify progress page loads investigation data

- [ ] T025 [P] [US3] Integration test: Row is clickable (visual feedback)
  - File: `olorin-front/src/microservices/investigation/__tests__/integration/ParallelInvestigationsPage.test.tsx`
  - Hover over row
  - Verify cursor shows pointer or row highlights
  - Verify row click is actionable

### Implementation for User Story 3

- [ ] T026 [US3] Update `InvestigationsTable.tsx` with row click handler:
  - File: `olorin-front/src/microservices/investigation/pages/ParallelInvestigationsPage/InvestigationsTable.tsx`
  - Row has cursor pointer on hover
  - Row background highlights on hover (Tailwind CSS)
  - Row click navigates: `navigate('/investigation/progress?id=' + row.id)`
  - Verify navigation works with React Router

- [ ] T027 [US3] Verify investigation progress page exists:
  - File: `olorin-front/src/microservices/investigation/pages/InvestigationProgressPage.tsx` (or similar)
  - Loads investigation data when given ID in query param
  - Displays full investigation details
  - No changes needed - verify existing page works

- [ ] T028 [US3] Test end-to-end navigation:
  - Start at `/investigation/parallel`
  - Click investigation
  - Verify progress page loads with correct investigation
  - Go back, verify parallel page still works

**Checkpoint**: User Stories 1, 2, & 3 all work. Can monitor investigations, filter them, and navigate to details.

---

## Phase 6: User Story 4 - Manual Refresh and Update Status (Priority: P2)

**Goal**: Add refresh button and show "Last Updated" timestamp

**Independent Test**: Click refresh button, verify timestamp updates immediately and data refreshes

### Tests for User Story 4

> **NOTE: Write tests FIRST**

- [ ] T029 [P] [US4] Integration test: Refresh button works
  - File: `olorin-front/src/microservices/investigation/__tests__/integration/ParallelInvestigationsPage.test.tsx`
  - Click refresh button
  - Verify API called immediately
  - Verify data updates

- [ ] T030 [P] [US4] Integration test: Last Updated timestamp displays and updates
  - File: `olorin-front/src/microservices/investigation/__tests__/integration/ParallelInvestigationsPage.test.tsx`
  - Verify "Last Updated: [timestamp]" displayed
  - Refresh data
  - Verify timestamp updated

### Implementation for User Story 4

- [ ] T031 [US4] Add refresh button to `ParallelInvestigationsPage.tsx`:
  - File: `olorin-front/src/microservices/investigation/pages/ParallelInvestigationsPage/ParallelInvestigationsPage.tsx`
  - Feature flag: `REACT_APP_FEATURE_ENABLE_MANUAL_REFRESH` (optional, default enabled)
  - Button triggers refetch from polling hook
  - Tailwind CSS styled button
  - Show loading state while refreshing

- [ ] T032 [US4] Add "Last Updated" timestamp display:
  - File: `olorin-front/src/microservices/investigation/pages/ParallelInvestigationsPage/ParallelInvestigationsPage.tsx`
  - Display timestamp when data is loaded
  - Format: "Last Updated: [ISO timestamp or relative time]"
  - Update on every refresh
  - Uses configuration for timestamp format (if needed)

- [ ] T033 [US4] Update `useInvestigationPolling.ts` to expose last update time:
  - File: `olorin-front/src/microservices/investigation/pages/ParallelInvestigationsPage/useInvestigationPolling.ts`
  - Return `lastUpdatedAt` from hook
  - Update on every fetch

**Checkpoint**: Manual refresh and timestamp features working. Users can manually refresh and see data freshness.

---

## Phase 7: User Story 5 - Handle Loading and Error States (Priority: P1)

**Goal**: Show loading indicator, error messages, empty state, and retry button

**Independent Test**: Observe loading state on page load, simulate API error, verify error message and retry button, verify empty state when no investigations

### Tests for User Story 5

> **NOTE: Write tests FIRST**

- [ ] T034 [P] [US5] Integration test: Loading state displays
  - File: `olorin-front/src/microservices/investigation/__tests__/integration/ParallelInvestigationsPage.test.tsx`
  - Verify spinner/skeleton shown while loading
  - Verify loading state hidden when data loaded

- [ ] T035 [P] [US5] Integration test: Error state displays with retry button
  - File: `olorin-front/src/microservices/investigation/__tests__/integration/ParallelInvestigationsPage.test.tsx`
  - Mock API failure
  - Verify error message displayed with actionable text
  - Verify retry button visible
  - Click retry, verify API called again

- [ ] T036 [P] [US5] Integration test: Empty state displays
  - File: `olorin-front/src/microservices/investigation/__tests__/integration/ParallelInvestigationsPage.test.tsx`
  - Mock API return empty list
  - Verify empty state message displayed (e.g., "No investigations found")
  - Verify message guides user (e.g., "Create new investigation to get started")

### Implementation for User Story 5

- [ ] T037 [US5] Create loading state UI in `ParallelInvestigationsPage.tsx`:
  - File: `olorin-front/src/microservices/investigation/pages/ParallelInvestigationsPage/ParallelInvestigationsPage.tsx`
  - Show skeleton loader or spinner while `loading === true`
  - Hide when data loaded
  - Use shared components (Tailwind CSS)

- [ ] T038 [US5] Create error state UI in `ParallelInvestigationsPage.tsx`:
  - File: `olorin-front/src/microservices/investigation/pages/ParallelInvestigationsPage/ParallelInvestigationsPage.tsx`
  - Show user-friendly error message when `error !== null`
  - Display error details (not just "Error")
  - Show "Retry" button that calls `refetch()`
  - Use Tailwind CSS for styling

- [ ] T039 [US5] Create empty state UI in `ParallelInvestigationsPage.tsx`:
  - File: `olorin-front/src/microservices/investigation/pages/ParallelInvestigationsPage/ParallelInvestigationsPage.tsx`
  - Show empty state message when `investigations.length === 0` and not loading
  - Helpful message: "No investigations found. Create new investigation to get started."
  - Optional: Link to create investigation page (if exists)

- [ ] T040 [US5] Update `useInvestigationPolling.ts` error handling:
  - File: `olorin-front/src/microservices/investigation/pages/ParallelInvestigationsPage/useInvestigationPolling.ts`
  - Catch API errors gracefully
  - Return error state that components can display
  - Implement retry logic (call refetch)
  - Verify no errors logged to production logs (handle gracefully)

- [ ] T041 [US5] Handle malformed/missing data gracefully:
  - File: `olorin-front/src/microservices/investigation/pages/ParallelInvestigationsPage/InvestigationsTable.tsx`
  - Missing entity values: show "N/A" or placeholder
  - Invalid status values: show as-is with explanation, don't crash
  - Missing risk scores: show default or N/A

**Checkpoint**: All error and loading states handled. Page is robust and user-friendly.

---

## Phase 8: Compliance & Quality

**Purpose**: Ensure production readiness and CLAUDE.md compliance

- [ ] T042 [P] Verify file sizes:
  - All `.tsx/.ts` files under 200 lines (spec/plan requirement)
  - Check: `wc -l olorin-front/src/microservices/investigation/pages/ParallelInvestigationsPage/*.{tsx,ts}`

- [ ] T043 [P] Verify no hardcoded values:
  - No literal URLs, ports, timeouts
  - All configuration from environment variables
  - Check for hardcoded strings: 10000, 300, API endpoints
  - Use: `grep -r "10000\|300\|localhost\|http://" src/microservices/investigation/pages/ParallelInvestigationsPage/`

- [ ] T044 [P] Verify no Material-UI imports:
  - No `@mui/material`, `@mui/icons-material`, `styled-components`
  - Use: `grep -r "@mui\|styled-components" src/microservices/investigation/pages/ParallelInvestigationsPage/`
  - Tailwind CSS only

- [ ] T045 [P] Verify no forbidden terms:
  - No TODO, FIXME, STUB, MOCK (outside tests), PENDING in production code
  - Use: `grep -r "TODO\|FIXME\|STUB\|MOCK\|PENDING" src/microservices/investigation/pages/ParallelInvestigationsPage/ --include="*.tsx" --include="*.ts"`

- [ ] T046 [P] Code quality checks:
  - Run linting: `npm run lint -- olorin-front/src/microservices/investigation/pages/ParallelInvestigationsPage/`
  - Run TypeScript type check: `npm run typecheck`
  - Fix any errors

- [ ] T047 Type safety audit:
  - Verify all component props properly typed
  - Verify hook return types defined
  - Verify no `any` types unless justified
  - Run: `npm run typecheck` and resolve errors

- [ ] T048 Configuration validation:
  - Verify config schema is comprehensive
  - Test with missing environment variables (should fail fast)
  - Test with invalid values (should fail fast)
  - Document all required environment variables in .env.example

- [ ] T049 Run integration tests:
  - File: `olorin-front/src/microservices/investigation/__tests__/integration/ParallelInvestigationsPage.test.tsx`
  - Run: `npm test -- ParallelInvestigationsPage.test.tsx`
  - Verify all tests pass
  - Verify test coverage (no untested code paths)

- [ ] T050 Manual testing checklist:
  - Start Investigation microservice: `npm run dev:investigation`
  - Navigate to `/investigation/parallel`
  - Verify investigations load in table
  - Verify auto-refresh every 10 seconds
  - Apply status filter (if enabled)
  - Click refresh button
  - Verify "Last Updated" timestamp updates
  - Click investigation row → verify navigation to progress page
  - Simulate network error → verify error message and retry
  - Clear all filters (if filtering) → verify all investigations display

- [ ] T051 Documentation:
  - Update `quickstart.md` with:
    - How to run Investigation microservice
    - Required environment variables
    - Feature flags and what they control
    - How to test the feature
    - Known limitations
  - File: `/specs/023-parallel-investigations-monitor/quickstart.md`

**Checkpoint**: All compliance checks pass. Code is production-ready.

---

## Phase 9: Polish & Integration

**Purpose**: Final verification and integration with broader system

- [ ] T052 [P] Verify routing integration:
  - Check InvestigationApp.tsx has `/parallel` route
  - Verify navigation from shell works
  - Verify service link in serviceData.ts exists
  - Verify status shows 'ready' in serviceData.ts

- [ ] T053 [P] Verify shared component compliance:
  - Using correct Table component API
  - No Material-UI components anywhere
  - All components from @shared/ or built with Tailwind

- [ ] T054 [P] Verify backend API compliance:
  - `/api/v1/investigation-state/` endpoint working
  - Supports pagination, search, filtering
  - Verify response schema matches expectations
  - Document any backend enhancements needed (e.g., multi-status filtering)

- [ ] T055 Cross-service communication:
  - Investigate microservice can communicate with backend independently
  - Module federation imports work correctly
  - No circular dependencies

- [ ] T056 Performance verification:
  - Page load time: target <2 seconds
  - Auto-refresh interval: 10 seconds (configurable)
  - Status filter response: <1 second
  - Handle up to 100 investigations without lag

- [ ] T057 Accessibility check:
  - Table is keyboard accessible
  - Filter controls are keyboard accessible
  - Buttons have proper ARIA labels
  - Colors meet WCAG contrast requirements

- [ ] T058 Browser compatibility:
  - Test on Chrome, Firefox, Safari, Edge
  - Verify responsive design (mobile/tablet/desktop)
  - No console errors

**Checkpoint**: Feature fully integrated and production-ready.

---

## Dependencies & Execution Order

### Phase Dependencies

1. **Phase 1 (Setup)**: No dependencies - start immediately
2. **Phase 2 (Configuration)**: Depends on Phase 1 - BLOCKS all user stories
3. **User Stories (Phases 3-7)**: All depend on Phases 1-2
   - US1, US3, US5 (P1): Implement in priority order
   - US2, US4 (P2): Can follow P1 stories
4. **Phase 8 (Compliance)**: After all user stories complete
5. **Phase 9 (Integration)**: After compliance checks pass

### Parallel Opportunities

- Phase 1 tasks marked [P] can run in parallel
- Phase 2 tasks marked [P] can run in parallel
- Once Phase 2 completes, user story tests can be written in parallel
- User story implementations marked [P] can run in parallel after tests are written

### Implementation Strategy

**MVP First (User Stories 1, 3, 5 - all P1)**:
1. Complete Phase 1 & 2 (Setup + Configuration)
2. Implement US1 (Real-time monitoring) - page loads, displays, auto-refreshes
3. Implement US3 (Navigation) - click row to view details
4. Implement US5 (Error handling) - loading, error, empty states
5. Complete Phase 8 compliance checks
6. Deploy MVP

**Then Add P2 Stories**:
7. Implement US2 (Filtering) - optional but enhances usability
8. Implement US4 (Refresh button) - optional but improves UX
9. Complete Phase 9 integration checks

---

## Notes

- [P] = tasks with no dependencies on other tasks in same phase (can run in parallel)
- Each user story should be independently completable and testable
- Write tests FIRST, ensure they fail before implementation
- Commit after each logical group (e.g., after completing a user story)
- Stop at any checkpoint to validate story independently
- Configuration is CRITICAL - all env vars properly handled
- CLAUDE.md compliance is non-negotiable: <200 lines, no hardcoded values, Tailwind CSS only
