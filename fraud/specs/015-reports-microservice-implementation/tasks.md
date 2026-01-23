# Tasks: Reports Microservice Implementation

**Input**: Design documents from `/specs/001-reports-microservice-implementation/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

**Tests**: Tests are OPTIONAL - not explicitly requested in spec, but integration tests recommended for critical flows.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Frontend**: `olorin-front/src/microservices/reporting/`
- **Backend**: Already complete ✅
- **Tests**: `olorin-front/src/microservices/reporting/__tests__/`

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, dependency installation, and basic structure

- [x] T001 Install frontend dependencies: react-markdown, remark-gfm, react-hot-toast in olorin-front/package.json
- [x] T002 [P] Create types directory structure: olorin-front/src/microservices/reporting/types/reports.ts
- [x] T003 [P] Create utils directory structure: olorin-front/src/microservices/reporting/utils/
- [x] T004 [P] Create widgets directory structure: olorin-front/src/microservices/reporting/components/widgets/
- [x] T005 [P] Create common components directory: olorin-front/src/microservices/reporting/components/common/

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T006 Create TypeScript types matching backend schemas in olorin-front/src/microservices/reporting/types/reports.ts
- [x] T007 [P] Create report service with real API calls (replace mocks) in olorin-front/src/microservices/reporting/services/reportService.ts
- [x] T008 [P] Create useReports hook for report CRUD operations in olorin-front/src/microservices/reporting/hooks/useReports.ts
- [x] T009 [P] Create useWidgetData hook for fetching investigation statistics in olorin-front/src/microservices/reporting/hooks/useWidgetData.ts
- [x] T010 [P] Create markdown parser utility for widget detection in olorin-front/src/microservices/reporting/utils/markdownParser.ts
- [x] T011 [P] Create TOC generator utility in olorin-front/src/microservices/reporting/utils/tocGenerator.ts
- [x] T012 [P] Create keyboard shortcuts utility in olorin-front/src/microservices/reporting/utils/keyboardShortcuts.ts
- [x] T013 Configure react-hot-toast with Olorin theme in olorin-front/src/microservices/reporting/components/common/Toast.tsx

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - View and Browse Reports (Priority: P1) 🎯 MVP

**Goal**: Users can view a list of all reports with filtering and search, and open reports to view content

**Independent Test**: Load reports dashboard, verify reports display in list with title, owner, status, updated date, tags. Search filters list. Status filter works. Clicking report opens viewer.

### Implementation for User Story 1

- [x] T014 [P] [US1] Create StatusBadge component in olorin-front/src/microservices/reporting/components/common/StatusBadge.tsx
- [x] T015 [P] [US1] Create TagChip component in olorin-front/src/microservices/reporting/components/common/TagChip.tsx
- [x] T016 [P] [US1] Create ReportListItem component in olorin-front/src/microservices/reporting/components/ReportListItem.tsx
- [x] T017 [US1] Create ReportList component with search and filters in olorin-front/src/microservices/reporting/components/ReportList.tsx
- [x] T018 [US1] Create ReportViewer component with markdown rendering in olorin-front/src/microservices/reporting/components/ReportViewer.tsx
- [x] T019 [US1] Create ReportContent component for markdown rendering in olorin-front/src/microservices/reporting/components/ReportContent.tsx
- [x] T020 [US1] Create useMarkdownRenderer hook for markdown processing in olorin-front/src/microservices/reporting/hooks/useMarkdownRenderer.ts
- [x] T021 [US1] Integrate keyboard shortcut "/" to focus search in olorin-front/src/microservices/reporting/components/ReportList.tsx
- [x] T022 [US1] Add loading states to ReportList component in olorin-front/src/microservices/reporting/components/ReportList.tsx
- [x] T023 [US1] Add error states to ReportList component in olorin-front/src/microservices/reporting/components/ReportList.tsx
- [x] T024 [US1] Update ReportingApp to use ReportList and ReportViewer in olorin-front/src/microservices/reporting/ReportingApp.tsx

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Create and Edit Reports (Priority: P1) 🎯 MVP

**Goal**: Users can create new reports and edit existing ones using markdown editor

**Independent Test**: Click "New Report" creates draft report and opens editor. Type markdown content. Save with Ctrl/Cmd+S persists changes. Widget templates can be inserted. Edit button opens editor with existing content.

### Implementation for User Story 2

- [x] T025 [P] [US2] Create ReportEditor component with markdown textarea in olorin-front/src/microservices/reporting/components/ReportEditor.tsx
- [x] T026 [P] [US2] Create useReportEditor hook for editor state management in olorin-front/src/microservices/reporting/hooks/useReportEditor.ts
- [x] T027 [US2] Add widget insertion buttons to ReportEditor in olorin-front/src/microservices/reporting/components/ReportEditor.tsx
- [x] T028 [US2] Implement widget template insertion at cursor position in olorin-front/src/microservices/reporting/components/ReportEditor.tsx
- [x] T029 [US2] Add keyboard shortcut Ctrl/Cmd+S to save report in olorin-front/src/microservices/reporting/components/ReportEditor.tsx
- [x] T030 [US2] Add save functionality with API call in olorin-front/src/microservices/reporting/components/ReportEditor.tsx
- [x] T031 [US2] Add toast notification on save success in olorin-front/src/microservices/reporting/components/ReportEditor.tsx
- [x] T032 [US2] Add "New Report" button with keyboard shortcut "N" in olorin-front/src/microservices/reporting/components/ReportList.tsx
- [x] T033 [US2] Add "Edit" button to ReportViewer header in olorin-front/src/microservices/reporting/components/ReportViewer.tsx
- [x] T034 [US2] Integrate editor/viewer toggle in ReportingApp in olorin-front/src/microservices/reporting/ReportingApp.tsx
- [x] T035 [US2] Add validation for empty title before save in olorin-front/src/microservices/reporting/components/ReportEditor.tsx

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Publish and Manage Report Status (Priority: P2)

**Goal**: Users can publish reports and manage their status (Draft, Published, Archived)

**Independent Test**: Create draft report, click "Publish" changes status to Published. Click again changes back to Draft. Change status to Archived filters report from default view.

### Implementation for User Story 3

- [x] T036 [P] [US3] Create ReportHeader component with action buttons in olorin-front/src/microservices/reporting/components/ReportHeader.tsx
- [x] T037 [US3] Implement publish/unpublish functionality in olorin-front/src/microservices/reporting/components/ReportHeader.tsx
- [x] T038 [US3] Add status change API call in olorin-front/src/microservices/reporting/services/reportService.ts
- [x] T039 [US3] Add toast notification on status change in olorin-front/src/microservices/reporting/components/ReportHeader.tsx
- [x] T040 [US3] Update ReportList to filter archived reports from default view in olorin-front/src/microservices/reporting/components/ReportList.tsx
- [x] T041 [US3] Add status dropdown/selector to ReportHeader in olorin-front/src/microservices/reporting/components/ReportHeader.tsx
- [x] T042 [US3] Integrate ReportHeader into ReportViewer in olorin-front/src/microservices/reporting/components/ReportViewer.tsx

**Checkpoint**: At this point, User Stories 1, 2, AND 3 should all work independently

---

## Phase 6: User Story 4 - View Reports with Dynamic Widgets (Priority: P2)

**Goal**: Reports display embedded KPIs, charts, and tables that pull data from investigations

**Independent Test**: Create report with widget placeholders ({{KPI total}}, {{CHART timeseries}}, {{TABLE recent}}). View report and verify widgets render with actual investigation data from backend API.

### Implementation for User Story 4

- [x] T043 [P] [US4] Create KPIWidget component in olorin-front/src/microservices/reporting/components/widgets/KPIWidget.tsx
- [x] T044 [P] [US4] Create ChartWidget component wrapper in olorin-front/src/microservices/reporting/components/widgets/ChartWidget.tsx
- [x] T045 [P] [US4] Create TableWidget component in olorin-front/src/microservices/reporting/components/widgets/TableWidget.tsx
- [x] T046 [US4] Implement widget placeholder detection in markdown parser in olorin-front/src/microservices/reporting/utils/markdownParser.ts
- [x] T047 [US4] Implement widget replacement logic in useMarkdownRenderer hook in olorin-front/src/microservices/reporting/hooks/useMarkdownRenderer.ts
- [x] T048 [US4] Integrate KPIWidget rendering for {{KPI total}}, {{KPI completed}}, {{KPI success}} in olorin-front/src/microservices/reporting/components/widgets/KPIWidget.tsx
- [x] T049 [US4] Integrate ChartWidget with visualization microservice for timeseries chart in olorin-front/src/microservices/reporting/components/widgets/ChartWidget.tsx
- [x] T050 [US4] Integrate ChartWidget with visualization microservice for donut chart (success) in olorin-front/src/microservices/reporting/components/widgets/ChartWidget.tsx
- [x] T051 [US4] Integrate ChartWidget with visualization microservice for horizontal bar chart in olorin-front/src/microservices/reporting/components/widgets/ChartWidget.tsx
- [x] T052 [US4] Create heatmap chart component (SVG-based) in olorin-front/src/microservices/reporting/components/widgets/ChartWidget.tsx
- [x] T053 [US4] Integrate TableWidget for {{TABLE recent}} with investigation data in olorin-front/src/microservices/reporting/components/widgets/TableWidget.tsx
- [x] T054 [US4] Add widget data caching (30 seconds) in useWidgetData hook in olorin-front/src/microservices/reporting/hooks/useWidgetData.ts
- [x] T055 [US4] Add loading states for widgets in olorin-front/src/microservices/reporting/components/widgets/KPIWidget.tsx
- [x] T056 [US4] Add error handling for widget data fetch failures in olorin-front/src/microservices/reporting/hooks/useWidgetData.ts

**Checkpoint**: At this point, User Stories 1-4 should all work independently with widgets rendering

---

## Phase 7: User Story 5 - Share and Export Reports (Priority: P3)

**Goal**: Users can share reports via links and export them to various formats

**Independent Test**: Click "Share" copies shareable URL to clipboard. Open URL in new session loads report directly. Click "Export JSON" downloads JSON file with all reports.

### Implementation for User Story 5

- [x] T057 [P] [US5] Implement share report functionality with URL generation in olorin-front/src/microservices/reporting/components/ReportHeader.tsx
- [x] T058 [US5] Add clipboard copy functionality for share URL in olorin-front/src/microservices/reporting/components/ReportHeader.tsx
- [x] T059 [US5] Add toast notification on share URL copy in olorin-front/src/microservices/reporting/components/ReportHeader.tsx
- [x] T060 [US5] Implement deep linking support (#rid=reportId) in ReportingApp in olorin-front/src/microservices/reporting/ReportingApp.tsx
- [x] T061 [US5] Add "Export JSON" button to ReportList header in olorin-front/src/microservices/reporting/components/ReportList.tsx
- [x] T062 [US5] Implement JSON export functionality in olorin-front/src/microservices/reporting/components/ReportList.tsx
- [x] T063 [US5] Add "Print/PDF" button to ReportHeader in olorin-front/src/microservices/reporting/components/ReportHeader.tsx
- [x] T064 [US5] Implement print functionality (browser print dialog) in olorin-front/src/microservices/reporting/components/ReportHeader.tsx
- [x] T065 [US5] Add print stylesheet for report formatting in olorin-front/src/microservices/reporting/styles/print.css

**Checkpoint**: At this point, User Stories 1-5 should all work independently

---

## Phase 8: User Story 6 - Navigate Reports with Table of Contents (Priority: P3)

**Goal**: Reports with multiple sections display a table of contents for navigation

**Independent Test**: View report with multiple headings. Verify TOC appears in sidebar with all headings. Click heading link scrolls to section. Scroll through report highlights current section in TOC.

### Implementation for User Story 6

- [x] T066 [P] [US6] Create ReportTOC component for table of contents sidebar in olorin-front/src/microservices/reporting/components/ReportTOC.tsx
- [x] T067 [US6] Implement heading extraction from markdown AST in tocGenerator utility in olorin-front/src/microservices/reporting/utils/tocGenerator.ts
- [x] T068 [US6] Generate unique IDs for headings (slugify) in tocGenerator utility in olorin-front/src/microservices/reporting/utils/tocGenerator.ts
- [x] T069 [US6] Add heading IDs to rendered markdown in ReportContent component in olorin-front/src/microservices/reporting/components/ReportContent.tsx
- [x] T070 [US6] Implement smooth scroll to section on TOC link click in olorin-front/src/microservices/reporting/components/ReportTOC.tsx
- [x] T071 [US6] Implement scroll spy to highlight current section in TOC in olorin-front/src/microservices/reporting/components/ReportTOC.tsx
- [x] T072 [US6] Integrate ReportTOC into ReportViewer sidebar in olorin-front/src/microservices/reporting/components/ReportViewer.tsx
- [x] T073 [US6] Add responsive behavior (hide TOC on mobile) in olorin-front/src/microservices/reporting/components/ReportViewer.tsx

**Checkpoint**: At this point, all User Stories 1-6 should work independently

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T074 [P] Apply Olorin dark purple theme to all components (background #0b0b12, panels #11111a, primary #8b5cf6) across all component files
- [x] T075 [P] Add responsive layout (grid collapses to single column on mobile) in olorin-front/src/microservices/reporting/components/ReportList.tsx
- [x] T076 [P] Add responsive layout for ReportViewer (mobile optimization) in olorin-front/src/microservices/reporting/components/ReportViewer.tsx
- [x] T077 Add tab-based filtering (All, My Reports, Drafts, Published, Archived) to ReportList in olorin-front/src/microservices/reporting/components/ReportList.tsx
- [x] T078 Add tag display and management to ReportEditor in olorin-front/src/microservices/reporting/components/ReportEditor.tsx
- [x] T079 Add tag filtering support to ReportList in olorin-front/src/microservices/reporting/components/ReportList.tsx
- [x] T080 Add delete report functionality with confirmation dialog in olorin-front/src/microservices/reporting/components/ReportList.tsx
- [x] T081 Add delete keyboard shortcut (Delete key) in ReportList in olorin-front/src/microservices/reporting/components/ReportList.tsx
- [x] T082 Add "Present" button (fullscreen mode) to ReportHeader in olorin-front/src/microservices/reporting/components/ReportHeader.tsx
- [x] T083 Add error boundary for report components in olorin-front/src/microservices/reporting/components/ErrorBoundary.tsx
- [x] T084 Verify all files are under 200 lines and refactor if needed
- [ ] T085 Run quickstart.md validation steps to verify all user stories work
- [x] T086 Add accessibility attributes (ARIA labels, keyboard navigation) to all interactive components
- [x] T087 Verify no mocks/stubs/TODOs exist in production code (scan all files)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-8)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Phase 9)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 3 (P2)**: Can start after Foundational (Phase 2) - Uses components from US1/US2 but independently testable
- **User Story 4 (P2)**: Can start after Foundational (Phase 2) - Uses components from US1/US2 but independently testable
- **User Story 5 (P3)**: Can start after Foundational (Phase 2) - Uses components from US1/US2 but independently testable
- **User Story 6 (P3)**: Can start after Foundational (Phase 2) - Uses components from US1/US2 but independently testable

### Within Each User Story

- Models/types before services
- Services before components
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- Once Foundational phase completes, all user stories can start in parallel (if team capacity allows)
- Components within a story marked [P] can run in parallel
- Different user stories can be worked on in parallel by different team members

---

## Parallel Example: User Story 1

```bash
# Launch all component creation tasks for User Story 1 together:
Task: "Create StatusBadge component in olorin-front/src/microservices/reporting/components/common/StatusBadge.tsx"
Task: "Create TagChip component in olorin-front/src/microservices/reporting/components/common/TagChip.tsx"
Task: "Create ReportListItem component in olorin-front/src/microservices/reporting/components/ReportListItem.tsx"
```

## Parallel Example: User Story 4

```bash
# Launch all widget component creation tasks together:
Task: "Create KPIWidget component in olorin-front/src/microservices/reporting/components/widgets/KPIWidget.tsx"
Task: "Create ChartWidget component wrapper in olorin-front/src/microservices/reporting/components/widgets/ChartWidget.tsx"
Task: "Create TableWidget component in olorin-front/src/microservices/reporting/components/widgets/TableWidget.tsx"
```

---

## Implementation Strategy

### MVP First (User Stories 1 & 2 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (View and Browse)
4. Complete Phase 4: User Story 2 (Create and Edit)
5. **STOP and VALIDATE**: Test User Stories 1 & 2 independently
6. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (Basic MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo (Full MVP!)
4. Add User Story 3 → Test independently → Deploy/Demo
5. Add User Story 4 → Test independently → Deploy/Demo
6. Add User Story 5 → Test independently → Deploy/Demo
7. Add User Story 6 → Test independently → Deploy/Demo
8. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (View/Browse)
   - Developer B: User Story 2 (Create/Edit)
   - Developer C: User Story 4 (Widgets) - can start in parallel
3. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Backend is already complete - all tasks are frontend only
- Verify no mocks/stubs/TODOs exist in production code
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- All files must be <200 lines - refactor if needed
- Use Olorin dark purple theme consistently
- Match reference HTML design (olorin-reports.html) exactly

---

## Task Summary

**Total Tasks**: 87
**Tasks by Phase**:
- Phase 1 (Setup): 5 tasks
- Phase 2 (Foundational): 8 tasks
- Phase 3 (US1 - View/Browse): 11 tasks
- Phase 4 (US2 - Create/Edit): 11 tasks
- Phase 5 (US3 - Publish/Status): 7 tasks
- Phase 6 (US4 - Widgets): 14 tasks
- Phase 7 (US5 - Share/Export): 9 tasks
- Phase 8 (US6 - TOC): 8 tasks
- Phase 9 (Polish): 14 tasks

**Parallel Opportunities**: 35+ tasks marked [P] can run in parallel

**Independent Test Criteria**:
- US1: Load dashboard, see reports, search/filter works, click opens viewer
- US2: Create report, edit markdown, save persists, widgets insertable
- US3: Publish/unpublish works, status changes, archived filtered
- US4: Widgets render with real data, charts display correctly
- US5: Share URL copies, deep link works, export downloads JSON
- US6: TOC generates, links scroll, scroll spy highlights

**Suggested MVP Scope**: User Stories 1 & 2 (Phases 3-4) - Basic report viewing and editing

