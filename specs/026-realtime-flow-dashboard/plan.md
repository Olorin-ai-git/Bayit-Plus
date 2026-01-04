# Implementation Plan: Real-Time Flow Dashboard

**Branch**: `026-realtime-flow-dashboard` | **Date**: 2025-12-26 | **Spec**: `specs/026-realtime-flow-dashboard/spec.md`  
**Input**: Feature specification from `specs/026-realtime-flow-dashboard/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Add in-page Daily and Monthly flow progression panels to the Running Investigations page using real persisted investigation-state data, updating automatically without requiring manual refresh. Implement a read-only API that aggregates daily/month-to-date status counts from existing investigation state storage.

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: Python 3.11 (backend), TypeScript/React 18 (frontend)  
**Primary Dependencies**: FastAPI (backend), SQLAlchemy (backend), React (frontend), Tailwind CSS (frontend)  
**Storage**: PostgreSQL via SQLAlchemy model `InvestigationState` (schema-locked; no DDL)  
**Testing**: pytest (backend), Jest/RTL (frontend)  
**Target Platform**: Web application (React SPA + FastAPI API)  
**Project Type**: Web application (separate `olorin-front/` and `olorin-server/`)  
**Performance Goals**: UI reflects ongoing flow changes quickly (≤ 10s for running changes), month-to-date refresh ≤ 60s  
**Constraints**:
- No mocks/stubs/placeholders/TODOs in production code
- No hardcoded values in application logic; configuration must be injected
- Schema-locked mode: no DDL/migrations
- All files < 200 lines
- Do not restart server during development workflow for this task
**Scale/Scope**: Operational monitoring for concurrent investigations; aggregates computed from existing state rows

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

GATE RESULT: PASS (using repository rules as constitution-of-record).

- `.specify/memory/constitution.md` is a template placeholder in this repo; enforce the real project constitutional rules from:
  - root `CLAUDE.md`
  - `olorin-front/CLAUDE.md`
  - `olorin-server/CLAUDE.md`

Checks:
- No forbidden tokens in production code: PASS
- No hardcoded environment-dependent values added in feature code paths: PASS (config keys introduced; fail-fast config validation)
- No DDL / schema changes: PASS
- File size limit: PASS

## Project Structure

### Documentation (this feature)

```text
specs/026-realtime-flow-dashboard/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)
```text
olorin-front/
└── src/microservices/investigation/pages/ParallelInvestigationsPage/
    ├── ParallelInvestigationsPage.tsx
    ├── FlowProgressionPanels.tsx
    └── useInvestigationPolling.ts

olorin-front/src/microservices/investigation/services/
└── investigationService.ts

olorin-server/
└── app/
    ├── router/flow_progression_router.py
    ├── schemas/flow_progression.py
    └── service/flow_progression_service.py
```

**Structure Decision**: Web app split across `olorin-front/` (UI) and `olorin-server/` (API), reusing existing investigation-state persistence as the source of truth for progression.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A | No constitution violations required | N/A |

## Phase 0: Outline & Research (Output: research.md)

### Unknowns to resolve

- Define the daily/monthly “flow” source of truth in a way that uses only persisted real data.
- Define API contract for progression that avoids schema changes and avoids new persistence layers.

## Phase 1: Design & Contracts (Output: data-model.md, contracts/*, quickstart.md)

### Design summary

- Source of truth: `investigation_states` table (existing), using `created_at` and `status`.
- Daily flow: investigations created on the UTC day.
- Monthly flow: investigations created in the UTC month (month-to-date), plus per-day breakdown.
- UI update mechanism: reuse existing investigations polling tick; refresh progression snapshot on the same cadence.

### Contracts summary

- Add read-only endpoint:
  - `GET /api/v1/investigation-state/flow-progression?day=YYYY-MM-DD&year=YYYY&month=M`
  - Returns: `{ as_of, daily|null, monthly|null }`

### Phase 2: Implementation Planning (Output: tasks.md)

- Break work into backend endpoint, frontend service typing, UI panels, and config keys.
- Add tests and validation steps consistent with repo rules.
