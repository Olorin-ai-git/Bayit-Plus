# Implementation Tasks: Investigation Polling and Persistence

**Feature:** 005-polling-and-persistence
**Branch:** `005-polling-and-persistence`
**Generated:** 2025-01-15
**Total Estimated Tasks:** 32
**Estimated Effort:** 9-11 hours

## Overview

This file contains granular, dependency-ordered implementation tasks for the investigation wizard state polling and persistence feature. Tasks follow a Test-Driven Development (TDD) approach with configuration-driven implementation.

**Key Implementation Principles:**
- ✅ Contract tests BEFORE implementation
- ✅ Schema-locked database (NO auto-migration)
- ✅ Configuration-driven (ALL values from env)
- ✅ Files < 200 lines (modular design)
- ✅ TDD with 30%+ coverage requirement
- ✅ Optimistic locking for concurrency

**Dependencies:**
- Python 3.11+ with Poetry (backend)
- TypeScript 4.9+ with React 18 (frontend)
- SQLite 3.35+ (database)
- FastAPI (backend framework)
- Zustand (frontend state management)

---

## Task Categories

Tasks are organized by dependency order and marked with [P] for parallel execution:

1. **Setup & Configuration** (T001-T005) - Project initialization and environment setup
2. **Test Infrastructure** (T006-T009) [P] - Contract tests before implementation
3. **Core Backend** (T010-T018) - Database, models, services, endpoints
4. **Core Frontend** (T019-T027) - Types, services, hooks, state management
5. **Integration** (T028-T029) - Polling, database connection
6. **Polish & Validation** (T033-T038) [P] - Unit tests, performance, documentation

---

## Setup & Configuration

### T001: Project Structure and Dependencies

**Status:** TODO
**Priority:** P0 - Must complete before T002
**Estimated Time:** 20 minutes
**Parallel:** No

**Description:**
Set up project structure for polling and persistence feature. Create directory structure for backend and frontend modules. Install required dependencies.

**Files to Create/Modify:**
- `/olorin-server/app/persistence/` (NEW DIRECTORY)
- `/olorin-server/app/persistence/migrations/` (NEW DIRECTORY)
- `/olorin-server/app/schemas/wizard_state.py` (NEW FILE)
- `/olorin-server/app/service/wizard_state_service.py` (NEW FILE)
- `/olorin-server/app/router/wizard_state_router.py` (NEW FILE)
- `/olorin-front/src/shared/types/wizardState.ts` (NEW FILE)
- `/olorin-front/src/shared/services/wizardStateService.ts` (NEW FILE)
- `/olorin-front/src/shared/hooks/useWizardState.ts` (NEW FILE)
- `/olorin-server/pyproject.toml` (MODIFY - add sqlalchemy, alembic dependencies if needed)
- `/olorin-front/package.json` (MODIFY - add zustand, axios dependencies if needed)

**Implementation Steps:**
1. Create all directory structures listed above
2. Verify Python 3.11 and Poetry are installed
3. Verify Node.js 18+ and npm are installed
4. Run `poetry install` in olorin-server/
5. Run `npm install` in olorin-front/
6. Verify SQLite version is 3.35+

**Acceptance Criteria:**
- All directories created successfully
- Dependencies installed without errors
- Python and Node environments validated
- SQLite version confirmed >= 3.35

**Dependencies:**
- None (initial setup task)

---

### T002: Environment Configuration Files

**Status:** TODO
**Priority:** P0 - Must complete before T003
**Estimated Time:** 30 minutes
**Parallel:** No

**Description:**
Create environment configuration files with all required variables for polling and persistence. Follow SYSTEM MANDATE: NO hardcoded values, ALL configuration from env variables.

**Files to Create/Modify:**
- `/olorin-server/.env.example` (NEW FILE or MODIFY)
- `/olorin-front/.env.example` (NEW FILE or MODIFY)
- `/olorin-server/app/config/wizard_state_config.py` (NEW FILE)

**Implementation Steps:**
1. Add backend environment variables to .env.example:
   ```
   # Database Configuration
   DATABASE_URL=sqlite:///olorin.db
   DB_POOL_SIZE=5
   DB_MAX_OVERFLOW=10

   # Polling Configuration
   POLLING_FAST_INTERVAL_MS=500
   POLLING_NORMAL_INTERVAL_MS=2000
   POLLING_SLOW_INTERVAL_MS=5000
   POLLING_MAX_BACKOFF_MS=30000
   POLLING_MAX_RETRIES=3

   # Rate Limiting
   RATE_LIMIT_REQUESTS_PER_MINUTE=100
   RATE_LIMIT_BURST=20

   # Features
   ENABLE_STATE_PERSISTENCE=true
   ENABLE_TEMPLATE_MANAGEMENT=true
   ENABLE_AUDIT_LOG=true
   ```

2. Add frontend environment variables to .env.example:
   ```
   # API Configuration
   REACT_APP_API_BASE_URL=http://localhost:8090

   # Polling Configuration
   REACT_APP_POLLING_FAST_INTERVAL_MS=500
   REACT_APP_POLLING_NORMAL_INTERVAL_MS=2000
   REACT_APP_POLLING_SLOW_INTERVAL_MS=5000
   REACT_APP_POLLING_MAX_BACKOFF_MS=30000
   REACT_APP_POLLING_MAX_RETRIES=3

   # UI Configuration
   REACT_APP_PAGINATION_SIZE=20
   REACT_APP_REQUEST_TIMEOUT_MS=30000

   # Features
   REACT_APP_FEATURE_ENABLE_POLLING=true
   REACT_APP_FEATURE_ENABLE_TEMPLATES=true
   ```

3. Create Pydantic config validation schema at `/olorin-server/app/config/wizard_state_config.py`
4. Add fail-fast validation on startup

**Acceptance Criteria:**
- All environment variables documented in .env.example files
- No hardcoded values in configuration files
- Pydantic schema validates all config on startup
- Missing required variables cause immediate failure with clear error message

**Dependencies:**
- T001 (project structure must exist)

---

### T003: Database Migration Script (Schema-Locked)

**Status:** TODO
**Priority:** P0 - Must complete before T010
**Estimated Time:** 45 minutes
**Parallel:** No

**Description:**
Create MANUAL database migration script for the three new tables. CRITICAL: NO auto-migration allowed per SYSTEM MANDATE. This is a schema-locked approach.

**Files to Create/Modify:**
- `/olorin-server/app/persistence/migrations/001_add_wizard_state_tables.sql` (NEW FILE)
- `/olorin-server/app/persistence/migrations/runner.py` (NEW FILE)
- `/olorin-server/app/persistence/database.py` (MODIFY - add migration runner call)

**Implementation Steps:**
1. Create SQL migration file with DDL for:
   - `investigation_states` table (10 columns, 4 indexes)
   - `investigation_templates` table (10 columns, 3 indexes)
   - `investigation_audit_log` table (9 columns, 4 indexes)
   - All CHECK constraints for enums
   - All foreign key constraints
   - All indexes for query optimization

2. Create migration runner with:
   - No auto-migration logic
   - Manual SQL file execution
   - Transaction rollback on error
   - Logging for each migration step

3. Add migration runner call to database initialization
4. Add startup validation to verify schema matches expectations

**Reference:**
See `/specs/005-polling-and-persistence/quickstart.md` lines 39-109 for complete SQL DDL.

**Acceptance Criteria:**
- SQL migration file creates all 3 tables with correct schema
- Migration runner executes SQL without auto-migration features
- Database initialization calls migration runner
- Startup fails if schema doesn't match expected structure
- All constraints and indexes created correctly

**Dependencies:**
- T002 (environment config must exist for DATABASE_URL)

---

### T004: Linting and Code Quality Setup

**Status:** TODO
**Priority:** P1 - Should complete before T010
**Estimated Time:** 20 minutes
**Parallel:** Yes [P]

**Description:**
Configure linters and formatters for both backend and frontend to enforce code quality standards. Ensure all files will be < 200 lines.

