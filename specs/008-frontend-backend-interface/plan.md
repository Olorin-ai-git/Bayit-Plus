# Implementation Plan: Frontend-Backend Interface Compatibility

**Branch**: `001-frontend-backend-interface` | **Date**: 2025-11-01 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-frontend-backend-interface/spec.md`

## Summary

Establish a comprehensive, automated system for guaranteeing interface compatibility between the Olorin frontend (React TypeScript) and backend (Python FastAPI) across all environments and versions. The plan implements schema-first development with OpenAPI 3.1 as the single source of truth, auto-generated TypeScript types, contract testing, automated breaking change detection, and canary deployments with automatic rollback.

**Primary Goal**: Zero production incidents from frontend-backend interface incompatibility while enabling independent team deployment.

**Technical Approach**:
- OpenAPI 3.1 schema generation from FastAPI backend
- TypeScript type generation using `openapi-typescript` and `openapi-typescript-codegen`
- Contract testing with `schemathesis` (backend) and `dredd` (frontend)
- Breaking change detection with `oasdiff` in CI pipeline
- Canary deployments with automated rollback < 120 seconds

## Technical Context

**Language/Version**:
- Backend: Python 3.11
- Frontend: TypeScript 4.9+, Node.js 18+

**Primary Dependencies**:
- Backend: FastAPI 0.104+, Pydantic 2.5+, schemathesis, pytest, python-jose (JWT)
- Frontend: React 18+, openapi-typescript, openapi-typescript-codegen, dredd, jest, msw
- CI/CD: GitHub Actions, oasdiff, kubectl/aws-cli (deployment)

**Storage**:
- SQLite (development), PostgreSQL (production) for investigation data
- Schema registry: OpenAPI schemas versioned in Git
- Contract test results: CI artifacts

**Testing**:
- Backend: pytest with schemathesis for contract tests, fastapi.testclient for integration
- Frontend: jest for contract/integration tests, Playwright for E2E
- Contract test coverage target: 95% of endpoints

**Target Platform**:
- Backend: Linux server (AWS/GCP), containerized with Docker/Kubernetes
- Frontend: Web browsers (Chrome, Firefox, Safari), responsive design

**Project Type**: Web application (frontend + backend)

**Performance Goals**:
- Schema generation: < 5 seconds (backend startup)
- Type generation: < 10 seconds (frontend build)
- Contract tests: < 60 seconds (CI pipeline)
- API versioning overhead: < 10ms per request
- Schema validation: < 5ms per request (production)

**Constraints**:
- Automated rollback: < 120 seconds from detection to stable state
- Breaking change detection: 100% accuracy (zero false negatives)
- Canary deployment: 15-minute monitoring window before full rollout
- Deprecation period: 90 days minimum for API changes

**Scale/Scope**:
- API endpoints: ~50 endpoints across investigations, auth, reporting
- Request volume: 1000+ req/s production traffic
- Team size: 3 backend developers, 3 frontend developers, 2 DevOps engineers
- Deployment frequency: 2-week sprint cycles with continuous deployment

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Constitutional Requirements** (from Olorin project standards):

### ✅ Zero-Tolerance Rules Compliance

1. **No Mocks/Stubs/TODOs**:
   - ✅ Production code uses real OpenAPI schema generation (no mocked schemas)
   - ✅ Contract tests use real API calls (no stubbed responses in production)
   - ✅ Generated types are production-ready (no placeholder interfaces)

2. **No Hardcoded Values**:
   - ✅ API base URLs: Environment variables (BACKEND_URL, API_BASE_URL)
   - ✅ Timeout values: Configurable (REQUEST_TIMEOUT_MS, CONTRACT_TEST_TIMEOUT)
   - ✅ Canary thresholds: Configuration-driven (ERROR_RATE_THRESHOLD, ROLLBACK_THRESHOLD)
   - ✅ Feature flags: Environment-based (ENABLE_V2_API, ENABLE_CANARY_DEPLOYMENT)

3. **Schema-Locked Mode**:
   - ✅ No DDL anywhere (schema changes via versioning only)
   - ✅ All database columns referenced exist in schema manifest
   - ✅ ORM auto-migration disabled (explicit version bumps only)

4. **Configuration & Secrets**:
   - ✅ All variable values from environment or Firebase Secrets
   - ✅ Pydantic validation with fail-fast on missing/invalid values
   - ✅ .env.example files with placeholders (no working defaults for secrets)

### ✅ Testing Rules Compliance

1. **No Mocks in Production Code**:
   - ✅ Contract tests use ephemeral test containers (real database, real HTTP)
   - ✅ Integration tests against real backend instances
   - ✅ Generated API clients use real fetch/axios (no mocked network layer)

2. **Test Coverage**:
   - ✅ Contract tests: 95% endpoint coverage target
   - ✅ Integration tests: 25% of test pyramid
   - ✅ E2E tests: 5% of test pyramid
   - ✅ Unit tests: 70% of test pyramid

### ✅ Architectural Compliance

1. **Dependency Injection**:
   - ✅ HTTP clients constructed in composition root with config
   - ✅ Schema generation services injected into FastAPI app
   - ✅ API clients receive base URL and timeout from config

2. **Logging/Telemetry**:
   - ✅ Structured logging with levels from config
   - ✅ OpenTelemetry tracing for schema validation spans
   - ✅ No hardcoded log paths or destinations

**GATE PASSED**: All constitutional requirements satisfied. Proceed to Phase 0 research.

## Project Structure

### Documentation (this feature)

```text
specs/001-frontend-backend-interface/
├── spec.md              # Feature specification (created)
├── plan.md              # This file (implementation plan)
├── research.md          # Phase 0 technical research
├── data-model.md        # Phase 1 data model and schema definitions
├── quickstart.md        # Phase 1 quick-start implementation guide
├── contracts/           # Phase 1 contract definitions
│   ├── openapi-schema-contract.md
│   ├── type-generation-contract.md
│   ├── contract-testing-contract.md
│   └── deployment-rollback-contract.md
└── tasks.md             # Phase 2 implementation tasks (created via /speckit.tasks)
```

### Source Code (repository root)

```text
# Olorin Repository Structure (Web Application)

