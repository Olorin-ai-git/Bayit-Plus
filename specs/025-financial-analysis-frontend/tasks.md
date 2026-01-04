# Tasks: Financial Analysis Frontend Integration

**Input**: Design documents from `/specs/025-financial-analysis-frontend/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Not explicitly requested - implementation tasks only.

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

- **Backend**: `olorin-server/app/`
- **Frontend**: `olorin-front/src/microservices/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Backend API and shared frontend types/utilities needed by all user stories

- [X] T001 Create financial router file at olorin-server/app/router/financial_router.py
- [X] T002 Create API response schemas at olorin-server/app/schemas/financial_response.py
- [X] T003 Register financial router in olorin-server/app/service/router/router_config.py
- [X] T004 [P] Create TypeScript types at olorin-front/src/microservices/investigation/types/financialMetrics.ts
- [X] T005 [P] Create API types at olorin-front/src/microservices/investigation/types/financialApiTypes.ts
- [X] T006 [P] Create currency formatter utility at olorin-front/src/microservices/investigation/utils/currencyFormatter.ts
- [X] T007 [P] Create financial config schema at olorin-front/src/microservices/investigation/config/financialConfig.ts
- [X] T008 Add financial feature environment variables to olorin-front/.env.example

---

## Phase 2: Foundational (Backend API Endpoints)

**Purpose**: Backend endpoints that MUST be complete before ANY frontend user story

**CRITICAL**: No frontend work can begin until this phase is complete

- [X] T009 Implement GET /api/v1/financial/{investigation_id}/metrics endpoint in olorin-server/app/router/financial_router.py
- [X] T010 Implement GET /api/v1/financial/summary endpoint for aggregated metrics in olorin-server/app/router/financial_router.py
- [X] T011 Add endpoint integration with existing RevenueCalculator service in olorin-server/app/router/financial_router.py
- [X] T012 Add endpoint integration with existing ConfusionMatrix service in olorin-server/app/router/financial_router.py
- [X] T013 Verify backend endpoints work via curl commands per quickstart.md

**Checkpoint**: Backend API ready - frontend implementation can now begin

---

## Phase 3: User Story 1 - View Financial Impact on Investigations List (Priority: P1)

**Goal**: Display Saved Fraud GMV, Lost Revenues, Net Value columns in parallel investigations table with aggregated summary panel

**Independent Test**: View `/parallel` page and verify completed investigations display financial columns with currency values; summary panel shows totals above table

### Implementation for User Story 1

- [X] T014 [P] [US1] Create CurrencyDisplay component at olorin-front/src/microservices/investigation/components/financial/CurrencyDisplay.tsx
- [X] T015 [P] [US1] Create NetValueCell component (green/red color-coded) at olorin-front/src/microservices/investigation/components/financial/NetValueCell.tsx
- [X] T016 [P] [US1] Create FinancialSummaryPanel component at olorin-front/src/microservices/investigation/components/financial/FinancialSummaryPanel.tsx
- [X] T017 [P] [US1] Create component index export at olorin-front/src/microservices/investigation/components/financial/index.ts
- [X] T018 [US1] Create useFinancialMetrics hook at olorin-front/src/microservices/investigation/hooks/useFinancialMetrics.ts
- [X] T019 [US1] Create useFinancialSummary hook at olorin-front/src/microservices/investigation/hooks/useFinancialSummary.ts
- [X] T020 [US1] Extend ParallelInvestigation interface with financialMetrics in olorin-front/src/microservices/investigation/types/parallelInvestigations.ts
- [X] T021 [US1] Add Saved GMV column to table in olorin-front/src/microservices/investigation/pages/ParallelInvestigationsPage.tsx
- [X] T022 [US1] Add Lost Revenues column to table in olorin-front/src/microservices/investigation/pages/ParallelInvestigationsPage.tsx
- [X] T023 [US1] Add Net Value column (color-coded) to table in olorin-front/src/microservices/investigation/pages/ParallelInvestigationsPage.tsx
- [X] T024 [US1] Add FinancialSummaryPanel above table in olorin-front/src/microservices/investigation/pages/ParallelInvestigationsPage.tsx
- [X] T025 [US1] Handle loading/error/empty states for financial data in ParallelInvestigationsPage.tsx

**Checkpoint**: User Story 1 complete - financial metrics visible in investigations table with summary panel

---

## Phase 4: User Story 2 - View Confusion Matrix Metrics (Priority: P2)

**Goal**: Display TP/FP counts and Precision percentage in investigations table with tooltip for full breakdown

**Independent Test**: View `/parallel` page and verify completed investigations show TP/FP, Precision columns; clicking shows full matrix tooltip

### Implementation for User Story 2

