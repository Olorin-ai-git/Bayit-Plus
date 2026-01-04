# Implementation Plan: Reports Microservice Implementation

**Branch**: `001-reports-microservice-implementation` | **Date**: 2025-01-09 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-reports-microservice-implementation/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → ✅ Feature spec loaded successfully
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → ✅ Project Type: Web application (frontend+backend)
   → ✅ Structure Decision: Microservice architecture (reports microservice)
   → ✅ Backend implementation already complete
3. Fill the Constitution Check section based on the content of the constitution document.
   → ✅ Constitution template found (not customized for project)
4. Evaluate Constitution Check section below
   → ✅ No constitutional violations identified
   → ✅ Update Progress Tracking: Initial Constitution Check
5. Execute Phase 0 → research.md
   → ✅ Research complete (all technical decisions resolved)
6. Execute Phase 1 → contracts, data-model.md, quickstart.md
   → ✅ Complete
7. Re-evaluate Constitution Check section
   → ✅ Post-design constitutional compliance verified
   → ✅ Update Progress Tracking: Post-Design Constitution Check
8. Plan Phase 2 → Describe task generation approach
   → ✅ Complete
9. STOP - Ready for /tasks command
```

## Summary

Create a fully functional reports microservice with complete UI and backend implementation. The backend is already implemented with database models, API endpoints, and service layer. The frontend needs to be built to match the reference HTML design (`olorin-reports.html`) with Olorin dark purple theme, markdown editing/viewing, dynamic widgets (KPIs, charts, tables), report management (create, edit, publish, share, export), and full integration with existing investigation data APIs.

## Technical Context

**Language/Version**: 
- Backend: Python 3.11+, FastAPI
- Frontend: TypeScript 4.9.5, React 18.2.0, Node.js 18+

**Primary Dependencies**: 
- Backend: FastAPI, SQLAlchemy, Pydantic (already implemented)
- Frontend: React, TypeScript, Tailwind CSS, react-markdown or marked, Chart.js/D3.js (via visualization microservice), react-hot-toast

**Storage**: 
- Backend: SQLite/PostgreSQL via SQLAlchemy (ReportRecord model in `app/persistence/models.py`)
- Frontend: React state, API calls to backend (no localStorage)

**Testing**: 
- Backend: pytest (existing test infrastructure)
- Frontend: Jest, React Testing Library, Playwright for E2E

**Target Platform**: Modern browsers (Chrome 90+, Firefox 88+, Safari 14+)

**Project Type**: web - Frontend microservice with existing backend API

**Performance Goals**: 
- Report list loads 100+ reports in <2 seconds
- Markdown editor responds in <100ms
- Widget rendering completes in <3 seconds
- Report creation/save in <5 seconds

**Constraints**: 
- All files <200 lines
- No mocks/stubs/TODOs in production code
- Use Olorin dark purple theme (#0b0b12 background, #8b5cf6 primary)
- Match reference HTML design exactly
- Use existing visualization microservice for charts
- Integrate with existing investigation APIs

**Scale/Scope**: 
- 6 user stories (P1-P3 priorities)
- 30 functional requirements
- 10 success criteria
- Frontend: ~15-20 component files, 1 service file, hooks, types

**Backend Status**: ✅ COMPLETE
- Database model: `ReportRecord` in `app/persistence/models.py`
- API schemas: `app/schemas/report_schemas.py`
- Service layer: `app/service/report_service.py`
- Router: `app/router/reports_router.py` (registered in router_config.py)
- Endpoints: CRUD, publish, share, export, statistics

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Status**: ✅ PASS - No constitutional violations detected

The constitution template is present but not customized for this project. Based on typical development principles:
- ✅ Component-based architecture (React microservice)
- ✅ Separation of concerns (service layer, API layer, UI layer)
- ✅ Testability through isolated components and API tests
- ✅ Performance-focused design (lazy loading, efficient rendering)
- ✅ Accessibility compliance required
- ✅ Design consistency through Olorin theme system
- ✅ No code duplication (reuse existing visualization microservice)
- ✅ Complete implementations only (no mocks/stubs)

## Project Structure

### Documentation (this feature)

```text
specs/001-reports-microservice-implementation/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── reports-api.yaml
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)

```text
# Web application - Reports Microservice
olorin-server/app/
├── persistence/models.py          # ✅ ReportRecord model (COMPLETE)
├── schemas/report_schemas.py      # ✅ API schemas (COMPLETE)
├── service/report_service.py      # ✅ Service layer (COMPLETE)
└── router/reports_router.py       # ✅ API router (COMPLETE)

olorin-front/src/microservices/reporting/
├── components/
│   ├── ReportList.tsx             # Report list with filtering/search
│   ├── ReportViewer.tsx           # Report viewer with markdown + TOC
│   ├── ReportEditor.tsx           # Markdown editor with widget insertion
│   ├── ReportHeader.tsx           # Header with actions (publish, share, export)
│   ├── widgets/
│   │   ├── KPIWidget.tsx          # KPI display (total, completed, success)
│   │   ├── ChartWidget.tsx        # Chart wrapper (uses visualization microservice)
│   │   └── TableWidget.tsx        # Recent investigations table
│   └── common/
│       ├── StatusBadge.tsx         # Status badge component
│       ├── TagChip.tsx            # Tag display component
│       └── Toast.tsx               # Toast notifications
├── hooks/
│   ├── useReports.ts              # Report CRUD operations
│   ├── useReportEditor.ts         # Editor state management
│   ├── useMarkdownRenderer.ts     # Markdown rendering with widgets
│   └── useWidgetData.ts           # Widget data fetching
├── services/
│   └── reportService.ts            # API service (replace existing mock)
├── types/
│   └── reports.ts                  # TypeScript types matching backend schemas
├── utils/
│   ├── markdownParser.ts          # Markdown parsing with widget detection
│   ├── tocGenerator.ts            # Table of contents generation
│   └── keyboardShortcuts.ts       # Keyboard shortcut handlers
└── ReportingApp.tsx               # Main app component (update existing)

tests/
├── integration/
│   └── reports-api.test.ts        # API integration tests
└── e2e/
    └── reports-flow.spec.ts       # E2E test for complete flow
```

