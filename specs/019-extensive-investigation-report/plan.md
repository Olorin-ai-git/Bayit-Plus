# Implementation Plan: Extensive Investigation Report

**Branch**: `001-extensive-investigation-report` | **Date**: 2025-01-11 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-extensive-investigation-report/spec.md`

## Summary

This feature integrates the existing backend comprehensive investigation report generation system (~160KB of code with 7 specialized components) with the frontend Reports Microservice to enable one-click generation of full investigation reports including risk scores, LLM thought processes, agent analysis, and interactive visualizations. This unlocks already-built backend reporting infrastructure to provide stakeholders with complete visibility into fraud detection investigations without requiring new backend development.

**Technical Approach**: Create REST API layer to expose existing report generators, implement frontend report viewer with 7 specialized section components, integrate with Reports Microservice navigation, add background job processing for async report generation, and implement automatic generation triggered by investigation completion events.

## Technical Context

**Language/Version**: Python 3.11 (backend), TypeScript 5.x (frontend)
**Primary Dependencies**: FastAPI, SQLAlchemy, Alembic, Pydantic (backend); React 18, TypeScript, Tailwind CSS, Chart.js, Mermaid.js (frontend)
**Storage**: PostgreSQL for report metadata and content; Investigation folders on filesystem for source data
**Testing**: pytest with 87%+ coverage (backend); Jest, React Testing Library with 85%+ coverage (frontend); Playwright for E2E tests
**Target Platform**: Linux server (backend); Modern web browsers (Chrome, Firefox, Safari, Edge) for frontend
**Project Type**: Web application (fullstack)
**Performance Goals**: Report generation <5s for typical investigation (100 activities); Report viewer loads <3s; Reports library lists 100+ reports <2s
**Constraints**: All files <200 lines; No hardcoded values; No mocks/stubs/TODOs in production code; Schema-locked (no DDL changes); Tailwind CSS only (no Material-UI)
**Scale/Scope**: ~100 investigations per month; Reports average 2-7MB; 5-year retention (~30GB with compression)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Since the constitution file is a template placeholder, applying standard Olorin development principles:

### Constitutional Gates

✅ **No Hardcoded Values**: All configuration via environment variables
- Report timeouts, file paths, storage locations, PDF library choice, retry settings all configurable

✅ **No Mocks/Stubs/TODOs**: Complete implementations only
- Leverages 160KB of existing backend report generation code
- No placeholders or incomplete implementations

✅ **File Size <200 Lines**: All components modular
- Report viewer split into 7 section components
- Service layer methods focused and single-purpose
- Backend routers, services, models properly separated

✅ **Schema-Locked**: No DDL operations
- New tables created via Alembic migrations only
- No runtime schema modifications
- All columns validated against schema manifest

✅ **Test Coverage**: 87%+ backend, 85%+ frontend
- Comprehensive unit tests for all services
- Integration tests for API endpoints
- E2E tests for complete workflows

✅ **Tailwind CSS Only**: No Material-UI
- All frontend components use Tailwind CSS
- Headless UI for interactive components
- Olorin design system colors and typography

### Complexity Justification

**No violations requiring justification** - This feature integrates existing capabilities without adding architectural complexity.

## Project Structure

### Documentation (this feature)

```text
specs/001-extensive-investigation-report/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output - Technical research and codebase analysis
├── data-model.md        # Phase 1 output - Database schemas and TypeScript types
├── quickstart.md        # Phase 1 output - Developer quick start guide
├── contracts/           # Phase 1 output - API contracts and examples
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
olorin-server/ (Backend)
├── app/
│   ├── models/
│   │   ├── investigation_report.py              # NEW: Report model
│   │   ├── investigation_report_section.py      # NEW: Section model
│   │   └── report_generation_job.py             # NEW: Job model
│   ├── schemas/
│   │   ├── investigation_report.py              # NEW: Pydantic schemas
│   │   ├── investigation_report_section.py      # NEW: Section schemas
│   │   └── report_generation_job.py             # NEW: Job schemas
│   ├── service/
│   │   ├── reporting/                           # EXISTING: 160KB report generators
│   │   │   ├── comprehensive_investigation_report.py
│   │   │   ├── enhanced_html_generator/
│   │   │   ├── components/
│   │   │   └── unified/
│   │   ├── investigation_report_service.py      # NEW: Service layer
│   │   ├── investigation_folder_parser.py       # NEW: Folder parser
│   │   ├── report_generation_job_service.py     # NEW: Job service
│   │   └── pdf_export_service.py                # NEW: PDF generation
│   ├── routers/
│   │   └── investigation_reports.py             # NEW: API router
│   ├── events/
│   │   └── investigation_event_handler.py       # NEW: Event listener
│   └── workers/
│       └── report_generation_worker.py          # NEW: Background worker
├── alembic/versions/
│   └── xxx_add_investigation_reports.py         # NEW: Migration
└── test/
    ├── unit/
    │   ├── service/test_investigation_report_service.py
    │   ├── routers/test_investigation_reports.py
    │   └── models/test_investigation_report.py
    ├── integration/
    │   └── routers/test_investigation_reports_api.py
    └── fixtures/
        └── investigation_folders.py