**Files to Create/Modify:**
- `/olorin-server/.pylintrc` (MODIFY or CREATE)
- `/olorin-server/pyproject.toml` (MODIFY - add black, isort, mypy config)
- `/olorin-front/.eslintrc.js` (MODIFY)
- `/olorin-front/.prettierrc` (MODIFY)
- `/olorin-front/tsconfig.json` (MODIFY)

**Implementation Steps:**
1. Configure Black formatter for Python (line length: 100)
2. Configure isort for import sorting
3. Configure mypy for strict type checking
4. Configure ESLint with TypeScript rules
5. Configure Prettier for consistent formatting
6. Add pre-commit hooks for automated formatting

**Acceptance Criteria:**
- Black, isort, mypy configured for Python
- ESLint, Prettier configured for TypeScript
- Line length limits enforced (max 200 lines per file)
- Type checking enabled and strict
- Pre-commit hooks run formatters automatically

**Dependencies:**
- T001 (project structure must exist)

---

### T005: Test Framework Configuration

**Status:** TODO
**Priority:** P1 - Must complete before T006
**Estimated Time:** 25 minutes
**Parallel:** Yes [P]

**Description:**
Configure test frameworks for backend (pytest) and frontend (Jest + React Testing Library). Set up coverage reporting with 30% minimum threshold.

**Files to Create/Modify:**
- `/olorin-server/pytest.ini` (MODIFY or CREATE)
- `/olorin-server/tox.ini` (MODIFY - add coverage config)
- `/olorin-front/jest.config.js` (MODIFY)
- `/olorin-front/package.json` (MODIFY - add test scripts)

**Implementation Steps:**
1. Configure pytest with markers for unit/integration tests
2. Configure pytest-cov for coverage reporting (min 30%)
3. Configure Jest with TypeScript support
4. Configure React Testing Library
5. Add test scripts to package.json: `test`, `test:coverage`, `test:watch`
6. Set up test isolation and cleanup

**Acceptance Criteria:**
- Pytest runs with coverage reporting
- Jest runs TypeScript tests successfully
- Coverage threshold set to 30% minimum
- Test scripts work in both environments
- Tests can run in isolation and in parallel

**Dependencies:**
- T001 (project structure and dependencies must exist)

---

## Test Infrastructure (TDD Approach)

### T006: [P] Contract Test - Wizard State API

**Status:** TODO
**Priority:** P1 - Must complete before T010
**Estimated Time:** 45 minutes
**Parallel:** Yes [P]

**Description:**
Create contract test for wizard-state-api.yaml that validates ALL 5 endpoints (POST, GET, PUT, DELETE, GET history) against the OpenAPI specification. Test BEFORE implementation.

**Files to Create/Modify:**
- `/olorin-server/test/contracts/test_wizard_state_api_contract.py` (NEW FILE)

**Implementation Steps:**
1. Install contract testing library (e.g., schemathesis or openapi-core)
2. Load wizard-state-api.yaml OpenAPI spec
3. Create test cases for each endpoint:
   - POST /wizard-state (create state)
   - GET /wizard-state/{id} (retrieve with conditional GET)
   - PUT /wizard-state/{id} (update with optimistic locking)
   - DELETE /wizard-state/{id} (delete state)
   - GET /wizard-state/{id}/history (audit log)
4. Validate request/response schemas match contract
5. Test error responses (400, 401, 403, 404, 409, 422, 500)
6. Test ETag header behavior for 304 Not Modified

**Reference:**
See `/specs/005-polling-and-persistence/contracts/wizard-state-api.yaml` for complete API spec.

**Acceptance Criteria:**
- All 5 endpoints have contract tests
- Request schemas validated against OpenAPI spec
- Response schemas validated against OpenAPI spec
- Error responses tested for all error codes
- ETag conditional GET behavior tested
- Tests initially FAIL (endpoints not implemented yet)

**Dependencies:**
- T003 (database schema must exist)
- T005 (test framework must be configured)

---

### T007: [P] Contract Test - Polling API

**Status:** TODO
**Priority:** P1 - Must complete before T016
**Estimated Time:** 40 minutes
**Parallel:** Yes [P]

**Description:**
Create contract test for polling-api.yaml that validates ALL 4 polling endpoints against the OpenAPI specification. Test adaptive polling intervals and rate limiting.

**Files to Create/Modify:**
- `/olorin-server/test/contracts/test_polling_api_contract.py` (NEW FILE)

**Implementation Steps:**
1. Load polling-api.yaml OpenAPI spec
2. Create test cases for each endpoint:
   - GET /polling/wizard-state/{id} (poll with ETag support)
   - GET /polling/wizard-state/{id}/changes (delta polling)
   - GET /polling/active-investigations (list polling)
   - GET /polling/health (health check, no auth)
3. Validate recommended interval headers (X-Recommended-Interval)
4. Test 304 Not Modified responses
5. Test rate limiting (429 Too Many Requests)
6. Test exponential backoff scenarios

**Reference:**
See `/specs/005-polling-and-persistence/contracts/polling-api.yaml` for complete API spec.

**Acceptance Criteria:**
- All 4 polling endpoints have contract tests
- Adaptive polling intervals validated (500ms, 2s, 5s)
- ETag conditional GET behavior tested
- Rate limiting tested with Retry-After header
- Health check endpoint works without authentication
- Tests initially FAIL (endpoints not implemented yet)

**Dependencies:**
- T003 (database schema must exist)
- T005 (test framework must be configured)

---

### T008: [P] Contract Test - Template API

**Status:** TODO
**Priority:** P1 - Must complete before T017
**Estimated Time:** 35 minutes
**Parallel:** Yes [P]

**Description:**
Create contract test for template-api.yaml that validates ALL 6 template management endpoints against the OpenAPI specification.

**Files to Create/Modify:**
- `/olorin-server/test/contracts/test_template_api_contract.py` (NEW FILE)

**Implementation Steps:**
1. Load template-api.yaml OpenAPI spec
2. Create test cases for each endpoint:
   - GET /templates (list user templates)
   - POST /templates (create template)
   - GET /templates/{id} (retrieve template)
   - PUT /templates/{id} (update template)
   - DELETE /templates/{id} (delete template)
   - POST /templates/{id}/apply (apply template to new investigation)
3. Test template JSON validation against InvestigationSettings schema
4. Test tagging and categorization
5. Test usage count tracking
6. Test placeholder replacement in apply endpoint

**Reference:**
See `/specs/005-polling-and-persistence/contracts/template-api.yaml` for complete API spec.

**Acceptance Criteria:**
- All 6 template endpoints have contract tests
- Template JSON validates against settings schema
- Placeholder replacement tested in apply endpoint
- Usage statistics tracking validated
- Soft delete behavior tested
- Tests initially FAIL (endpoints not implemented yet)

**Dependencies:**
- T003 (database schema must exist)
- T005 (test framework must be configured)

---

## Core Backend Implementation

### T010: SQLAlchemy Models

**Status:** TODO
**Priority:** P0 - Must complete before T011
**Estimated Time:** 60 minutes
**Parallel:** No

**Description:**
Create SQLAlchemy ORM models for the three database tables: InvestigationState, InvestigationTemplate, InvestigationAuditLog. Implement to_dict() and from_dict() methods with JSON serialization.

**Files to Create/Modify:**
- `/olorin-server/app/persistence/models.py` (MODIFY - add 3 new models)

**Implementation Steps:**
1. Add TimestampMixin for created_at/updated_at
2. Create InvestigationState model:
   - All 10 columns from schema
   - JSON serialization for settings_json, progress_json, results_json
   - to_dict() method with JSON parsing
   - from_dict() classmethod with JSON serialization
   - All 4 indexes and CHECK constraints
3. Create InvestigationTemplate model:
   - All 10 columns from schema
   - JSON serialization for template_json, tags
   - to_dict() and from_dict() methods
   - All 3 indexes
4. Create InvestigationAuditLog model:
   - All 9 columns from schema
   - JSON serialization for changes_json, state_snapshot_json
   - to_dict() method
   - All 4 indexes and CHECK constraints
5. Keep each model < 70 lines (3 models ~200 lines total for file)

