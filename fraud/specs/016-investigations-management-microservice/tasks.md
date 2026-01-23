# Tasks: Investigations Management Microservice

**Input**: Design documents from `/specs/001-investigations-management-microservice/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**Tests**: Tests are OPTIONAL - not explicitly requested in spec, so test tasks are excluded. Focus on implementation tasks.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Frontend Microservice**: `olorin-front/src/microservices/investigations-management/`
- **Shell Integration**: `olorin-front/src/shell/`
- **Backend**: No changes needed (uses existing APIs)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic microservice structure

- [x] T001 Create microservice directory structure at olorin-front/src/microservices/investigations-management/
- [x] T002 [P] Create types directory and investigation types file at olorin-front/src/microservices/investigations-management/types/investigations.ts
- [x] T003 [P] Create services directory and API service file at olorin-front/src/microservices/investigations-management/services/investigationsManagementService.ts
- [x] T004 [P] Create components directory structure at olorin-front/src/microservices/investigations-management/components/
- [x] T005 [P] Create hooks directory at olorin-front/src/microservices/investigations-management/hooks/
- [x] T006 [P] Create utils directory at olorin-front/src/microservices/investigations-management/utils/
- [x] T007 [P] Create pages directory at olorin-front/src/microservices/investigations-management/pages/
- [x] T008 [P] Create styles directory and Tailwind CSS file at olorin-front/src/microservices/investigations-management/styles/tailwind.css
- [x] T009 Configure Webpack Module Federation for investigations-management microservice (port 3008) in olorin-front/webpack.config.js

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T010 [P] Define Investigation, InvestigationPhase, InvestigationStatus types in olorin-front/src/microservices/investigations-management/types/investigations.ts
- [x] T011 [P] Define ActivityLogEntry, InvestigationFilters, InvestigationFormData types in olorin-front/src/microservices/investigations-management/types/investigations.ts
- [x] T012 [P] Implement investigationsManagementService with list() method in olorin-front/src/microservices/investigations-management/services/investigationsManagementService.ts
- [x] T013 [P] Implement investigationsManagementService with get(id) method in olorin-front/src/microservices/investigations-management/services/investigationsManagementService.ts
- [x] T014 [P] Implement investigationsManagementService with create(request) method in olorin-front/src/microservices/investigations-management/services/investigationsManagementService.ts
- [x] T015 [P] Implement investigationsManagementService with update(id, request) method in olorin-front/src/microservices/investigations-management/services/investigationsManagementService.ts
- [x] T016 [P] Implement investigationsManagementService with delete(id) method in olorin-front/src/microservices/investigations-management/services/investigationsManagementService.ts
- [x] T017 Create base InvestigationsManagementApp component with routing in olorin-front/src/microservices/investigations-management/InvestigationsManagementApp.tsx
- [x] T018 Create index.tsx export file at olorin-front/src/microservices/investigations-management/index.tsx
- [x] T019 Add Investigations Management card to serviceLinks array in olorin-front/src/shell/constants/serviceData.ts
- [x] T020 Add route for /investigations-management in olorin-front/src/shell/App.tsx

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - View and Browse Investigations List (Priority: P1) 🎯 MVP

**Goal**: Display a list of investigations in a card-based grid layout with filtering and search capabilities

**Independent Test**: Navigate to /investigations-management and verify investigations are displayed in cards with name, status, owner, risk model, and last updated time. Test search and filter functionality.

### Implementation for User Story 1

- [x] T021 [P] [US1] Create StatusBadge component in olorin-front/src/microservices/investigations-management/components/common/StatusBadge.tsx
- [x] T022 [P] [US1] Create InvestigationCard component in olorin-front/src/microservices/investigations-management/components/common/InvestigationCard.tsx
- [x] T023 [P] [US1] Create InvestigationFilters component with search and status filter in olorin-front/src/microservices/investigations-management/components/InvestigationFilters.tsx
- [x] T024 [US1] Create InvestigationList component with grid layout in olorin-front/src/microservices/investigations-management/components/InvestigationList.tsx (depends on T021, T022, T023)
- [x] T025 [US1] Create useInvestigations hook for fetching and filtering investigations in olorin-front/src/microservices/investigations-management/hooks/useInvestigations.ts
- [x] T026 [US1] Create InvestigationsManagementPage component integrating list and filters in olorin-front/src/microservices/investigations-management/pages/InvestigationsManagementPage.tsx (depends on T024, T025)
- [x] T027 [US1] Add tab-based filtering (All, My Items, In Progress, Completed, Failed, Archived) to InvestigationFilters component
- [x] T028 [US1] Implement search debouncing (300ms) in useInvestigations hook
- [x] T029 [US1] Add empty state component for when no investigations match filters in olorin-front/src/microservices/investigations-management/components/EmptyState.tsx
- [x] T030 [US1] Add loading state with spinner in InvestigationList component
- [x] T031 [US1] Add error handling and error message display in InvestigationList component

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently. Users can view, search, and filter investigations.

---

## Phase 4: User Story 2 - Create New Investigation (Priority: P1)

**Goal**: Allow users to create new investigations via a modal form with validation

**Independent Test**: Click "New Investigation" button, fill form with required fields (name, owner), submit, and verify investigation appears in list with status "pending" or "in-progress" if auto-run enabled.

### Implementation for User Story 2

- [x] T032 [P] [US2] Create InvestigationForm component with all form fields in olorin-front/src/microservices/investigations-management/components/InvestigationForm.tsx
- [x] T033 [P] [US2] Create form field components for sources (chips) in InvestigationForm component
- [x] T034 [P] [US2] Create form field components for tools (chips) in InvestigationForm component
- [x] T035 [US2] Create Modal component wrapper for InvestigationForm in olorin-front/src/microservices/investigations-management/components/common/Modal.tsx (depends on T032)
- [x] T036 [US2] Create useInvestigationForm hook for form state management in olorin-front/src/microservices/investigations-management/hooks/useInvestigationForm.ts
- [x] T037 [US2] Add form validation for required fields (name, owner) in useInvestigationForm hook
- [x] T038 [US2] Add datetime-local inputs for time range (from/to) in InvestigationForm component
- [x] T039 [US2] Add risk model dropdown with options (v3.2, v3.1, v2.9) in InvestigationForm component
- [x] T040 [US2] Add auto-run toggle switch in InvestigationForm component
- [x] T041 [US2] Integrate form submission with investigationsManagementService.create() in useInvestigationForm hook
- [x] T042 [US2] Add "New Investigation" button to InvestigationsManagementPage that opens modal
- [x] T043 [US2] Add keyboard shortcut handler for 'N' key to open new investigation modal in olorin-front/src/microservices/investigations-management/utils/keyboardShortcuts.ts
- [x] T044 [US2] Add success toast notification after investigation creation
- [x] T045 [US2] Refresh investigation list after successful creation

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently. Users can view investigations and create new ones.

---

## Phase 5: User Story 3 - View Investigation Details (Priority: P1)

**Goal**: Display detailed investigation information in a drawer/sidebar with phases, progress, and parameters

**Independent Test**: Click on an investigation card, verify drawer opens showing phases with status indicators, progress bars, timeline, and parameters (risk model, sources, tools, time range).

### Implementation for User Story 3

- [x] T046 [P] [US3] Create ProgressBar component in olorin-front/src/microservices/investigations-management/components/common/ProgressBar.tsx
- [x] T047 [P] [US3] Create PhaseTimeline component for displaying investigation phases in olorin-front/src/microservices/investigations-management/components/PhaseTimeline.tsx
- [x] T048 [US3] Create InvestigationDrawer component (right-side slide-in panel) in olorin-front/src/microservices/investigations-management/components/InvestigationDrawer.tsx (depends on T046, T047)
- [x] T049 [US3] Add drawer header with investigation name, status, owner, and updated time in InvestigationDrawer component
- [x] T050 [US3] Display investigation phases with status indicators (pending, in-progress, completed) in PhaseTimeline component
- [x] T051 [US3] Display progress bars for each phase showing percentage in PhaseTimeline component
- [x] T052 [US3] Display phase timeline with start/end timestamps in PhaseTimeline component
- [x] T053 [US3] Display investigation parameters section (risk model, sources, tools, time range) in InvestigationDrawer component
- [x] T054 [US3] Add "View" button to InvestigationCard that opens drawer
- [x] T055 [US3] Add click handler to InvestigationCard to open drawer when card is clicked
- [x] T056 [US3] Add close button and ESC key handler to close drawer in InvestigationDrawer component
- [x] T057 [US3] Add drawer animation (slide-in from right) using Tailwind CSS transitions

**Checkpoint**: At this point, User Stories 1, 2, AND 3 should all work independently. Users can view list, create investigations, and view details.

---

## Phase 6: User Story 4 - Edit and Update Investigation (Priority: P2)

**Goal**: Allow users to edit existing investigations via modal form pre-filled with current data

**Independent Test**: Click "Edit" on an investigation card, modify fields in form, submit, and verify changes are saved and reflected in list and drawer.

### Implementation for User Story 4

- [x] T058 [US4] Add edit mode support to InvestigationForm component (pre-fill with existing data)
- [x] T059 [US4] Add "Edit" button to InvestigationCard component
- [x] T060 [US4] Add edit handler that opens InvestigationForm modal with investigation data in InvestigationsManagementPage
- [x] T061 [US4] Update useInvestigationForm hook to handle edit mode (load existing data)
- [x] T062 [US4] Integrate form submission with investigationsManagementService.update() for edit mode
- [x] T063 [US4] Refresh investigation list and close drawer (if open) after successful update
- [x] T064 [US4] Add success toast notification after investigation update

**Checkpoint**: At this point, User Stories 1-4 should all work independently. Users can view, create, view details, and edit investigations.

---

## Phase 7: User Story 5 - Delete Investigation (Priority: P2)

**Goal**: Allow users to delete investigations with confirmation dialog

**Independent Test**: Click "Delete" on an investigation card, confirm deletion, verify investigation is removed from list and backend.

### Implementation for User Story 5

- [x] T065 [US5] Create ConfirmationDialog component in olorin-front/src/microservices/investigations-management/components/common/ConfirmationDialog.tsx (using window.confirm)
- [x] T066 [US5] Add "Delete" button to InvestigationCard component
- [x] T067 [US5] Add delete handler that opens confirmation dialog in InvestigationsManagementPage
- [x] T068 [US5] Integrate confirmation with investigationsManagementService.delete() method
- [x] T069 [US5] Remove investigation from list after successful deletion
- [x] T070 [US5] Close drawer if deleted investigation was being viewed
- [x] T071 [US5] Add success toast notification after deletion
- [x] T072 [US5] Add error handling for deletion failures

**Checkpoint**: At this point, User Stories 1-5 should all work independently. Users can view, create, view details, edit, and delete investigations.

---

## Phase 8: User Story 6 - Replay Investigation (Priority: P2)

**Goal**: Create a new investigation based on existing one with modified parameters

**Independent Test**: Click "Replay" on an investigation, modify parameters in form, submit, verify new investigation is created with modified parameters and "(Replay)" appended to name.

### Implementation for User Story 6

- [x] T073 [US6] Add "Replay" button to InvestigationCard component
- [x] T074 [US6] Add "Replay" button to InvestigationDrawer component header
- [x] T075 [US6] Create replay handler that opens InvestigationForm modal pre-filled with investigation data in InvestigationsManagementPage
- [x] T076 [US6] Modify form submission logic to append "(Replay)" to investigation name when replaying
- [x] T077 [US6] Set new investigation status to "pending" when replaying (regardless of original status)
- [x] T078 [US6] Reset progress and phases to initial state when replaying (handled by backend)
- [x] T079 [US6] Create new investigation via investigationsManagementService.create() with modified parameters

**Checkpoint**: At this point, User Stories 1-6 should all work independently. Users can replay investigations with modified parameters.

---

## Phase 9: User Story 7 - Export and Import Investigations (Priority: P3)

**Goal**: Export investigations to JSON and import them back for backup/sharing

**Independent Test**: Click "Export JSON", download file, click "Import JSON", upload file, verify investigations are imported and appear in list.

### Implementation for User Story 7

- [x] T080 [US7] Create export utility function to convert investigations array to JSON in olorin-front/src/microservices/investigations-management/utils/exportImport.ts
- [x] T081 [US7] Add "Export JSON" button to InvestigationsManagementPage toolbar
- [x] T082 [US7] Implement export handler that downloads JSON file with all investigations
- [x] T083 [US7] Create import utility function to parse and validate JSON file in olorin-front/src/microservices/investigations-management/utils/exportImport.ts
- [x] T084 [US7] Add "Import JSON" button with file input to InvestigationsManagementPage toolbar
- [x] T085 [US7] Implement import handler that reads JSON file and validates format
- [x] T086 [US7] Add validation for JSON structure (version, exportedAt, investigations array)
- [ ] T087 [US7] Create investigations from imported data using investigationsManagementService.create() for each (TODO: backend integration - currently just validates and shows success)
- [x] T088 [US7] Add success toast notification after successful import
- [x] T089 [US7] Add error handling for invalid JSON format with user-friendly error message

**Checkpoint**: At this point, User Stories 1-7 should all work independently. Users can export and import investigations.

---

## Phase 10: User Story 8 - Real-time Updates (Priority: P2)

**Goal**: Enable real-time updates to investigation progress without manual refresh

**Independent Test**: Create investigation with auto-run enabled, toggle realtime switch on, verify progress bars and phase status update automatically without page refresh.

### Implementation for User Story 8

- [x] T090 [US8] Create useRealtimeUpdates hook for polling investigation status in olorin-front/src/microservices/investigations-management/hooks/useRealtimeUpdates.ts
- [x] T091 [US8] Add realtime toggle switch component to InvestigationsManagementPage
- [x] T092 [US8] Implement polling logic that fetches investigation updates every 5 seconds when enabled
- [x] T093 [US8] Update investigation state in useInvestigations hook when realtime updates received
- [x] T094 [US8] Update progress bars and phase status in InvestigationDrawer when realtime updates received (via reload)
- [x] T095 [US8] Update progress bars in InvestigationCard when realtime updates received (via reload)
- [x] T096 [US8] Add pause/resume functionality when realtime toggle is switched off
- [ ] T097 [US8] Optimize polling to only fetch in-progress investigations when realtime enabled (future optimization)
- [x] T098 [US8] Add connection status indicator (connected/disconnected) for realtime updates

**Checkpoint**: At this point, User Stories 1-8 should all work independently. Users can monitor investigation progress in real-time.

---

## Phase 11: User Story 9 - Activity Log (Priority: P3)

**Goal**: Display activity log of investigation events with timestamps and source

**Independent Test**: Perform actions (create, update, delete investigations), verify events appear in activity log table with time, event description, and source.

### Implementation for User Story 9

- [x] T099 [P] [US9] Create ActivityLog component with table layout in olorin-front/src/microservices/investigations-management/components/common/ActivityLog.tsx
- [x] T100 [US9] Create useActivityLog hook for managing activity log entries in olorin-front/src/microservices/investigations-management/hooks/useActivityLog.ts
- [x] T101 [US9] Add activity log section to InvestigationsManagementPage component (integrated in drawer)
- [ ] T102 [US9] Log investigation creation events to activity log
- [ ] T103 [US9] Log investigation update events to activity log
- [ ] T104 [US9] Log investigation deletion events to activity log
- [ ] T105 [US9] Log export/import events to activity log
- [ ] T106 [US9] Format timestamps in activity log table (use formatters utility)
- [ ] T107 [US9] Add "Clear" button to activity log that clears local log entries
- [ ] T108 [US9] Limit activity log to last 200 entries for performance
- [ ] T109 [US9] Add real-time activity log updates when realtime is enabled

**Checkpoint**: At this point, all User Stories 1-9 should work independently. Users can view activity log of investigation events.

---

## Phase 12: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T110 [P] Add keyboard shortcuts handler for '/' (search focus), 'N' (new), 'ESC' (close modals/drawers) in olorin-front/src/microservices/investigations-management/utils/keyboardShortcuts.ts
- [x] T111 [P] Create formatters utility for date/time formatting in olorin-front/src/microservices/investigations-management/utils/formatters.ts
- [x] T112 [P] Add responsive design breakpoints for mobile (320px+), tablet (768px+), desktop (1024px+) across all components
- [x] T113 [P] Add error boundary wrapper around InvestigationsManagementApp component
- [x] T114 [P] Add loading spinners using LoadingSpinner from @shared/components where needed
- [x] T115 [P] Ensure all components use Tailwind CSS corporate design tokens (colors, spacing, typography)
- [x] T116 [P] Add hover effects and transitions matching Olorin design system
- [x] T117 [P] Verify all components are under 200 lines (refactor if needed)
- [x] T118 [P] Add toast notifications for all user actions (create, update, delete, export, import)
- [x] T119 [P] Add empty state handling for all list views
- [x] T120 [P] Add error state handling with retry functionality
- [x] T121 [P] Add truncation with ellipsis for long investigation names/descriptions
- [x] T122 [P] Add tooltips for action buttons (View, Edit, Delete, Replay)
- [x] T123 [P] Verify accessibility (keyboard navigation, ARIA labels, focus management)
- [ ] T124 [P] Add integration with UnifiedEventBus for inter-microservice communication
- [ ] T125 [P] Update documentation in quickstart.md with actual implementation details
- [ ] T126 [P] Run end-to-end integration test: create investigation → view details → edit → delete → verify backend persistence

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-11)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Phase 12)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P1)**: Can start after Foundational (Phase 2) - Uses US1 components but independently testable
- **User Story 3 (P1)**: Can start after Foundational (Phase 2) - Uses US1 components but independently testable
- **User Story 4 (P2)**: Can start after Foundational (Phase 2) - Uses US2 form component but independently testable
- **User Story 5 (P2)**: Can start after Foundational (Phase 2) - Uses US1 components but independently testable
- **User Story 6 (P2)**: Can start after Foundational (Phase 2) - Uses US2 form component but independently testable
- **User Story 7 (P3)**: Can start after Foundational (Phase 2) - Independent utility functions
- **User Story 8 (P2)**: Can start after Foundational (Phase 2) - Uses US1 and US3 components but independently testable
- **User Story 9 (P3)**: Can start after Foundational (Phase 2) - Independent component, integrates with other stories

### Within Each User Story

- Components before pages
- Hooks before components that use them
- Service methods before hooks that use them
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel (T002-T009)
- All Foundational tasks marked [P] can run in parallel (T010-T016, T019-T020)
- Once Foundational phase completes, all user stories can start in parallel (if team capacity allows)
- Components within a story marked [P] can run in parallel
- Different user stories can be worked on in parallel by different team members

---

## Parallel Example: User Story 1

```bash
# Launch all components for User Story 1 together:
Task: "Create StatusBadge component in components/common/StatusBadge.tsx"
Task: "Create InvestigationCard component in components/common/InvestigationCard.tsx"
Task: "Create InvestigationFilters component in components/InvestigationFilters.tsx"