- [ ] T026 [P] [US2] Create ConfusionMetricsCell component at olorin-front/src/microservices/investigation/components/financial/ConfusionMetricsCell.tsx
- [ ] T027 [P] [US2] Create ConfusionMatrixTooltip component at olorin-front/src/microservices/investigation/components/financial/ConfusionMatrixTooltip.tsx
- [ ] T028 [US2] Extend ParallelInvestigation interface with confusionMetrics in olorin-front/src/microservices/investigation/types/parallelInvestigations.ts
- [ ] T029 [US2] Add TP/FP column to table in olorin-front/src/microservices/investigation/pages/ParallelInvestigationsPage.tsx
- [ ] T030 [US2] Add Precision column to table in olorin-front/src/microservices/investigation/pages/ParallelInvestigationsPage.tsx
- [ ] T031 [US2] Update FinancialSummaryPanel to include avgPrecision in olorin-front/src/microservices/investigation/components/financial/FinancialSummaryPanel.tsx
- [ ] T032 [US2] Update component index export at olorin-front/src/microservices/investigation/components/financial/index.ts

**Checkpoint**: User Story 2 complete - confusion metrics visible in table with tooltips

---

## Phase 5: User Story 3 - Financial Analysis Dashboard (Priority: P3)

**Goal**: Dedicated dashboard at `/financial-analysis` with aggregated KPIs, charts, and investigation list

**Independent Test**: Navigate to `/financial-analysis` and verify dashboard loads with KPI cards, revenue chart, and investigation list

### Microservice Setup for User Story 3

- [ ] T033 [US3] Create financial-analysis microservice directory at olorin-front/src/microservices/financial-analysis/
- [ ] T034 [P] [US3] Create entry point at olorin-front/src/microservices/financial-analysis/index.tsx
- [ ] T035 [P] [US3] Create bootstrap file at olorin-front/src/microservices/financial-analysis/bootstrap.tsx
- [ ] T036 [P] [US3] Create webpack config at olorin-front/src/microservices/financial-analysis/config/webpack.config.js
- [ ] T037 [US3] Add start:financial-analysis script to olorin-front/package.json
- [ ] T038 [US3] Add financial-analysis remote to shell webpack config

### Dashboard Components for User Story 3

- [ ] T039 [P] [US3] Create FinancialOverview component at olorin-front/src/microservices/financial-analysis/components/dashboard/FinancialOverview.tsx
- [ ] T040 [P] [US3] Create RevenueImpactChart component at olorin-front/src/microservices/financial-analysis/components/dashboard/RevenueImpactChart.tsx
- [ ] T041 [P] [US3] Create ConfusionMatrixDisplay component at olorin-front/src/microservices/financial-analysis/components/dashboard/ConfusionMatrixDisplay.tsx
- [ ] T042 [P] [US3] Create MerchantBreakdown component at olorin-front/src/microservices/financial-analysis/components/dashboard/MerchantBreakdown.tsx

### Dashboard Page for User Story 3

- [ ] T043 [US3] Create useFinancialDashboard hook at olorin-front/src/microservices/financial-analysis/hooks/useFinancialDashboard.ts
- [ ] T044 [US3] Create financialAnalysisService at olorin-front/src/microservices/financial-analysis/services/financialAnalysisService.ts
- [ ] T045 [US3] Create FinancialDashboardPage at olorin-front/src/microservices/financial-analysis/pages/FinancialDashboardPage.tsx
- [ ] T046 [US3] Create routes file at olorin-front/src/microservices/financial-analysis/routes.tsx
- [ ] T047 [US3] Add navigation link to financial dashboard in shell app navigation

**Checkpoint**: User Story 3 complete - financial dashboard accessible at /financial-analysis

---

## Phase 6: User Story 4 - Per-Investigation Financial Detail Page (Priority: P4)

**Goal**: Detailed breakdown page at `/financial-analysis/investigation/{id}` showing methodology, calculations, transaction samples

**Independent Test**: Navigate to `/financial-analysis/investigation/{id}` and verify breakdown components render with calculation details

### Detail Components for User Story 4

- [ ] T048 [P] [US4] Create RevenueBreakdown component at olorin-front/src/microservices/financial-analysis/components/investigation/RevenueBreakdown.tsx
- [ ] T049 [P] [US4] Create TransactionSamples component at olorin-front/src/microservices/financial-analysis/components/investigation/TransactionSamples.tsx
- [ ] T050 [P] [US4] Create MethodologyExplanation component at olorin-front/src/microservices/financial-analysis/components/investigation/MethodologyExplanation.tsx
- [ ] T051 [P] [US4] Create ConfidenceBadge component at olorin-front/src/microservices/financial-analysis/components/common/ConfidenceBadge.tsx