**Reference:**
See `/specs/005-polling-and-persistence/quickstart.md` lines 208-375 for complete model implementations.

**Acceptance Criteria:**
- All 3 models defined with correct schema
- JSON serialization/deserialization works correctly
- to_dict() and from_dict() methods functional
- All indexes and constraints match migration SQL
- File size < 200 lines
- T006 contract tests START PASSING (model structure correct)

**Dependencies:**
- T003 (database migration must be complete)
- T006 (contract tests define expected interface)

---

### T011: Pydantic Schemas

**Status:** TODO
**Priority:** P0 - Must complete before T012
**Estimated Time:** 75 minutes
**Parallel:** No

**Description:**
Create Pydantic schemas for request/response validation. Implement ALL enums, configuration schemas, entity models, and API models with comprehensive validation.

**Files to Create/Modify:**
- `/olorin-server/app/schemas/wizard_state.py` (NEW FILE - will be ~150 lines, split if needed)

**Implementation Steps:**
1. Create enums (5): WizardStep, InvestigationStatus, EntityType, CorrelationMode, PhaseStatus
2. Create configuration schemas (2):
   - DatabaseConfig with env variable loading
   - WizardPollingConfig with interval validation
3. Create entity models (5):
   - Entity (entity_type, entity_value)
   - TimeRange (with end_time > start_time validation)
   - ToolSelection (with config dict)
   - InvestigationSettings (with min/max validation)
   - InvestigationPhase, ToolExecution
4. Create progress/results models (2):
   - InvestigationProgress (with percent_complete 0-100)
   - InvestigationResults (with risk_score 0-100)
5. Create API models (3):
   - WizardStateCreate
   - WizardStateUpdate (with version for optimistic locking)
   - WizardStateResponse (with orm_mode = True)
6. Add custom validators where needed
7. Split into multiple files if any file exceeds 180 lines

**Reference:**
See `/specs/005-polling-and-persistence/quickstart.md` lines 377-574 for complete schema definitions.

**Acceptance Criteria:**
- All enums, models, and schemas defined
- Custom validators functional (time range, intervals)
- Configuration schemas load from environment variables
- Fail-fast validation on missing required config
- All files < 200 lines (split if needed)
- T006 contract tests CONTINUE PASSING (schema validation correct)

**Dependencies:**
- T002 (environment config must exist)
- T010 (models must exist for orm_mode)

---

### T012: Service Layer - Wizard State CRUD

**Status:** TODO
**Priority:** P0 - Must complete before T013
**Estimated Time:** 90 minutes
**Parallel:** No

**Description:**
Implement WizardStateService with complete CRUD operations: create, get, update (with optimistic locking), delete, and history retrieval. Include audit log creation.

**Files to Create/Modify:**
- `/olorin-server/app/service/wizard_state_service.py` (NEW FILE - target ~180 lines)

**Implementation Steps:**
1. Create WizardStateService class with db: Session dependency
2. Implement create_state():
   - Check for existing state (409 Conflict if exists)
   - Create InvestigationState from Pydantic model
   - Commit to database
   - Create audit log entry (action_type=STATE_CREATED)
   - Return WizardStateResponse
3. Implement get_state():
   - Query by investigation_id and user_id
   - Return 404 if not found
   - Update last_accessed timestamp
   - Return WizardStateResponse
4. Implement update_state():
   - Query state by investigation_id and user_id
   - Check version for optimistic locking (409 Conflict if mismatch)
   - Track changes for audit log
   - Update modified fields
   - Increment version
   - Commit changes
   - Create audit log entry (action_type=STATE_UPDATED)
   - Return updated WizardStateResponse
5. Implement delete_state():
   - Query and verify user ownership
   - Create audit log entry (action_type=STATE_DELETED)
   - Delete state
   - Commit
6. Implement get_history():
   - Query audit log for investigation_id
   - Verify user has access to investigation
   - Return paginated audit entries
7. Implement _create_audit_entry() private helper
8. Keep file < 200 lines (modularize if needed)

**Reference:**
See `/specs/005-polling-and-persistence/quickstart.md` lines 576-795 for complete service implementation.

**Acceptance Criteria:**
- All CRUD operations functional
- Optimistic locking prevents concurrent update conflicts
- Audit log entries created for all state changes
- User isolation enforced (users can only access own states)
- File size < 200 lines
- T006 contract tests FULLY PASSING (all endpoints work)

**Dependencies:**
- T010 (models must exist)
- T011 (schemas must exist for validation)

---

### T013: API Routes - Wizard State Endpoints

**Status:** TODO
**Priority:** P0 - Must complete before T016
**Estimated Time:** 60 minutes
**Parallel:** No

**Description:**
Implement FastAPI router for wizard state with ALL 5 endpoints: POST, GET (with conditional GET), PUT, DELETE, and GET history. Include ETag support and authentication.

**Files to Create/Modify:**
- `/olorin-server/app/router/wizard_state_router.py` (NEW FILE - target ~100 lines)
- `/olorin-server/app/main.py` (MODIFY - register router)

**Implementation Steps:**
1. Create APIRouter with prefix="/wizard-state" and tags=["Wizard State"]
2. Implement POST / (create_wizard_state):
   - Require write permission (require_write dependency)
   - Call service.create_state()
   - Return 201 Created with WizardStateResponse
3. Implement GET /{investigation_id} (get_wizard_state):
   - Require read permission (require_read dependency)
   - Support If-None-Match header for conditional GET
   - Call service.get_state()
   - Return 304 Not Modified if ETag matches
   - Set ETag and Cache-Control headers
   - Return 200 OK with WizardStateResponse
4. Implement PUT /{investigation_id} (update_wizard_state):
   - Require write permission
   - Call service.update_state()
   - Handle 409 Conflict for version mismatch
   - Set new ETag header
   - Return 200 OK with updated WizardStateResponse
5. Implement DELETE /{investigation_id} (delete_wizard_state):
   - Require write permission
   - Call service.delete_state()
   - Return 204 No Content
6. Implement GET /{investigation_id}/history (get_wizard_state_history):
   - Require read permission
   - Support pagination (limit, offset query params)
   - Call service.get_history()
   - Return paginated audit log
7. Register router in main.py: app.include_router(wizard_state_router, prefix="/api/v1")
8. Keep file < 120 lines

**Reference:**
See `/specs/005-polling-and-persistence/quickstart.md` lines 799-913 for complete router implementation.

**Acceptance Criteria:**
- All 5 endpoints implemented and registered
- ETag conditional GET working (304 Not Modified)
- Optimistic locking enforced (409 Conflict)
- Authentication and authorization enforced
- Error responses match OpenAPI spec
- File size < 200 lines
- T006 contract tests FULLY PASSING with real implementation

**Dependencies:**
- T012 (service layer must exist)
- T011 (schemas must exist for request/response models)

---

### T014: Service Layer - Template Management

**Status:** TODO
**Priority:** P1 - Can be done in parallel with T013
**Estimated Time:** 75 minutes
**Parallel:** Yes [P] (after T012)

**Description:**
Implement TemplateService with complete template CRUD operations: list, create, get, update, delete, and apply template to new investigation. Include usage tracking.

**Files to Create/Modify:**
- `/olorin-server/app/service/template_service.py` (NEW FILE - target ~160 lines)

**Implementation Steps:**
1. Create TemplateService class with db: Session dependency
2. Implement list_templates():
   - Query templates by user_id
   - Support filtering by tags
   - Support pagination
   - Return list of templates
3. Implement create_template():
   - Validate template_json against InvestigationSettings schema
   - Create InvestigationTemplate
   - Commit to database
   - Return template response
4. Implement get_template():
   - Query by template_id and user_id
   - Return 404 if not found or not owned by user
   - Return template response
5. Implement update_template():
   - Query and verify ownership
   - Update fields
   - Increment version if needed
   - Commit changes
   - Return updated template
6. Implement delete_template():
   - Query and verify ownership
   - Soft delete if usage_count > 0
   - Hard delete if usage_count == 0
   - Commit