olorin-front/ (Frontend)
├── src/
│   ├── microservices/reporting/
│   │   ├── types/
│   │   │   ├── investigation-reports.ts         # NEW: TypeScript types
│   │   │   ├── risk-score.ts                    # NEW: Risk types
│   │   │   └── agent-metrics.ts                 # NEW: Metrics types
│   │   ├── services/
│   │   │   └── investigation-reports.service.ts # NEW: API service
│   │   ├── hooks/
│   │   │   └── useInvestigationReports.ts       # NEW: React hook
│   │   └── components/investigation/
│   │       ├── InvestigationReportViewer.tsx    # NEW: Main viewer
│   │       ├── InvestigationReportsList.tsx     # NEW: Library list
│   │       ├── InvestigationReportListItem.tsx  # NEW: List item
│   │       ├── InvestigationReportHeader.tsx    # NEW: Header actions
│   │       ├── ReportTableOfContents.tsx        # NEW: TOC navigation
│   │       ├── ReportFilters.tsx                # NEW: Search/filter
│   │       ├── ReportSearchBar.tsx              # NEW: Search input
│   │       ├── RiskScoreBadge.tsx               # NEW: Risk badge
│   │       ├── sections/
│   │       │   ├── ExecutiveSummary.tsx         # NEW: Section 1
│   │       │   ├── RiskDashboard.tsx            # NEW: Section 2
│   │       │   ├── LLMTimeline.tsx              # NEW: Section 3
│   │       │   ├── InvestigationFlowGraph.tsx   # NEW: Section 4
│   │       │   ├── AgentExplanations.tsx        # NEW: Section 5
│   │       │   ├── ToolsAnalysis.tsx            # NEW: Section 6
│   │       │   └── JourneyVisualization.tsx     # NEW: Section 7
│   │       ├── charts/
│   │       │   ├── RiskProgressionChart.tsx     # NEW: Chart component
│   │       │   └── RiskCategoryChart.tsx        # NEW: Chart component
│   │       ├── Timeline.tsx                     # NEW: Timeline component
│   │       ├── MermaidDiagram.tsx               # NEW: Mermaid wrapper
│   │       ├── ThoughtProcess.tsx               # NEW: Reasoning display
│   │       ├── MetricsTable.tsx                 # NEW: Metrics table
│   │       └── ProgressTimeline.tsx             # NEW: Progress display
│   ├── components/                              # EXISTING
│   │   └── InvestigationDetails.tsx             # MODIFIED: Add report button
│   └── shell/Router.tsx                         # MODIFIED: Add routes
└── tests/
    ├── unit/
    │   └── microservices/reporting/components/investigation/
    │       ├── InvestigationReportViewer.test.tsx
    │       ├── InvestigationReportsList.test.tsx
    │       └── ReportFilters.test.tsx
    └── e2e/
        └── investigation-reports.spec.ts

shared/
└── docs/
    ├── plans/
    │   └── 2025-01-11-investigation-reports-plan.md
    └── diagrams/
        └── investigation-reports-architecture.html