olorin-server/ (Backend)
├── app/
│   ├── main.py                           # FastAPI app with OpenAPI generation
│   ├── router/
│   │   ├── models/
│   │   │   └── structured_investigation_models.py  # Pydantic models (source of truth)
│   │   └── controllers/
│   │       └── investigation_controller.py
│   ├── service/
│   │   └── agent/
│   │       └── orchestration/
│   │           └── state_schema.py       # Investigation state with time_range
│   └── config/
│       └── settings.py                   # Configuration validation (Pydantic)
├── test/
│   ├── contract/
│   │   ├── test_investigations_contract.py  # Schemathesis contract tests
│   │   └── test_openapi_schema.py          # Schema validation tests
│   ├── integration/
│   │   └── test_investigation_api.py        # API integration tests
│   └── unit/
│       └── test_investigation_models.py     # Unit tests for Pydantic models
└── openapi.json                          # Generated OpenAPI schema (gitignored)

olorin-front/ (Frontend)
├── src/
│   ├── api/
│   │   ├── generated/                    # Auto-generated from OpenAPI (gitignored)
│   │   │   ├── types.ts                 # TypeScript interfaces
│   │   │   └── api.ts                   # API client functions
│   │   └── config.ts                    # API base URL from environment
│   ├── components/
│   │   └── InvestigationForm.tsx        # Uses generated types
│   ├── pages/
│   │   └── InvestigationPage.tsx
│   └── services/
│       └── investigationService.ts       # Wraps generated API client
├── test/
│   ├── contract/
│   │   └── investigation-api.contract.test.ts  # Dredd contract tests
│   ├── integration/
│   │   └── investigation-flow.test.ts          # Integration tests
│   └── e2e/
│       └── investigation-workflow.spec.ts      # Playwright E2E tests
├── scripts/
│   └── generate-api-types.sh            # Type generation script
└── package.json                          # Includes generate-api-types command

.github/
└── workflows/
    ├── api-contract-validation.yml       # CI pipeline for contract testing
    ├── breaking-change-detection.yml     # Oasdiff integration
    └── canary-deployment.yml             # Canary deployment workflow