7. Implement apply_template():
   - Query template by template_id
   - Create new InvestigationState from template
   - Replace placeholders with entity_values
   - Apply overrides from request
   - Increment template usage_count
   - Update last_used timestamp
   - Commit
   - Return new investigation state
8. Keep file < 200 lines

**Acceptance Criteria:**
- All template CRUD operations functional
- Template JSON validates against InvestigationSettings schema
- Placeholder replacement works in apply endpoint
- Usage statistics tracked (usage_count, last_used)
- Soft delete for used templates
- File size < 200 lines
- T008 contract tests PASSING

**Dependencies:**
- T010 (models must exist)
- T011 (schemas must exist)
- T012 (service pattern established)

---

### T015: API Routes - Template Endpoints

**Status:** TODO
**Priority:** P1 - Must complete after T014
**Estimated Time:** 50 minutes
**Parallel:** No

**Description:**
Implement FastAPI router for template management with ALL 6 endpoints: GET list, POST create, GET retrieve, PUT update, DELETE, and POST apply.

**Files to Create/Modify:**
- `/olorin-server/app/router/template_router.py` (NEW FILE - target ~100 lines)
- `/olorin-server/app/main.py` (MODIFY - register router)

**Implementation Steps:**
1. Create APIRouter with prefix="/templates" and tags=["Templates"]
2. Implement GET / (list_templates):
   - Support filtering by tags query param
   - Support pagination (limit, offset)
   - Call service.list_templates()
3. Implement POST / (create_template):
   - Validate template JSON
   - Call service.create_template()
   - Return 201 Created
4. Implement GET /{template_id} (get_template):
   - Call service.get_template()
   - Return template or 404
5. Implement PUT /{template_id} (update_template):
   - Call service.update_template()
   - Return updated template
6. Implement DELETE /{template_id} (delete_template):
   - Call service.delete_template()
   - Return 204 No Content
7. Implement POST /{template_id}/apply (apply_template):
   - Call service.apply_template()
   - Return new investigation state (201 Created)
8. Register router in main.py
9. Keep file < 120 lines

**Acceptance Criteria:**
- All 6 template endpoints implemented
- Template JSON validation enforced
- Authentication and authorization enforced
- Error responses match OpenAPI spec
- File size < 200 lines
- T008 contract tests FULLY PASSING

**Dependencies:**
- T014 (template service must exist)

---

### T016: Service Layer - Adaptive Polling

**Status:** TODO
**Priority:** P1 - Must complete after T012
**Estimated Time:** 70 minutes
**Parallel:** Yes [P] (after T012)

**Description:**
Implement PollingService with adaptive polling logic, ETag support, delta changes, and rate limiting. Calculate recommended intervals based on investigation status.

**Files to Create/Modify:**
- `/olorin-server/app/service/polling_service.py` (NEW FILE - target ~140 lines)

**Implementation Steps:**
1. Create PollingService class with db: Session dependency
2. Implement poll_state():
   - Call WizardStateService.get_state()
   - Calculate recommended interval based on:
     - Fast (500ms): status=IN_PROGRESS AND wizard_step=PROGRESS
     - Normal (2s): status=IN_PROGRESS AND wizard_step=SETTINGS
     - Slow (5s): status=COMPLETED OR wizard_step=RESULTS
   - Support ETag conditional GET (return None for 304)
   - Return state with recommended_interval_ms
3. Implement poll_changes():
   - Query audit log since requested version
   - Return list of changes between versions
   - Include current state snapshot
   - Return None for 304 if no changes
4. Implement poll_active_investigations():
   - Query all user's active investigations
   - Return summary list with status and progress
   - Support pagination
   - Support filtering by status/wizard_step
5. Implement calculate_recommended_interval() helper:
   - Input: wizard_step, status
   - Output: interval in milliseconds
   - Use values from environment config
6. Implement is_rate_limited() helper:
   - Check user request count
   - Return True if exceeded limit
   - Use sliding window algorithm
7. Keep file < 160 lines

**Acceptance Criteria:**
- Adaptive polling intervals calculated correctly
- ETag conditional GET returns None for 304
- Delta changes retrieved efficiently
- Active investigations list filtered and paginated
- Rate limiting logic functional
- File size < 200 lines
- T007 contract tests PASSING

**Dependencies:**
- T012 (wizard state service must exist)
- T002 (polling config must exist)

---

### T017: API Routes - Polling Endpoints

**Status:** TODO
**Priority:** P1 - Must complete after T016
**Estimated Time:** 55 minutes
**Parallel:** No

**Description:**
Implement FastAPI router for adaptive polling with ALL 4 endpoints: poll state, poll changes, poll active investigations, and health check.

**Files to Create/Modify:**
- `/olorin-server/app/router/polling_router.py` (NEW FILE - target ~110 lines)
- `/olorin-server/app/main.py` (MODIFY - register router)

**Implementation Steps:**
1. Create APIRouter with prefix="/polling" and tags=["Polling"]
2. Implement GET /wizard-state/{investigation_id} (poll_wizard_state):
   - Support If-None-Match header
   - Support X-Polling-Interval header for analytics
   - Call service.poll_state()
   - Return 304 Not Modified if no changes
   - Set X-Recommended-Interval header
   - Return 200 with state or 304
3. Implement GET /wizard-state/{investigation_id}/changes (poll_wizard_state_changes):
   - Support since_version query param
   - Support include_snapshot query param
   - Call service.poll_changes()
   - Return 304 if no changes
   - Return 200 with changes list
4. Implement GET /active-investigations (poll_active_investigations):
   - Support filtering (status, wizard_step query params)
   - Support pagination (limit, offset)
   - Support If-None-Match for list ETag
   - Call service.poll_active_investigations()
   - Return paginated list
5. Implement GET /health (get_polling_health):
   - NO authentication required (security: [])
   - Return server health status
   - Return recommended intervals based on current load
   - Return 200 healthy or 503 unavailable
6. Add rate limiting middleware (429 Too Many Requests)
7. Register router in main.py
8. Keep file < 130 lines

**Acceptance Criteria:**
- All 4 polling endpoints implemented
- ETag conditional GET working
- Rate limiting enforced with Retry-After header
- Health check works without authentication
- Recommended intervals in response headers
- File size < 200 lines
- T007 contract tests FULLY PASSING

**Dependencies:**
- T016 (polling service must exist)

---

### T018: Rate Limiting Middleware

**Status:** TODO
**Priority:** P1 - Must complete before T017
**Estimated Time:** 40 minutes
**Parallel:** Yes [P] (after T002)

**Description:**
Implement rate limiting middleware for polling endpoints using sliding window algorithm. Return 429 Too Many Requests with Retry-After header when limit exceeded.

**Files to Create/Modify:**
- `/olorin-server/app/middleware/rate_limiter.py` (NEW FILE - target ~80 lines)
- `/olorin-server/app/main.py` (MODIFY - add middleware)

**Implementation Steps:**
1. Create RateLimiter class with sliding window algorithm
2. Use Redis or in-memory cache for request counting
3. Configuration from environment:
   - RATE_LIMIT_REQUESTS_PER_MINUTE (default: 100)
   - RATE_LIMIT_BURST (default: 20)
4. Track requests per user_id
5. Return 429 with headers:
   - Retry-After (seconds)
   - X-RateLimit-Limit
   - X-RateLimit-Remaining
   - X-RateLimit-Reset (unix timestamp)