### Detail Page for User Story 4

- [ ] T052 [US4] Create useInvestigationFinancials hook at olorin-front/src/microservices/financial-analysis/hooks/useInvestigationFinancials.ts
- [ ] T053 [US4] Create InvestigationFinancialDetail component at olorin-front/src/microservices/financial-analysis/components/investigation/InvestigationFinancialDetail.tsx
- [ ] T054 [US4] Create InvestigationFinancialPage at olorin-front/src/microservices/financial-analysis/pages/InvestigationFinancialPage.tsx
- [ ] T055 [US4] Add route for /financial-analysis/:id in olorin-front/src/microservices/financial-analysis/routes.tsx
- [ ] T056 [US4] Add navigation from dashboard to detail page (click handler on investigation rows)

**Checkpoint**: User Story 4 complete - detailed financial breakdown accessible per investigation

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements affecting multiple user stories

- [ ] T057 [P] Verify all component files are under 200 lines per frontend requirements
- [ ] T058 [P] Ensure all components use Tailwind CSS only (no Material-UI)
- [ ] T059 [P] Verify currency formatting is consistent across all views
- [ ] T060 Add skipped prediction status indicator per FR-011 in NetValueCell component
- [ ] T061 Implement error state with retry option per edge case requirements
- [ ] T062 Run quickstart.md verification steps to validate end-to-end flow
- [ ] T063 [P] Verify all configuration values come from environment variables

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all frontend work
- **User Stories (Phase 3-6)**: All depend on Foundational phase completion
  - User stories can proceed in parallel or sequentially by priority
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Shares components with US1 but independently testable
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - New microservice, no dependencies on US1/US2
- **User Story 4 (P4)**: Depends on US3 (microservice structure) - Can test independently once microservice exists

### Within Each User Story

- Components marked [P] can be created in parallel
- Hooks before page integration
- Components before page integration
- Core implementation before polish

### Parallel Opportunities

- T004, T005, T006, T007 can all run in parallel (Phase 1)
- T014, T015, T016, T017 can all run in parallel (US1 components)
- T026, T027 can run in parallel (US2 components)
- T034, T035, T036 can run in parallel (US3 microservice setup)
- T039, T040, T041, T042 can run in parallel (US3 dashboard components)
- T048, T049, T050, T051 can run in parallel (US4 detail components)
- All user stories can be worked on in parallel by different developers

---

## Parallel Example: User Story 1

```bash
# Launch all components for User Story 1 together:
Task: "Create CurrencyDisplay component at olorin-front/src/microservices/investigation/components/financial/CurrencyDisplay.tsx"
Task: "Create NetValueCell component at olorin-front/src/microservices/investigation/components/financial/NetValueCell.tsx"
Task: "Create FinancialSummaryPanel component at olorin-front/src/microservices/investigation/components/financial/FinancialSummaryPanel.tsx"
Task: "Create component index export at olorin-front/src/microservices/investigation/components/financial/index.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (backend schemas, frontend types)
2. Complete Phase 2: Foundational (backend API endpoints)
3. Complete Phase 3: User Story 1 (financial columns in table)
4. **STOP and VALIDATE**: Test financial metrics display at `/parallel`
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Backend API ready
2. Add User Story 1 → Financial columns in table → Deploy (MVP!)
3. Add User Story 2 → Confusion metrics → Deploy
4. Add User Story 3 → Dashboard microservice → Deploy
5. Add User Story 4 → Detail page → Deploy
6. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (table columns)
   - Developer B: User Story 2 (confusion metrics)
   - Developer C: User Story 3 + 4 (new microservice)
3. Stories complete and integrate independently

---

## Summary

| Phase | Tasks | Parallel Opportunities |
|-------|-------|----------------------|
| Phase 1: Setup | 8 tasks | 4 parallel (T004-T007) |
| Phase 2: Foundational | 5 tasks | Sequential |
| Phase 3: US1 | 12 tasks | 4 parallel (T014-T017) |
| Phase 4: US2 | 7 tasks | 2 parallel (T026-T027) |
| Phase 5: US3 | 15 tasks | 7 parallel (components) |
| Phase 6: US4 | 9 tasks | 4 parallel (T048-T051) |
| Phase 7: Polish | 7 tasks | 4 parallel |
| **Total** | **63 tasks** | **25 parallel opportunities** |

### MVP Scope

- **Minimum**: Phase 1 + Phase 2 + Phase 3 (User Story 1) = 25 tasks
- **Recommended**: Add Phase 4 (User Story 2) = 32 tasks

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- All files must be under 200 lines
- Use Tailwind CSS only - no Material-UI
- All configuration from environment variables