**Structure Decision**: Web application microservice - Frontend React microservice consuming existing backend API

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations detected.

## Phase 0: Outline & Research

1. **Extract unknowns from Technical Context** above:
   - ✅ Markdown rendering library choice (react-markdown vs marked)
   - ✅ Widget integration pattern (how to inject widgets into markdown)
   - ✅ Chart rendering approach (use existing visualization microservice)
   - ✅ Table of contents generation from markdown headings
   - ✅ Keyboard shortcuts implementation
   - ✅ Toast notification system
   - ✅ Olorin theme integration (dark purple colors)

2. **Generate and dispatch research agents**:
   ```
   ✅ Research markdown rendering libraries for React
   ✅ Best practices for widget injection in markdown
   ✅ Integration patterns with visualization microservice
   ✅ TOC generation from markdown AST
   ✅ Keyboard shortcut handling in React
   ✅ Toast notification libraries (react-hot-toast)
   ✅ Olorin theme system and color palette
   ```

3. **Consolidate findings** in `research.md`:
   - Decision: Use react-markdown for markdown rendering (React component, extensible)
   - Decision: Use react-hot-toast for notifications (lightweight, matches Olorin theme)
   - Decision: Integrate with existing visualization microservice for charts (no duplication)
   - Decision: Parse markdown AST to extract headings for TOC
   - Decision: Use Olorin corporate colors from tailwind.config.js

**Output**: ✅ research.md with all technical decisions resolved

## Phase 1: Design & Contracts

*Prerequisites: research.md complete*

1. **Extract entities from feature spec** → `data-model.md`:
   - ✅ Report entity: id, title, content, owner, status, tags, created_at, updated_at
   - ✅ ReportWidget entity: type, subtype, position (embedded in markdown)
   - ✅ Investigation entity: referenced for widget data (external)
   - ✅ Status enum: Draft, Published, Archived
   - ✅ Widget types: KPI (total, completed, success), Chart (timeseries, success, hbar, heatmap), Table (recent)

2. **Generate API contracts** from functional requirements:
   - ✅ Backend API already implemented (see Technical Context)
   - ✅ OpenAPI schema in `/contracts/reports-api.yaml`
   - ✅ Endpoints documented: GET/POST/PUT/DELETE /api/v1/reports, publish, share, export, statistics

3. **Generate contract tests** from contracts:
   - ✅ One test file per endpoint group
   - ✅ Assert request/response schemas
   - ✅ Tests must fail (no implementation yet) - N/A (backend complete)

4. **Extract test scenarios** from user stories:
   - ✅ Each story → integration test scenario
   - ✅ Quickstart test = story validation steps

5. **Update agent file incrementally**:
   - ✅ Run update-agent-context.sh if needed
   - ✅ Add reports microservice context

**Output**: ✅ data-model.md, /contracts/reports-api.yaml, quickstart.md

## Phase 2: Task Planning Approach

*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
- Load `.specify/templates/tasks-template.md` as base
- Generate tasks from Phase 1 design docs (contracts, data model, quickstart)
- Frontend implementation tasks (backend already complete):
  - Type definitions matching backend schemas
  - Report service with real API calls (replace mocks)
  - ReportList component with Olorin theme
  - ReportViewer component with markdown rendering
  - ReportEditor component with markdown editing
  - Widget components (KPI, Chart, Table)
  - Markdown renderer with widget injection
  - TOC generator
  - Keyboard shortcuts
  - Toast notifications
  - Integration with visualization microservice
  - Update ReportingApp to use new components
- Each user story → integration test task
- E2E test for complete flow

**Ordering Strategy**:
- TDD order: Tests before implementation where applicable
- Dependency order: Types → Service → Components → Integration
- Mark [P] for parallel execution (independent components)

**Estimated Output**: 20-25 numbered, ordered tasks in tasks.md

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation

*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)  
**Phase 4**: Implementation (execute tasks.md following constitutional principles)  
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Progress Tracking

*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
- [x] Phase 3: Tasks generated (/tasks command) ✅
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS

**Artifacts Generated**:
- [x] plan.md (this file) ✅
- [x] research.md (Phase 0) ✅
- [x] data-model.md (Phase 1) ✅
- [x] contracts/reports-api.yaml (Phase 1) ✅
- [x] quickstart.md (Phase 1) ✅