6. Apply only to /polling/* endpoints
7. Keep file < 100 lines

**Acceptance Criteria:**
- Rate limiting enforces configured limits
- 429 response includes required headers
- Sliding window algorithm prevents burst abuse
- Only polling endpoints rate limited
- File size < 200 lines
- T007 contract tests PASSING (rate limit scenarios)

**Dependencies:**
- T002 (rate limit config must exist)

---

## Core Frontend Implementation

### T019: TypeScript Types and Interfaces

**Status:** TODO
**Priority:** P0 - Must complete before T020
**Estimated Time:** 50 minutes
**Parallel:** No

**Description:**
Create TypeScript type definitions that mirror backend Pydantic schemas. Include all enums, interfaces for entities, wizard state, polling config, and store types.

**Files to Create/Modify:**
- `/olorin-front/src/shared/types/wizardState.ts` (NEW FILE - target ~160 lines)

**Implementation Steps:**
1. Create enums (4): WizardStep, InvestigationStatus, EntityType, CorrelationMode
2. Create entity interfaces (3):
   - Entity (entity_type, entity_value)
   - TimeRange (start_time, end_time)
   - ToolSelection (tool_name, enabled, config)
3. Create settings interface: InvestigationSettings
4. Create progress interfaces (3):
   - InvestigationPhase
   - ToolExecution
   - InvestigationProgress
5. Create results interface: InvestigationResults
6. Create state interfaces (3):
   - WizardState (main interface)
   - WizardStateCreate (creation payload)
   - WizardStateUpdate (update payload with version)
7. Create polling interfaces (2):
   - PollingConfig (intervals, retries, backoff)
   - PollingState (isPolling, currentInterval, retryCount)
8. Create store interface: WizardStoreState (state + actions)
9. Keep file < 180 lines (split if needed)

**Reference:**
See `/specs/005-polling-and-persistence/quickstart.md` lines 919-1084 for complete type definitions.

**Acceptance Criteria:**
- All types match backend Pydantic schemas
- Enums use string literal types
- Optional fields correctly marked with ?
- Store interface includes both state and actions
- File size < 200 lines
- TypeScript compilation succeeds with strict mode

**Dependencies:**
- T011 (backend schemas define the contract)

---

### T020: API Service - Wizard State

**Status:** TODO
**Priority:** P0 - Must complete before T021
**Estimated Time:** 65 minutes
**Parallel:** No

**Description:**
Implement WizardStateService TypeScript class with Axios HTTP client for all CRUD operations. Include configuration validation with Zod, ETag support, and error handling.

**Files to Create/Modify:**
- `/olorin-front/src/shared/services/wizardStateService.ts` (NEW FILE - target ~150 lines)

**Implementation Steps:**
1. Create Zod schema for configuration validation:
   - apiBaseUrl (URL)
   - requestTimeoutMs (positive integer)
   - authToken (non-empty string)
2. Implement loadConfig() function:
   - Load from process.env
   - Validate with Zod
   - Fail-fast if invalid
3. Create WizardStateService class:
   - Axios client with base URL and timeout
   - Authorization header with Bearer token
4. Implement createState():
   - POST /wizard-state
   - Return WizardState or throw error
5. Implement getState():
   - GET /wizard-state/{id}
   - Support If-None-Match header (ETag)
   - Return WizardState, null (304), or null (404)
6. Implement updateState():
   - PUT /wizard-state/{id}
   - Include version for optimistic locking
   - Handle 409 Conflict (version mismatch)
   - Return updated WizardState
7. Implement deleteState():
   - DELETE /wizard-state/{id}
   - Return void
8. Implement getHistory():
   - GET /wizard-state/{id}/history
   - Support pagination
   - Return audit log entries
9. Add error handling with clear error messages
10. Export singleton instance
11. Keep file < 170 lines

**Reference:**
See `/specs/005-polling-and-persistence/quickstart.md` lines 1086-1271 for complete service implementation.

**Acceptance Criteria:**
- Configuration loaded and validated with Zod
- All CRUD operations implemented
- ETag conditional GET supported
- Optimistic locking conflict handled
- Error responses logged clearly
- Singleton instance exported
- File size < 200 lines
- Can successfully call T013 backend endpoints

**Dependencies:**
- T019 (TypeScript types must exist)
- T013 (backend endpoints must exist)

---

### T021: React Hook - useWizardState

**Status:** TODO
**Priority:** P0 - Must complete before T022
**Estimated Time:** 60 minutes
**Parallel:** No

**Description:**
Create custom React hook for wizard state management with local/server state synchronization, optimistic updates, conflict detection, and error handling.

**Files to Create/Modify:**
- `/olorin-front/src/shared/hooks/useWizardState.ts` (NEW FILE - target ~120 lines)

**Implementation Steps:**
1. Create useWizardState hook with investigation_id parameter
2. Manage local state:
   - wizardState (current state)
   - localChanges (unsaved changes)
   - serverState (last known server state)
   - isLoading, isSyncing, error
3. Implement loadState():
   - Call wizardStateService.getState()
   - Set wizardState and serverState
   - Clear localChanges
   - Handle errors
4. Implement updateState():
   - Apply changes locally (optimistic update)
   - Track localChanges
   - Call wizardStateService.updateState()
   - On success: update serverState
   - On 409 conflict: merge and retry
   - On error: revert to serverState
5. Implement syncWithServer():
   - Compare localChanges with serverState
   - Detect conflicts
   - Merge changes if possible
   - Prompt user if manual resolution needed
6. Implement deleteState()
7. Return hook interface: { wizardState, localChanges, isLoading, isSyncing, error, updateState, loadState, syncWithServer, deleteState }
8. Keep file < 140 lines

**Acceptance Criteria:**
- Hook manages local and server state separately
- Optimistic updates applied immediately
- Conflicts detected and handled gracefully
- Loading and error states exposed
- Sync function reconciles differences
- File size < 200 lines
- Hook can be used in React components

**Dependencies:**
- T020 (API service must exist)
- T019 (TypeScript types must exist)

---

### T022: Zustand Store - Wizard State Management

**Status:** TODO
**Priority:** P0 - Must complete before T023
**Estimated Time:** 70 minutes
**Parallel:** No

**Description:**
Create Zustand store for global wizard state management with persistence and polling control.

**Files to Create/Modify:**
- `/olorin-front/src/shared/store/wizardStore.ts` (NEW FILE - target ~160 lines)

**Implementation Steps:**
1. Create Zustand store with WizardStoreState interface
2. Initialize state:
   - wizardState: null
   - serverState: null
   - localChanges: null
   - isLoading: false
   - isSyncing: false
   - error: null
   - polling: PollingState
3. Implement actions:
   - createState(data): Call service, update state
   - loadState(id): Fetch from API, update state
   - updateState(updates): Apply locally, sync with server
   - deleteState(id): Call service, clear state
   - startPolling(id): Begin polling loop
   - stopPolling(): Stop polling loop
   - syncWithServer(id): Force sync, resolve conflicts
4. Add persistence middleware (localStorage)
5. Add optimistic locking version tracking
6. Keep file < 180 lines (split if needed)

**Acceptance Criteria:**
- Zustand store created with all actions
- State persisted to localStorage
- Optimistic updates applied immediately
- Polling control functions exposed
- File size < 200 lines
- Store can be used in React components

**Dependencies:**
- T021 (hook pattern established)
- T020 (API service must exist)

---

### T023: Polling Hook - useWizardPolling

**Status:** TODO
**Priority:** P1 - Must complete after T022
**Estimated Time:** 80 minutes
**Parallel:** No

**Description:**
Create custom React hook for adaptive polling with exponential backoff, ETag caching, automatic interval adjustment, and polling lifecycle management.

**Files to Create/Modify:**
- `/olorin-front/src/shared/hooks/useWizardPolling.ts` (NEW FILE - target ~140 lines)

**Implementation Steps:**
1. Create useWizardPolling hook with investigation_id parameter
2. Load polling config from environment:
   - fastInterval (500ms)
   - normalInterval (2s)
   - slowInterval (5s)
   - maxRetries (3)
   - backoffMultiplier (2)
   - maxBackoff (30s)
3. Manage polling state:
   - isPolling: boolean
   - currentInterval: number
   - retryCount: number
   - lastETag: string | null
   - lastPollTime: Date | null
4. Implement startPolling():
   - Begin polling loop with setInterval
   - Calculate initial interval based on wizard_step and status
   - Store interval ID for cleanup
5. Implement poll():
   - Call wizardStateService.getState(id, lastETag)
   - If 304: no update needed
   - If 200: update store with new state, update lastETag
   - If error: apply exponential backoff
   - Adjust interval based on response headers (X-Recommended-Interval)
6. Implement stopPolling():
   - Clear interval
   - Reset polling state
7. Implement calculateInterval():
   - Fast (500ms): status=IN_PROGRESS && wizard_step=PROGRESS
   - Normal (2s): status=IN_PROGRESS && wizard_step=SETTINGS
   - Slow (5s): status=COMPLETED || wizard_step=RESULTS
8. Implement handleError():
   - Increment retryCount
   - Apply exponential backoff: currentInterval *= 2
   - Cap at maxBackoff (30s)
   - Stop after maxRetries exceeded
9. Add cleanup on unmount (stop polling)
10. Keep file < 160 lines

**Acceptance Criteria:**
- Adaptive polling adjusts intervals dynamically
- ETag caching prevents redundant data transfer
- Exponential backoff on errors
- Server-recommended intervals respected
- Polling stops on unmount
- File size < 200 lines
- Hook integrates with Zustand store

**Dependencies:**
- T022 (Zustand store must exist)
- T017 (polling endpoints must exist)

---

### T024: API Service - Polling Client

**Status:** TODO
**Priority:** P1 - Must complete after T017
**Estimated Time:** 55 minutes
**Parallel:** Yes [P] (after T017)

**Description:**
Implement PollingService TypeScript class for adaptive polling endpoints: poll state, poll changes, poll active investigations, and health check.

**Files to Create/Modify:**
- `/olorin-front/src/shared/services/pollingService.ts` (NEW FILE - target ~110 lines)

**Implementation Steps:**
1. Create PollingService class with Axios client
2. Implement pollState():
   - GET /polling/wizard-state/{id}
   - Support If-None-Match header
   - Send X-Polling-Interval for analytics
   - Parse X-Recommended-Interval from response
   - Return { state, recommendedInterval } or null (304)
3. Implement pollChanges():
   - GET /polling/wizard-state/{id}/changes
   - Send since_version query param
   - Support include_snapshot query param
   - Return { changes, currentSnapshot } or null (304)
4. Implement pollActiveInvestigations():
   - GET /polling/active-investigations
   - Support filtering (status, wizard_step)
   - Support pagination (limit, offset)
   - Support If-None-Match for list ETag
   - Return { investigations, total, limit, offset }
5. Implement getHealth():
   - GET /polling/health (NO auth required)
   - Return { status, recommended_intervals, server_load }
6. Add error handling with retry logic
7. Export singleton instance
8. Keep file < 130 lines

**Acceptance Criteria:**
- All 4 polling endpoints implemented
- ETag conditional GET supported
- Recommended intervals extracted from headers
- Health check works without authentication
- Error handling with clear messages
- File size < 200 lines
- Can successfully call T017 backend endpoints

**Dependencies:**
- T019 (TypeScript types must exist)
- T017 (backend polling endpoints must exist)

---

### T025: API Service - Template Client

**Status:** TODO
**Priority:** P2 - Can be done in parallel with T024
**Estimated Time:** 50 minutes
**Parallel:** Yes [P] (after T015)

**Description:**
Implement TemplateService TypeScript class for template management: list, create, get, update, delete, and apply template.

**Files to Create/Modify:**
- `/olorin-front/src/shared/services/templateService.ts` (NEW FILE - target ~100 lines)

**Implementation Steps:**
1. Create TemplateService class with Axios client
2. Implement listTemplates():
   - GET /templates
   - Support filtering by tags
   - Support pagination
   - Return list of templates
3. Implement createTemplate():
   - POST /templates
   - Validate template JSON
   - Return created template
4. Implement getTemplate():
   - GET /templates/{id}
   - Return template or null (404)
5. Implement updateTemplate():
   - PUT /templates/{id}
   - Return updated template
6. Implement deleteTemplate():
   - DELETE /templates/{id}
   - Return void
7. Implement applyTemplate():
   - POST /templates/{id}/apply
   - Send entity values and overrides
   - Return new investigation state
8. Add error handling
9. Export singleton instance
10. Keep file < 120 lines

**Acceptance Criteria:**
- All 6 template endpoints implemented
- Template JSON validation enforced
- Error handling with clear messages
- File size < 200 lines
- Can successfully call T015 backend endpoints

**Dependencies:**
- T019 (TypeScript types must exist)
- T015 (backend template endpoints must exist)

---

### T026: React Component - Wizard State Display

**Status:** TODO
**Priority:** P2 - Can be done in parallel with T027
**Estimated Time:** 45 minutes
**Parallel:** Yes [P] (after T023)

**Description:**
Create React component to display wizard state with real-time updates from polling. Show current step, progress, status, and sync indicators.

**Files to Create/Modify:**
- `/olorin-front/src/shared/components/WizardStateDisplay.tsx` (NEW FILE - target ~90 lines)

**Implementation Steps:**
1. Create WizardStateDisplay component accepting investigation_id prop
2. Use useWizardPolling hook to fetch state
3. Use Zustand store to access wizard state
4. Display wizard step (SETTINGS, PROGRESS, RESULTS)
5. Display status badge (IN_PROGRESS, COMPLETED, ERROR, CANCELLED)
6. Display progress bar if wizard_step=PROGRESS
7. Display sync indicators:
   - Green dot: synced with server
   - Yellow dot: local changes pending
   - Red dot: sync error
   - Gray dot: not polling
8. Show last updated timestamp
9. Add loading skeleton for initial load
10. Keep file < 100 lines

**Acceptance Criteria:**
- Component displays current wizard state
- Real-time updates from polling visible
- Sync status clearly indicated
- Loading states handled gracefully
- File size < 200 lines
- Component can be used in investigation pages

**Dependencies:**
- T023 (polling hook must exist)
- T022 (Zustand store must exist)

---

### T027: React Component - Template Selector

**Status:** TODO
**Priority:** P2 - Can be done in parallel with T026
**Estimated Time:** 50 minutes
**Parallel:** Yes [P] (after T025)

**Description:**
Create React component for template selection and application. Allow users to browse templates, preview settings, and apply to new investigations.

**Files to Create/Modify:**
- `/olorin-front/src/shared/components/TemplateSelector.tsx` (NEW FILE - target ~100 lines)

**Implementation Steps:**
1. Create TemplateSelector component
2. Use templateService to fetch templates
3. Display template list with:
   - Name and description
   - Tags (filterable)
   - Usage count
   - Last used date
4. Add template preview modal:
   - Show template JSON settings
   - List entities, time range, tools
5. Add "Apply Template" button:
   - Prompt for entity values
   - Allow overrides (time range, etc.)
   - Call templateService.applyTemplate()
   - Navigate to new investigation on success
6. Add loading and error states
7. Keep file < 120 lines

**Acceptance Criteria:**
- Component displays template list
- Templates filterable by tags
- Template preview shows settings
- Apply template creates new investigation
- File size < 200 lines
- Component can be used in investigation wizard

**Dependencies:**
- T025 (template service must exist)
- T022 (Zustand store must exist)

---

## Integration

### T028: Integration - Database Connection Pooling

**Status:** TODO
**Priority:** P1 - Can be done in parallel with T030
**Estimated Time:** 35 minutes
**Parallel:** Yes [P] (after T010)

**Description:**
Configure SQLAlchemy database connection pooling with proper pool size, overflow limits, connection lifecycle management, and health checks.

**Files to Create/Modify:**
- `/olorin-server/app/persistence/database.py` (MODIFY - enhance connection pooling)

**Implementation Steps:**
1. Update database initialization with connection pooling:
   - pool_size from environment (DB_POOL_SIZE, default: 5)
   - max_overflow from environment (DB_MAX_OVERFLOW, default: 10)
   - pool_timeout (default: 30s)
   - pool_recycle (default: 3600s)
   - pool_pre_ping enabled for connection health checks
2. Add get_db() dependency for FastAPI:
   - Create session from SessionLocal
   - Yield session for request
   - Close session after request
   - Handle exceptions with rollback
3. Add connection health check:
   - Ping database on startup
   - Fail-fast if connection fails
4. Add logging for connection pool metrics
5. Keep changes < 30 lines

**Acceptance Criteria:**
- Connection pool configured from environment
- Pool size and overflow limits enforced
- Connection health checks on startup
- Sessions properly managed per request
- Database failures logged clearly
- All database-dependent tests PASSING

**Dependencies:**
- T010 (models must exist)
- T002 (database config must exist)

---

### T029: Integration - Logging and Monitoring

**Status:** TODO
**Priority:** P2 - Can be done in parallel with T028
**Estimated Time:** 40 minutes
**Parallel:** Yes [P] (after T002)

**Description:**
Configure structured logging for backend and frontend with appropriate log levels, log rotation, and monitoring hooks for errors and performance metrics.

**Files to Create/Modify:**
- `/olorin-server/app/config/logging_config.py` (NEW FILE - target ~60 lines)
- `/olorin-front/src/shared/utils/logger.ts` (NEW FILE - target ~50 lines)

**Implementation Steps:**
1. Backend logging configuration:
   - Use Python logging module
   - Configure log level from environment (LOG_LEVEL, default: INFO)
   - Add structured logging format (JSON)
   - Log to stdout (container-friendly)
   - Add request ID to all logs (middleware)
   - Log all API requests with latency
   - Log all database queries (if DEBUG)
2. Frontend logging configuration:
   - Create logger utility with log levels
   - Log to console in development
   - Send errors to monitoring service in production (optional)
   - Add request ID to API calls
   - Log all API errors
   - Log polling state changes
3. Add performance metrics logging:
   - API endpoint latency
   - Database query latency
   - Polling interval adjustments
4. Keep each file < 70 lines

**Acceptance Criteria:**
- Structured logging configured for backend
- Log levels configurable via environment
- Request IDs added to all logs
- Frontend errors logged clearly
- Performance metrics captured
- All files < 200 lines

**Dependencies:**
- T002 (logging config must exist)

---

## Polish & Validation

### T033: [P] Unit Tests - Backend Services

**Status:** TODO
**Priority:** P2 - Can be done in parallel with T034
**Estimated Time:** 90 minutes
**Parallel:** Yes [P] (after T012, T014, T016)

**Description:**
Create comprehensive unit tests for backend services: WizardStateService, TemplateService, PollingService. Achieve 30%+ code coverage.

**Files to Create/Modify:**
- `/olorin-server/test/unit/test_wizard_state_service.py` (NEW FILE)
- `/olorin-server/test/unit/test_template_service.py` (NEW FILE)
- `/olorin-server/test/unit/test_polling_service.py` (NEW FILE)

**Implementation Steps:**
1. Test WizardStateService (target: 15 tests):
   - test_create_state_success
   - test_create_state_duplicate_conflict
   - test_get_state_success
   - test_get_state_not_found
   - test_get_state_updates_last_accessed
   - test_update_state_success
   - test_update_state_version_conflict
   - test_update_state_not_found
   - test_delete_state_success
   - test_delete_state_not_found
   - test_get_history_success
   - test_get_history_pagination
   - test_audit_log_creation
   - test_user_isolation (users can't access other users' states)
   - test_optimistic_locking_prevents_concurrent_updates
2. Test TemplateService (target: 10 tests):
   - test_create_template_success
   - test_list_templates_filtered_by_tags
   - test_get_template_success
   - test_update_template_success
   - test_delete_template_soft_delete_if_used
   - test_delete_template_hard_delete_if_unused
   - test_apply_template_success
   - test_apply_template_replaces_placeholders
   - test_apply_template_increments_usage_count
   - test_template_json_validation
3. Test PollingService (target: 8 tests):
   - test_poll_state_fast_interval
   - test_poll_state_normal_interval
   - test_poll_state_slow_interval
   - test_poll_state_returns_none_for_304
   - test_poll_changes_returns_delta
   - test_poll_active_investigations_filtered
   - test_poll_active_investigations_paginated
   - test_rate_limiting_enforced
4. Use pytest fixtures for database setup/teardown
5. Use mocking for external dependencies
6. Run coverage report: `poetry run pytest --cov`
7. Ensure coverage >= 30%

**Acceptance Criteria:**
- 33+ unit tests created (15 + 10 + 8)
- All tests pass successfully
- Coverage >= 30% for services
- Tests run in isolation with proper cleanup
- Each test file < 200 lines

**Dependencies:**
- T012 (wizard state service must exist)
- T014 (template service must exist)
- T016 (polling service must exist)

---

### T034: [P] Unit Tests - Frontend Hooks and Services

**Status:** TODO
**Priority:** P2 - Can be done in parallel with T033
**Estimated Time:** 80 minutes
**Parallel:** Yes [P] (after T021, T023, T024)

**Description:**
Create comprehensive unit tests for frontend hooks and services: useWizardState, useWizardPolling, wizardStateService, pollingService. Achieve 30%+ code coverage.

**Files to Create/Modify:**
- `/olorin-front/src/shared/hooks/__tests__/useWizardState.test.ts` (NEW FILE)
- `/olorin-front/src/shared/hooks/__tests__/useWizardPolling.test.ts` (NEW FILE)
- `/olorin-front/src/shared/services/__tests__/wizardStateService.test.ts` (NEW FILE)
- `/olorin-front/src/shared/services/__tests__/pollingService.test.ts` (NEW FILE)

**Implementation Steps:**
1. Test useWizardState (target: 10 tests):
   - test_loadState_success
   - test_updateState_optimistic_update
   - test_updateState_conflict_resolution
   - test_updateState_revert_on_error
   - test_syncWithServer_merge_changes
   - test_syncWithServer_detect_conflicts
   - test_deleteState_success
   - test_loading_states
   - test_error_handling
   - test_local_changes_tracking
2. Test useWizardPolling (target: 10 tests):
   - test_startPolling_begins_interval
   - test_stopPolling_clears_interval
   - test_adaptive_interval_fast
   - test_adaptive_interval_normal
   - test_adaptive_interval_slow
   - test_etag_caching_returns_304
   - test_exponential_backoff_on_error
   - test_respect_server_recommended_interval
   - test_stop_after_max_retries
   - test_cleanup_on_unmount
3. Test wizardStateService (target: 8 tests):
   - test_config_validation_fails_on_invalid
   - test_createState_success
   - test_getState_with_etag_returns_null_for_304
   - test_updateState_handles_409_conflict
   - test_deleteState_success
   - test_error_handling_with_clear_messages
   - test_authorization_header_included
   - test_timeout_enforced
4. Test pollingService (target: 5 tests):
   - test_pollState_returns_recommended_interval
   - test_pollChanges_returns_delta
   - test_pollActiveInvestigations_paginated
   - test_getHealth_no_auth_required
   - test_etag_support
5. Use React Testing Library for hooks
6. Use jest.mock() for API mocking
7. Run coverage report: `npm run test:coverage`
8. Ensure coverage >= 30%

**Acceptance Criteria:**
- 33+ unit tests created (10 + 10 + 8 + 5)
- All tests pass successfully
- Coverage >= 30% for hooks and services
- Tests use React Testing Library best practices
- Each test file < 200 lines

**Dependencies:**
- T021 (useWizardState must exist)
- T023 (useWizardPolling must exist)
- T020 (wizardStateService must exist)
- T024 (pollingService must exist)

---

### T030: [P] Integration Tests - End-to-End Flow

**Status:** TODO
**Priority:** P2 - Can be done in parallel with T030/T031
**Estimated Time:** 60 minutes
**Parallel:** Yes [P] (after T028)

**Description:**
Create end-to-end integration tests that validate the complete flow: create investigation → poll for updates → update UI → complete investigation.

**Files to Create/Modify:**
- `/olorin-server/test/integration/test_wizard_state_e2e.py` (NEW FILE)
- `/olorin-front/src/__tests__/integration/wizardStateFlow.test.tsx` (NEW FILE)

**Implementation Steps:**
1. Backend integration test (target: 5 scenarios):
   - test_complete_investigation_lifecycle:
     - Create state → Update to PROGRESS → Update progress → Update to RESULTS → Get final state
   - test_optimistic_locking_prevents_conflicts:
     - Create state → Two concurrent updates → One succeeds, one gets 409
   - test_audit_log_tracks_all_changes:
     - Create → Update → Delete → Verify audit log has all entries
   - test_template_application_creates_investigation:
     - Create template → Apply template → Verify investigation created
   - test_polling_returns_correct_intervals:
     - Create state in SETTINGS → Poll → Verify 2s interval
     - Update to PROGRESS → Poll → Verify 500ms interval
     - Update to RESULTS → Poll → Verify 5s interval
2. Frontend integration test (target: 2 scenarios):
   - test_create_and_poll_investigation:
     - Render component → Create state → Start polling → Verify UI updates
   - test_template_application_flow:
     - Select template → Apply with entity values → Verify new investigation created
3. Use TestClient for FastAPI testing
4. Use React Testing Library + MSW for frontend
5. Run with `poetry run pytest -m integration`
6. Each test file < 150 lines

**Acceptance Criteria:**
- 7+ integration tests created (5 backend + 2 frontend)
- All tests pass successfully
- Tests validate end-to-end flows
- Tests run in isolated environments
- Each test file < 200 lines

**Dependencies:**
- T028 (database connection must exist)
- T013 (wizard state endpoints must exist)

---

### T031: [P] Performance Testing - Polling and Persistence

**Status:** TODO
**Priority:** P2 - Can be done in parallel with T029/T030
**Estimated Time:** 45 minutes
**Parallel:** Yes [P] (after T028)

**Description:**
Create performance tests to validate latency requirements: <200ms p95 polling, <50ms state persistence. Test under load.

**Files to Create/Modify:**
- `/olorin-server/test/performance/test_polling_performance.py` (NEW FILE)
- `/olorin-server/test/performance/test_persistence_performance.py` (NEW FILE)

**Implementation Steps:**
1. Test polling performance:
   - test_polling_latency_under_100_concurrent_users:
     - Simulate 100 concurrent polling requests
     - Measure p95 latency
     - Assert p95 < 200ms
   - test_adaptive_interval_adjustment_performance:
     - Measure interval calculation time
     - Assert < 10ms overhead
   - test_etag_304_response_faster_than_200:
     - Compare latency: 304 vs 200
     - Assert 304 is at least 20% faster
2. Test state persistence performance:
   - test_database_write_latency:
     - Create 100 states sequentially
     - Measure average write time
     - Assert average < 50ms
   - test_database_read_latency:
     - Read 100 states sequentially
     - Measure average read time
     - Assert average < 30ms
3. Use locust or pytest-benchmark for load testing
4. Generate performance report with graphs
5. Each test file < 100 lines

**Acceptance Criteria:**
- All performance requirements validated
- p95 polling latency < 200ms
- State persistence < 50ms
- Performance report generated
- Each test file < 200 lines

**Dependencies:**
- T028 (database connection pooling must exist)
- T017 (polling endpoints must exist)

---

### T032: [P] Documentation - API Documentation and Examples

**Status:** TODO
**Priority:** P2 - Can be done in parallel with T029-T031
**Estimated Time:** 45 minutes
**Parallel:** Yes [P] (after T013, T015, T017)

**Description:**
Generate interactive API documentation using Swagger UI from OpenAPI specs. Add usage examples and integration guide.

**Files to Create/Modify:**
- `/olorin-server/app/main.py` (MODIFY - enable Swagger UI)
- `/docs/api/wizard-state-api-guide.md` (NEW FILE)

**Implementation Steps:**
1. Enable Swagger UI in FastAPI:
   - Set openapi_url="/api/v1/openapi.json"
   - Set docs_url="/docs"
   - Set redoc_url="/redoc"
2. Add API metadata:
   - Title: "Olorin Investigation Wizard State API"
   - Version: "1.0.0"
   - Description from contracts/README.md
3. Test Swagger UI:
   - Visit http://localhost:8090/docs
   - Verify all endpoints listed
   - Test "Try it out" for each endpoint
4. Create API guide document:
   - Authentication setup
   - Common workflows (create → poll → update → complete)
   - Error handling examples
   - Rate limiting explanation
   - Polling strategy and adaptive intervals
5. Add code examples in multiple languages:
   - Python (using requests)
   - TypeScript (using Axios)
   - cURL commands
6. Keep documentation < 150 lines

**Acceptance Criteria:**
- Swagger UI accessible at /docs
- All endpoints documented with examples
- API guide created with common workflows
- Code examples provided in multiple languages
- Documentation < 200 lines per file

**Dependencies:**
- T013 (wizard state endpoints must exist)
- T015 (template endpoints must exist)
- T017 (polling endpoints must exist)

---

### T033: [P] Documentation - Implementation Guide and Troubleshooting

**Status:** TODO
**Priority:** P2 - Can be done in parallel with T029-T032
**Estimated Time:** 40 minutes
**Parallel:** Yes [P] (after T029)

**Description:**
Create comprehensive implementation guide with setup instructions, troubleshooting tips, and common issues/solutions.

**Files to Create/Modify:**
- `/specs/005-polling-and-persistence/IMPLEMENTATION.md` (NEW FILE)
- `/specs/005-polling-and-persistence/TROUBLESHOOTING.md` (NEW FILE)

**Implementation Steps:**
1. Create IMPLEMENTATION.md:
   - Prerequisites checklist
   - Step-by-step setup guide
   - Environment configuration
   - Database migration instructions
   - Backend startup instructions
   - Frontend startup instructions
   - Verification checklist
2. Create TROUBLESHOOTING.md:
   - Common issues and solutions:
     - "Polling not updating UI" → Verify polling interval, check network connectivity
     - "Version conflict errors" → Explain optimistic locking, how to resolve
     - "Database migration fails" → Check SQL syntax, verify foreign keys
     - "Rate limit exceeded" → Explain rate limiting, how to adjust
     - "ETag caching issues" → Clear browser cache, verify ETag headers
   - Debug logging instructions
   - Performance troubleshooting tips
   - FAQ section
3. Add diagrams if helpful (sequence diagrams for flows)
4. Keep each document < 120 lines

**Acceptance Criteria:**
- Implementation guide complete with all steps
- Troubleshooting guide covers common issues
- All documentation clear and actionable
- Each document < 200 lines

**Dependencies:**
- T029 (logging must exist for debug instructions)

---

## Summary

**Total Tasks:** 33
**Estimated Total Time:** 9-11 hours
**Parallel Tasks:** 13 tasks can be done in parallel (marked with [P])

**Critical Path (longest dependency chain):**
T001 → T002 → T003 → T010 → T011 → T012 → T013 → T016 → T017 → T023 → T028

**Minimum Sequential Time:** ~6 hours (if all [P] tasks done in parallel)

**Coverage Goals:**
- Contract tests: 3 files (wizard-state, polling, templates), 100% contract coverage
- Unit tests: ~66 tests, 30%+ code coverage
- Integration tests: 7 scenarios (5 backend + 2 frontend), end-to-end validation
- Performance tests: 2 files (polling, persistence), validate latency requirements

**Polling Strategy:**
- Fast (500ms): status=IN_PROGRESS AND wizard_step=PROGRESS
- Normal (2s): status=IN_PROGRESS AND wizard_step=SETTINGS
- Slow (5s): status=COMPLETED OR wizard_step=RESULTS
- Adaptive interval adjustment based on server recommendations
- ETag-based conditional GET for efficient polling (304 Not Modified)
- Exponential backoff on errors (2x multiplier, max 30s)
- Rate limiting: 100 req/min default (configurable)

**File Size Compliance:**
- All files designed to be < 200 lines
- Modular architecture with clear separation of concerns
- Split files if approaching 180 lines

**Next Steps After Completion:**
1. Run full test suite: `poetry run tox` (backend) + `npm test` (frontend)
2. Verify coverage: `poetry run pytest --cov` >= 30%
3. Run performance tests: Validate p95 polling latency < 200ms
4. Deploy to staging environment
5. Run smoke tests in staging
6. Monitor logs for errors
7. Deploy to production