.specify/
└── memory/
    └── constitution.md                   # Project constitution (standards)
```

**Structure Decision**: Web application structure (Option 2) selected because:
1. Separate frontend and backend codebases with different tech stacks
2. Independent build and deployment pipelines required
3. Contract testing must span both codebases
4. Schema generation lives in backend, type generation in frontend
5. Shared schema stored in Git for versioning and CI validation

## Phase 0: Research & Discovery

**Objective**: Investigate technical feasibility and document unknowns.

### Research Areas

1. **OpenAPI Schema Generation** (FastAPI)
   - How does FastAPI generate OpenAPI 3.1 schemas automatically?
   - Can we customize schema generation for better type mapping?
   - How do we version the schema (in URL vs in schema file)?

2. **TypeScript Type Generation** (openapi-typescript)
   - What are the best tools for generating TypeScript from OpenAPI?
   - How do we handle camelCase/snake_case transformation?
   - Can we generate API client functions or just types?

3. **Contract Testing** (schemathesis, dredd)
   - What are the tradeoffs between property-based (schemathesis) and example-based (dredd) testing?
   - How do we integrate contract tests into CI pipeline?
   - Can contract tests catch all breaking changes?

4. **Breaking Change Detection** (oasdiff)
   - What constitutes a "breaking change" in OpenAPI?
   - How accurate is oasdiff (false positives/negatives)?
   - Can we customize breaking change rules?

5. **Canary Deployment** (Kubernetes/AWS)
   - What deployment tools support canary strategies?
   - How do we monitor canary health (error rates, latency)?
   - What are the rollback mechanisms (instant vs gradual)?

6. **API Versioning** (URL vs Header)
   - Should we use URL-based versioning (/api/v1/) or header-based (Accept: application/vnd.olorin.v1+json)?
   - How do we run multiple API versions simultaneously?
   - What's the migration path from v1 to v2?

### Unknowns to Investigate

- **Q1**: Can FastAPI generate examples in OpenAPI schema automatically?
- **Q2**: How do we handle authentication in contract tests (JWT tokens)?
- **Q3**: What's the performance overhead of runtime schema validation?
- **Q4**: Can we generate API mocks from OpenAPI schema for frontend development?
- **Q5**: How do we test the rollback mechanism itself (rollback tests)?

**Output**: `research.md` (Phase 0 artifact)

## Phase 1: Architecture & Design

**Objective**: Design data models, contracts, and technical architecture.

### Design Artifacts

1. **Data Model** (`data-model.md`)
   - OpenAPI Schema structure and components
   - TypeScript interface mappings
   - API versioning strategy
   - Schema evolution patterns (adding fields, deprecating endpoints)

2. **Interface Contracts** (`contracts/`)
   - **OpenAPI Schema Contract**: Schema generation rules, versioning, examples
   - **Type Generation Contract**: Input/output of code generator, naming conventions
   - **Contract Testing Contract**: Test structure, coverage requirements, CI integration
   - **Deployment Rollback Contract**: Canary metrics, rollback triggers, recovery SLAs

3. **Quick-Start Guide** (`quickstart.md`)
   - Developer setup: How to generate types, run contract tests
   - Adding new endpoints: Schema → Types → Tests workflow
   - Debugging: Common issues, error messages, troubleshooting
   - CI/CD: How pipeline validates contracts, when to override

### Key Design Decisions

1. **Schema-First Development**: OpenAPI schema is the source of truth
   - Pydantic models generate schema automatically (FastAPI default)
   - Frontend generates types from schema (never manual interfaces)
   - Contract tests validate against schema (not against code)

2. **Breaking Change Prevention**: Multiple validation layers
   - Oasdiff in CI blocks PRs with breaking changes
   - Contract tests fail if schema doesn't match implementation
   - Canary deployment detects runtime issues before full rollout
   - Rollback mechanism recovers from failures < 120 seconds

3. **Version Migration**: Support both old and new versions
   - URL-based versioning: /api/v1/, /api/v2/
   - Backend serves both versions simultaneously
   - Frontend gradually migrates from v1 to v2 clients
   - Deprecation warnings in response headers (Sunset header)

**Output**: `data-model.md`, `contracts/`, `quickstart.md` (Phase 1 artifacts)

## Phase 2: Task Generation

**Objective**: Break down implementation into executable tasks with dependencies.

**Note**: This phase is executed via `/speckit.tasks` command (NOT `/speckit.plan`).

The task generation will create `tasks.md` with prioritized, dependency-ordered tasks based on the specification, research findings, and architectural design.

**Expected Task Categories**:
1. **Foundation**: OpenAPI schema generation, TypeScript type generation setup
2. **Contract Testing**: Backend schemathesis tests, frontend dredd tests
3. **CI/CD Integration**: GitHub Actions workflows, oasdiff integration
4. **Deployment Safety**: Canary deployment configuration, rollback automation
5. **API Versioning**: v1/v2 endpoint setup, version negotiation
6. **Monitoring**: Schema validation metrics, contract test dashboards
7. **Documentation**: Developer guides, migration guides, runbooks

**Output**: `tasks.md` (Phase 2 artifact - created via separate command)

## Implementation Phases (from Spec)

### Quarter 1: Foundation (Weeks 1-12)
- **Sprint 1-2**: OpenAPI schema generation, TypeScript type generation
- **Sprint 3-4**: Contract testing (backend + frontend)
- **Milestone**: Generated types in production, contract tests blocking bad deployments

### Quarter 2: Automation (Weeks 13-24)
- **Sprint 5-6**: Breaking change detection, PR blocking
- **Sprint 7-8**: Canary deployment, automated rollback
- **Milestone**: Zero unintentional breaking changes, automated rollback working

### Quarter 3: Resilience (Weeks 25-36)
- **Sprint 9-10**: API versioning, version negotiation
- **Sprint 11-12**: Deprecation system, first deprecation cycle
- **Milestone**: Multiple versions running, successful v1 sunset

### Quarter 4: Optimization (Weeks 37-48)
- **Sprint 13-14**: Performance optimization, distributed tracing
- **Sprint 15-16**: Developer experience, CLI tools, VS Code extension
- **Milestone**: < 10ms overhead, 90% developer satisfaction

## Progress Tracking

| Phase | Status | Artifacts | Notes |
|-------|--------|-----------|-------|
| Phase 0: Research | ⏳ Pending | research.md | Technical feasibility, unknowns |
| Phase 1: Design | ⏳ Pending | data-model.md, contracts/, quickstart.md | Data models, contracts, architecture |
| Phase 2: Tasks | ⏳ Pending | tasks.md | Dependency-ordered implementation tasks (separate command) |
| Gate: Constitution Re-check | ⏳ Pending | - | Verify compliance after design phase |

## Success Criteria (from Spec)

**Reliability**:
- Zero production incidents from interface incompatibility (90 days)
- 100% of breaking changes detected in CI before merge
- 95%+ successful canary deployments

**Quality**:
- 100% contract test coverage for all endpoints
- < 1% schema validation failures in production
- Zero false negatives in breaking change detection

**Developer Experience**:
- 80% reduction in time spent on API integration debugging
- 70% reduction in support tickets for API questions
- 90% developer satisfaction score (survey)

**Operational**:
- Contract tests execute in < 60 seconds
- Rollback time < 120 seconds (95th percentile)
- API documentation updated within 60 seconds of changes

## Next Steps

1. **Execute Phase 0**: Create `research.md` with technical research findings
2. **Execute Phase 1**: Create `data-model.md`, `contracts/`, `quickstart.md` with architecture design
3. **Gate Check**: Re-validate constitution compliance after design phase
4. **Execute Phase 2**: Run `/speckit.tasks` to generate `tasks.md` with implementation tasks
5. **Implementation**: Begin Sprint 1 (OpenAPI schema generation + TypeScript types)

## References

- **Feature Spec**: [spec.md](./spec.md) - Complete specification with 7 user stories, 20 functional requirements, 15 success criteria
- **Olorin Backend**: `/olorin-server/` - Python FastAPI application
- **Olorin Frontend**: `/olorin-front/` - React TypeScript application
- **CI/CD**: `/.github/workflows/` - GitHub Actions workflows
- **Constitution**: `/.specify/memory/constitution.md` - Project standards and compliance rules