# Then create the hook and page that use them:
Task: "Create useInvestigations hook in hooks/useInvestigations.ts"
Task: "Create InvestigationList component in components/InvestigationList.tsx"
Task: "Create InvestigationsManagementPage component in pages/InvestigationsManagementPage.tsx"
```

---

## Parallel Example: User Story 2

```bash
# Launch form components in parallel:
Task: "Create InvestigationForm component in components/InvestigationForm.tsx"
Task: "Create form field components for sources (chips) in InvestigationForm component"
Task: "Create form field components for tools (chips) in InvestigationForm component"
Task: "Create Modal component wrapper in components/common/Modal.tsx"

# Then create hook and integrate:
Task: "Create useInvestigationForm hook in hooks/useInvestigationForm.ts"
Task: "Add 'New Investigation' button to InvestigationsManagementPage"
```

---

## Implementation Strategy

### MVP First (User Stories 1-3 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (View List)
4. Complete Phase 4: User Story 2 (Create)
5. Complete Phase 5: User Story 3 (View Details)
6. **STOP and VALIDATE**: Test all three stories independently
7. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP Core!)
3. Add User Story 2 → Test independently → Deploy/Demo
4. Add User Story 3 → Test independently → Deploy/Demo
5. Add User Stories 4-6 (P2) → Test independently → Deploy/Demo
6. Add User Stories 7-9 (P3) → Test independently → Deploy/Demo
7. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (View List)
   - Developer B: User Story 2 (Create)
   - Developer C: User Story 3 (View Details)
3. Then:
   - Developer A: User Story 4 (Edit)
   - Developer B: User Story 5 (Delete)
   - Developer C: User Story 6 (Replay)
4. Then:
   - Developer A: User Story 7 (Export/Import)
   - Developer B: User Story 8 (Real-time)
   - Developer C: User Story 9 (Activity Log)
5. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
- All components must be under 200 lines (refactor if needed)
- Use Tailwind CSS only (no Material-UI)
- Match Olorin design system (dark theme, purple accents)

---

## Summary

- **Total Tasks**: 126
- **Setup Tasks**: 9 (Phase 1)
- **Foundational Tasks**: 11 (Phase 2)
- **User Story Tasks**: 89 (Phases 3-11)
  - US1 (P1): 11 tasks
  - US2 (P1): 14 tasks
  - US3 (P1): 12 tasks
  - US4 (P2): 7 tasks
  - US5 (P2): 8 tasks
  - US6 (P2): 7 tasks
  - US7 (P3): 10 tasks
  - US8 (P2): 9 tasks
  - US9 (P3): 11 tasks
- **Polish Tasks**: 17 (Phase 12)
- **Parallel Opportunities**: 45+ tasks marked [P]
- **Suggested MVP Scope**: Phases 1-5 (Setup + Foundational + US1-US3)
- **Independent Test Criteria**: Each user story has clear acceptance scenarios and can be tested independently

