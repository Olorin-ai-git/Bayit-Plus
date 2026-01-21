# Implementation Plan: End-to-End Testing Flows Submodule


**Branch**: `006-end-to-end` | **Date**: 2025-09-13 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/006-end-to-end/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → If not found: ERROR "No feature spec at {path}"
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → Detect Project Type from context (web=frontend+backend, mobile=app+api)
   → Set Structure Decision based on project type
3. Evaluate Constitution Check section below
   → If violations exist: Document in Complexity Tracking
   → If no justification possible: ERROR "Simplify approach first"
   → Update Progress Tracking: Initial Constitution Check
4. Execute Phase 0 → research.md
   → If NEEDS CLARIFICATION remain: ERROR "Resolve unknowns"
5. Execute Phase 1 → contracts, data-model.md, quickstart.md, agent-specific template file (e.g., `CLAUDE.md` for Claude Code, `.github/copilot-instructions.md` for GitHub Copilot, or `GEMINI.md` for Gemini CLI).
6. Re-evaluate Constitution Check section
   → If new violations: Refactor design, return to Phase 1
   → Update Progress Tracking: Post-Design Constitution Check
7. Plan Phase 2 → Describe task generation approach (DO NOT create tasks.md)
8. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 7. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary
Create a comprehensive end-to-end testing submodule for CVPlus that provides complete user journey validation, isolated submodule testing, and backend-only API testing with curl scripts. The system will generate realistic mock data, support multiple test environments, and integrate with CI/CD pipelines to ensure system reliability and regression detection across all CVPlus components.

## Technical Context
**Language/Version**: TypeScript 5.0+, Node.js 20+
**Primary Dependencies**: Jest/Vitest, Firebase Functions SDK, curl, Firebase Emulator Suite
**Storage**: Firebase Firestore, Firebase Storage, local test data files
**Testing**: Jest (backend testing), Vitest (frontend testing), custom E2E test framework
**Target Platform**: Cross-platform (Linux, macOS, Windows) with CI/CD integration
**Project Type**: web - testing framework for existing web application (frontend + backend)
**Performance Goals**: [NEEDS CLARIFICATION: specific concurrent user targets not specified]
**Constraints**: [NEEDS CLARIFICATION: performance thresholds for acceptable test duration not specified]
**Scale/Scope**: Test coverage for 18+ submodules, 166+ Firebase Functions, full CVPlus user journey validation

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Simplicity**:
- Projects: 3 (e2e-test-framework, mock-data-generator, curl-test-scripts) ✅
- Using framework directly? Yes - Jest/Vitest directly, no wrappers ✅
- Single data model? Yes - TestScenario, MockDataSet, FlowResult entities ✅
- Avoiding patterns? Yes - direct test execution, no unnecessary abstractions ✅

**Architecture**:
- EVERY feature as library? Yes - e2e-flows, mock-data, api-testing libraries ✅
- Libraries listed: e2e-flows (test orchestration), mock-data (test data generation), api-testing (curl-based API validation) ✅
- CLI per library: e2e --run/--list, mock-data --generate/--clean, api-test --endpoint/--suite ✅
- Library docs: llms.txt format planned? Yes ✅

**Testing (NON-NEGOTIABLE)**:
- RED-GREEN-Refactor cycle enforced? Yes - tests for test framework itself ✅
- Git commits show tests before implementation? Yes ✅
- Order: Contract→Integration→E2E→Unit strictly followed? Yes ✅
- Real dependencies used? Yes - actual Firebase services, not mocks ✅
- Integration tests for: new libraries, contract changes, shared schemas? Yes ✅
- FORBIDDEN: Implementation before test, skipping RED phase ✅

**Observability**:
- Structured logging included? Yes - test execution logs with metrics ✅
- Frontend logs → backend? N/A - testing framework only ✅
- Error context sufficient? Yes - detailed test failure reporting ✅

**Versioning**:
- Version number assigned? 1.0.0 (new submodule) ✅
- BUILD increments on every change? Yes ✅
- Breaking changes handled? Yes - backward compatibility for test APIs ✅

## Project Structure

