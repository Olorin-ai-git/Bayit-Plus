# Implementation Plan: Level 2 Submodules Complete Recovery

**Branch**: `009-level-2-recovery` | **Date**: 2025-09-16 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/Users/gklainert/Documents/cvplus/specs/009-level-2-recovery/spec.md`

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
Comprehensive recovery of all 11 Level 2 domain service modules (auth, i18n, cv-processing, multimedia, analytics, premium, public-profiles, recommendations, admin, workflow, payments) to achieve 100% build success, 100% test pass rate, full architectural compliance, and complete integration restoration. Current state: 3 modules build successfully but all have test failures, 8 modules have critical build failures requiring immediate attention.

## Technical Context
**Language/Version**: TypeScript 5.x, Node.js 20+
**Primary Dependencies**: tsup (build), vitest/jest (testing), Firebase Functions, @cvplus/core, @cvplus/logging
**Storage**: Firebase Firestore, Firebase Storage, Git submodules
**Testing**: vitest (frontend), jest (backend), npm test command
**Target Platform**: Node.js server (Firebase Functions), Web browsers (frontend components)
**Project Type**: web - modular monorepo with 11 independent git submodules
**Performance Goals**: Sub-60s build time per module, 100% test pass rate, zero compilation errors
**Constraints**: Layer 2 dependency rules (can only import from Layer 0/1), no peer dependencies between modules
**Scale/Scope**: 11 Level 2 modules, ~150+ functions exported to root, architectural compliance required

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Simplicity**:
- Projects: 11 (recovery maintenance - existing architecture, not new development)
- Using framework directly? YES (tsup, vitest, jest without wrappers)
- Single data model? YES (existing CVPlus entity model preserved)
- Avoiding patterns? YES (direct fixes without adding complexity)

**Architecture**:
- EVERY feature as library? YES (each Level 2 module is independent library)
- Libraries listed: 11 modules - auth, i18n, cv-processing, multimedia, analytics, premium, public-profiles, recommendations, admin, workflow, payments
- CLI per library: npm scripts (build, test, lint) standardized across modules
- Library docs: README.md maintained per module

**Testing (NON-NEGOTIABLE)**:
- RED-GREEN-Refactor cycle enforced? YES (fix failing tests first, then ensure they pass)
- Git commits show tests before implementation? YES (test fixes committed before implementation fixes)
- Order: Contract→Integration→E2E→Unit strictly followed? YES
- Real dependencies used? YES (Firebase, actual submodule dependencies)
- Integration tests for: module boundaries, import chains, build order validation
- FORBIDDEN: Skip test fixes, implement without verifying test suite

**Observability**:
- Structured logging included? YES (@cvplus/logging integrated across all modules)
- Frontend logs → backend? YES (unified logging stream maintained)
- Error context sufficient? YES (build/test error diagnostics preserved)

**Versioning**:
- Version number assigned? YES (each module has package.json version)
- BUILD increments on every change? YES (submodule commits increment versions)
- Breaking changes handled? YES (Layer dependency validation prevents breaks)

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

**Structure Decision**: Option 2 (Web application) - CVPlus has frontend/ and functions/ (backend) structure with packages/ for modular architecture

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
- Generate tasks from recovery research findings and Phase 1 design
- Phase 1 (Emergency Stabilization) → workspace configuration, dependency installation, TypeScript setup tasks
- Phase 2 (Build Infrastructure) → build standardization, test framework configuration tasks
- Phase 3 (Architecture Compliance) → dependency audit, layer validation, integration testing tasks
- Phase 4 (Prevention) → monitoring setup, documentation, health check automation tasks

**Ordering Strategy**:
- Sequential phase execution: Phase 1 must complete before Phase 2, etc.
- Within phases: parallel module recovery where possible [P]
- Validation gates between phases to ensure quality
- TDD approach: Fix tests first, then ensure implementation passes

**Task Categories**:
1. **Configuration Tasks**: Workspace setup, TypeScript configuration, test framework standardization
2. **Recovery Tasks**: Module-specific build fixes, dependency resolution, test restoration
3. **Validation Tasks**: Health checks, compliance audits, integration testing
4. **Monitoring Tasks**: Automated health monitoring, documentation updates

**Estimated Output**: 40-50 numbered, ordered tasks organized by recovery phases

**Module Priority Order**:
1. **Healthy First**: auth, i18n, analytics (fix tests, maintain builds)
2. **Critical Recovery**: cv-processing, multimedia, premium, public-profiles, recommendations, admin, workflow, payments
3. **Integration Validation**: End-to-end system testing

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
- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved
- [x] Complexity deviations documented

---
*Based on Constitution v2.1.1 - See `/memory/constitution.md`*