```

**Structure Decision**: Web application structure (Option 2) selected because this feature spans both backend API layer (Python/FastAPI) and frontend viewer (React/TypeScript). The backend exposes report generation via REST API, while the frontend provides comprehensive report viewing and management UI.

## Complexity Tracking

> **No violations to track** - This implementation follows all constitutional principles.

No complexity violations detected. The implementation:
- Uses existing backend infrastructure (160KB report generators)
- Follows established patterns in Reports Microservice
- Maintains file size limits through modular design
- Externalizes all configuration
- Achieves required test coverage
- Adheres to schema-locked constraints

---

## Progress Tracking

### Phase 0: Research & Analysis ✅
**Status**: Complete
**Artifacts**: `research.md`
**Output**: Technical research, codebase analysis, existing capabilities assessment

### Phase 1: Design & Contracts ⏳
**Status**: Pending
**Artifacts**: `data-model.md`, `contracts/`, `quickstart.md`
**Output**: Database schemas, API contracts, implementation guide

### Phase 2: Task Breakdown ⏳
**Status**: Pending (requires Phase 1 completion)
**Artifacts**: `tasks.md`
**Output**: Detailed task list with dependencies (via /speckit.tasks command)

### Phase 3: Implementation ⏳
**Status**: Pending (requires Phase 2 completion)
**Output**: Working feature code in feature branch

### Phase 4: Testing & Validation ⏳
**Status**: Pending (requires Phase 3 completion)
**Output**: Test suite with 87%+ backend, 85%+ frontend coverage

### Phase 5: Documentation ⏳
**Status**: Pending (requires Phase 4 completion)
**Output**: User guides, developer docs, API documentation

---

## Implementation Phases

### Phase 0: Research & Analysis (COMPLETE)

**Objective**: Understand existing capabilities, identify gaps, analyze technical approach.

**Key Findings**:
- ✅ Backend has comprehensive report generator with 7 components (~160KB code)
- ✅ Frontend has Reports Microservice infrastructure
- ❌ GAP: No API layer connecting backend generators to frontend
- ❌ GAP: No database persistence for generated reports
- ❌ GAP: No frontend viewer for investigation reports

**Dependencies Identified**:
- Existing: `app/service/reporting/comprehensive_investigation_report.py`
- Existing: Reports Microservice in `src/microservices/reporting/`
- Required: PostgreSQL tables for report storage
- Required: API endpoints for report CRUD operations
- Required: Frontend components for report viewing

---

### Phase 1: Design & Contracts (CURRENT)

**Objective**: Design database schemas, API contracts, and data models.

**Deliverables**:
1. **data-model.md**: Complete database schema with:
   - `investigation_reports` table (main report storage)
   - `investigation_report_sections` table (individual sections)
   - `report_generation_jobs` table (background jobs)
   - Pydantic schemas for request/response
   - TypeScript interfaces matching backend
   - Data flow diagrams
   - Validation rules

2. **contracts/**: API contract definitions:
   - `report-generation.json`: POST generate endpoint
   - `report-retrieval.json`: GET report endpoint
   - `report-list.json`: GET reports list endpoint
   - `section-retrieval.json`: GET section endpoint
   - `pdf-export.json`: POST PDF export endpoint
   - `job-status.json`: GET job status endpoint

3. **quickstart.md**: Developer quick start:
   - Local setup instructions
   - Running report generation locally
   - Testing report viewer
   - Debugging tips
   - Common issues and solutions

**Dependencies**: Phase 0 complete

**Next Steps**: Generate artifacts listed above

---

### Phase 2: Task Breakdown

**Objective**: Create detailed task list with effort estimates, dependencies, and acceptance criteria.

**Process**: Run `/speckit.tasks` command to generate `tasks.md` from completed Phase 1 artifacts.

**Expected Output**:
- 60+ tasks organized into 8 implementation phases
- Backend tasks (models, schemas, services, API, jobs, tests)
- Frontend tasks (types, services, hooks, components, sections, charts, tests)
- Integration tasks (investigation page, reports tab, deep linking)
- Quality tasks (E2E tests, performance testing, security audit)
- Documentation tasks (user guides, developer docs, demos)

**Dependencies**: Phase 1 complete

---

### Phase 3-5: Implementation, Testing, Documentation

**Objective**: Build, test, and document the feature.

**Phases**:
- **Phase 3**: Implementation following task breakdown
- **Phase 4**: Comprehensive testing (unit, integration, E2E)
- **Phase 5**: User and developer documentation

**Dependencies**: Phase 2 complete

---

## Next Steps

1. ✅ **Phase 0 Complete**: Research and gap analysis documented
2. ⏳ **Phase 1 In Progress**: Generate design artifacts:
   - Create `data-model.md` with complete database schemas
   - Create `contracts/` directory with API contract files
   - Create `quickstart.md` with developer setup guide
3. ⏳ **Phase 2 Queued**: Run `/speckit.tasks` to generate task breakdown
4. ⏳ **Phase 3 Queued**: Create feature branch and begin implementation
5. ⏳ **Phase 4 Queued**: Write comprehensive test suite
6. ⏳ **Phase 5 Queued**: Create user and developer documentation

---

**Plan Status**: In Progress - Phase 1 (Design & Contracts)
**Last Updated**: 2025-01-11
**Next Milestone**: Complete Phase 1 artifacts (data-model.md, contracts/, quickstart.md)