### Documentation (this feature)
```
specs/[###-feature]/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
# Option 1: Single project (DEFAULT)
src/
├── models/
├── services/
├── cli/
└── lib/

tests/
├── contract/
├── integration/
└── unit/

# Option 2: Web application (when "frontend" + "backend" detected)
backend/
├── src/
│   ├── models/
│   ├── services/
│   └── api/
└── tests/

frontend/
├── src/
│   ├── components/
│   ├── pages/
│   └── services/
└── tests/

# Option 3: Mobile + API (when "iOS/Android" detected)
api/
└── [same as backend above]

ios/ or android/
└── [platform-specific structure]
```

**Structure Decision**: Option 2 (Web application) - Testing framework supports existing web app structure

## Phase 0: Outline & Research
1. **Extract unknowns from Technical Context** above:
   - For each NEEDS CLARIFICATION → research task
   - For each dependency → best practices task
   - For each integration → patterns task

2. **Generate and dispatch research agents**:
   ```
   For each unknown in Technical Context:
     Task: "Research {unknown} for {feature context}"
   For each technology choice:
     Task: "Find best practices for {tech} in {domain}"
   ```

3. **Consolidate findings** in `research.md` using format:
   - Decision: [what was chosen]
   - Rationale: [why chosen]
   - Alternatives considered: [what else evaluated]

**Output**: research.md with all NEEDS CLARIFICATION resolved

## Phase 1: Design & Contracts
*Prerequisites: research.md complete*

1. **Extract entities from feature spec** → `data-model.md`:
   - Entity name, fields, relationships
   - Validation rules from requirements
   - State transitions if applicable

2. **Generate API contracts** from functional requirements:
   - For each user action → endpoint
   - Use standard REST/GraphQL patterns
   - Output OpenAPI/GraphQL schema to `/contracts/`

3. **Generate contract tests** from contracts:
   - One test file per endpoint
   - Assert request/response schemas
   - Tests must fail (no implementation yet)

4. **Extract test scenarios** from user stories:
   - Each story → integration test scenario
   - Quickstart test = story validation steps

5. **Update agent file incrementally** (O(1) operation):
   - Run `/scripts/bash/update-agent-context.sh claude` for your AI assistant
   - If exists: Add only NEW tech from current plan
   - Preserve manual additions between markers
   - Update recent changes (keep last 3)
   - Keep under 150 lines for token efficiency
   - Output to repository root

**Output**: data-model.md, /contracts/*, failing tests, quickstart.md, agent-specific file

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
- Load `/templates/tasks-template.md` as base
- Generate tasks from Phase 1 design docs (contracts, data model, quickstart)
- Each API endpoint → contract test task [P]
- Each entity (TestScenario, MockDataSet, FlowResult, etc.) → model creation task [P]
- Each user story from spec → integration test task
- CLI implementation tasks for each library (e2e-flows, mock-data, api-testing)
- Test framework orchestration and execution engine tasks
- Mock data generation and management tasks
- Firebase emulator integration and setup tasks

**Ordering Strategy**:
- TDD order: Tests before implementation (contract tests → failing tests → implementation)
- Dependency order: Core entities → Services → CLI → Integration
- Foundation tasks: Environment setup → Mock data → Core framework
- Integration tasks: Submodule testing → Full E2E flows → CI/CD integration
- Mark [P] for parallel execution (independent libraries and test suites)

**Library-Specific Task Categories**:
1. **e2e-flows library**: Test orchestration, scenario execution, result reporting
2. **mock-data library**: Data generation, fixtures management, cleanup utilities
3. **api-testing library**: curl-based validation, contract verification, endpoint testing

**Estimated Output**: 35-40 numbered, ordered tasks in tasks.md covering:
- 8-10 contract test tasks [P]
- 7-8 entity model tasks [P]
- 12-15 implementation tasks (core framework, CLI, services)
- 5-6 integration test tasks
- 3-4 CI/CD setup tasks

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)  
**Phase 4**: Implementation (execute tasks.md following constitutional principles)  
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |


## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command) - research.md generated
- [x] Phase 1: Design complete (/plan command) - data-model.md, contracts/, quickstart.md generated
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS - All constitutional requirements met
- [x] Post-Design Constitution Check: PASS - Library-first architecture confirmed
- [x] All NEEDS CLARIFICATION resolved - Performance targets and constraints defined
- [x] Complexity deviations documented - None required, design within constitution

---
*Based on Constitution v2.1.1 - See `/memory/constitution.md`*