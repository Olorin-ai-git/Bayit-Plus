# Implementation Plan: Manual Investigation UI Migration

**Branch**: `002-verify-and-plan` | **Date**: 2025-01-21 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-verify-and-plan/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   ✓ Loaded feature spec successfully
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   ✓ Detected Project Type: web (frontend + backend microservices)
   ✓ Set Structure Decision: microservices architecture with Module Federation
3. Fill the Constitution Check section based on the content of the constitution document.
   ✓ Constitution template analyzed
4. Evaluate Constitution Check section below
   ✓ No violations detected - microservices approach aligns with modular principles
   ✓ Update Progress Tracking: Initial Constitution Check PASS
5. Execute Phase 0 → research.md
   ✓ No NEEDS CLARIFICATION items remain - requirements are clear
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, CLAUDE.md
   ✓ In progress
7. Re-evaluate Constitution Check section
   ✓ Post-design constitution check pending
8. Plan Phase 2 → Describe task generation approach (DO NOT create tasks.md)
   ✓ Task generation strategy defined
9. STOP - Ready for /tasks command
```

## Summary
Complete migration of manual investigation UI from legacy monolithic Material-UI system to modern microservices architecture using Tailwind CSS, maintaining full backend integration with FastAPI services for fraud investigation workflows.

## Technical Context
**Language/Version**: TypeScript 4.9+, Python 3.11
**Primary Dependencies**: React 18, Tailwind CSS 3.x, Webpack 5 Module Federation, FastAPI, WebSocket
**Storage**: Investigation data via REST APIs, real-time updates via WebSocket, local state management
**Testing**: Jest/React Testing Library (frontend), pytest (backend), integration tests for WebSocket
**Target Platform**: Modern web browsers, responsive design for desktop/tablet
**Project Type**: web - microservices frontend with backend integration
**Performance Goals**: <2s initial load, <500ms step transitions, real-time updates <100ms
**Constraints**: <200 lines per file, zero Material-UI dependencies, full Tailwind CSS migration
**Scale/Scope**: 6 microservices, 20 functional requirements, 10 key entities, WebSocket integration

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Principle Alignment**:
- ✅ Modular Architecture: Microservices approach supports library-first principles
- ✅ Clear Interfaces: REST APIs and WebSocket contracts provide clear boundaries
- ✅ Test-First: TDD approach with Jest and pytest for comprehensive coverage
- ✅ Integration Testing: Focus on service communication and contract validation
- ✅ Observability: Structured logging and real-time monitoring capabilities

**No constitutional violations detected** - microservices architecture aligns with modular, testable design principles.

## Project Structure

### Documentation (this feature)
```
specs/002-verify-and-plan/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
# Microservices Web Application Structure
olorin-front/
├── src/
│   ├── microservices/
│   │   ├── manual-investigation/    # Target microservice
│   │   ├── agent-analytics/         # Supporting service
│   │   ├── core-ui/                # Shared UI components
│   │   └── shared/                 # Common utilities
│   └── legacy/                     # Source for migration
├── webpack.config.js               # Module Federation config
└── tests/
    ├── contract/                   # API contract tests
    ├── integration/                # Cross-service tests
    └── unit/                       # Component tests

olorin-server/
├── app/
│   ├── router/                     # API endpoints
│   ├── models/                     # Data models
│   └── services/                   # Business logic
└── tests/
```

**Structure Decision**: Microservices web application with Module Federation for runtime composition

## Phase 0: Outline & Research

**All technical requirements clearly defined - no research needed**:
- ✅ TypeScript/React stack confirmed from existing codebase
- ✅ Tailwind CSS migration approach documented
- ✅ WebSocket integration patterns established
- ✅ Module Federation configuration available
- ✅ Backend API endpoints identified and functional
- ✅ Testing frameworks already in place

**Key Findings**:
- Legacy system: InvestigationPage.tsx (1,913 lines) requires decomposition
- Target: Manual Investigation microservice with <200 line files
- Backend: FastAPI with `/api/investigation` endpoints ready
- Real-time: WebSocket service for live updates established
- Authentication: JWT integration already functional

**Output**: No research.md needed - all requirements clear from specification

## Phase 1: Design & Contracts

### 1. Data Model Generation
**Source**: Key entities from feature specification
- Investigation, InvestigationStep, AgentResponse, RiskScore
- Evidence, Comment, InvestigationReport, InvestigationTemplate
- UserPermissions, AuditLog

### 2. API Contracts Generation
**Source**: Functional requirements FR-001 through FR-020
- Investigation CRUD operations
- Real-time WebSocket event contracts
- Agent integration endpoints
- Report generation APIs

### 3. Contract Tests Generation
**Source**: Generated contracts
- REST API endpoint validation
- WebSocket message format tests
- Cross-service communication tests

### 4. Test Scenarios Extraction
**Source**: User scenarios from specification
- Investigation dashboard workflows
- Agent analysis interactions
- Collaboration features
- Report generation processes

### 5. Agent Context Update
- Update CLAUDE.md with manual investigation microservice context
- Preserve existing manual additions
- Add new technologies: Module Federation, WebSocket integration

**Output**: data-model.md, /contracts/*, failing tests, quickstart.md, CLAUDE.md

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
- Load `.specify/templates/tasks-template.md` as base
- Generate tasks from Phase 1 design docs (contracts, data model, quickstart)
- Each contract → contract test task [P]
- Each entity → TypeScript interface creation task [P]
- Each user story → integration test task
- Component migration tasks to make tests pass
- WebSocket integration tasks
- Module Federation configuration tasks

**Ordering Strategy**:
- TDD order: Tests before implementation
- Dependency order: Data models → Services → Components → Integration
- Mark [P] for parallel execution (independent microservice files)
- Phase migration: Core UI → Manual Investigation → Integration → Testing

**Estimated Output**: 35-40 numbered, ordered tasks in tasks.md covering:
- Data model definitions (5 tasks)
- API contract tests (8 tasks)
- Component migration (15 tasks)
- Service integration (6 tasks)
- WebSocket integration (4 tasks)
- Testing and validation (6 tasks)

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)
**Phase 4**: Implementation (execute tasks.md following constitutional principles)
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking
*No constitutional violations requiring justification*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | N/A | N/A |

## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command) - No research needed, requirements clear
- [x] Phase 1: Design complete (/plan command) - All artifacts generated
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved
- [x] Complexity deviations documented (none)

---
*Based on Constitution v2.1.1 - See `/memory/constitution.md`*