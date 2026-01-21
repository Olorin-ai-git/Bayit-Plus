# Implementation Plan: Enhancements Module Integration & Recovery


**Branch**: `010-enhancements-module-integration` | **Date**: 2025-09-16 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/010-enhancements-module-integration/spec.md`

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
Consolidate all enhancement-related functionality scattered across CVPlus processing, frontend, and root modules into the enhancements submodule to achieve architectural compliance with CVPlus Layer Architecture. This includes migrating CV enhancement services, frontend components, and resolving architectural violations while preserving all existing functionality and API contracts.

## Technical Context
**Language/Version**: TypeScript 5.0+, Node.js 20+, React 18+
**Primary Dependencies**: Firebase Functions, Anthropic SDK, React, Vitest, ESLint
**Storage**: Firebase Firestore, Firebase Storage
**Testing**: Vitest (frontend), Jest (backend), comprehensive coverage requirements
**Target Platform**: Firebase Functions (serverless), Web browsers (React SPA)
**Project Type**: web - CVPlus modular architecture with independent git submodules
**Performance Goals**: Build success, test coverage >90%, TypeScript strict compliance
**Constraints**: CVPlus Layer 3 architecture compliance, preserve API contracts, no functionality regression
**Scale/Scope**: ~20 files to migrate, 6 frontend services, 2 backend services, complete build validation

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Simplicity**:
- Projects: 1 (enhancements module integration - architectural migration)
- Using framework directly? Yes (TypeScript, React, Firebase directly)
- Single data model? Yes (enhancement services and components)
- Avoiding patterns? Migration preserves existing patterns, no new complexity

**Architecture**:
- EVERY feature as library? Yes - consolidating into @cvplus/enhancements submodule
- Libraries listed: @cvplus/enhancements (CV enhancement services, calendar integration, professional networking)
- CLI per library: NPM scripts (build, test, dev, lint) standard for submodules
- Library docs: CLAUDE.md exists with comprehensive documentation

**Testing (NON-NEGOTIABLE)**:
- RED-GREEN-Refactor cycle enforced? Yes - migration tests must fail before implementation
- Git commits show tests before implementation? Yes - validation tests first, then migration
- Order: Contract→Integration→E2E→Unit strictly followed? Yes for migration validation
- Real dependencies used? Yes (Firebase, actual APIs, not mocks)
- Integration tests for: contract preservation, cross-module dependencies, build validation
- FORBIDDEN: Implementation before test, skipping RED phase - ENFORCED

**Observability**:
- Structured logging included? Yes - @cvplus/logging integration maintained
- Frontend logs → backend? Yes - existing Firebase logging preserved
- Error context sufficient? Yes - comprehensive error handling during migration

**Versioning**:
- Version number assigned? 1.0.0 (enhancements module already has version)
- BUILD increments on every change? Yes - follows CVPlus submodule versioning
- Breaking changes handled? Yes - API contract preservation ensures no breaking changes

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

**Structure Decision**: CVPlus modular architecture - Target: packages/enhancements/ submodule

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
- Generate migration-specific tasks from data-model.md and contracts
- Each FileMapping → migration validation task [P]
- Each APIContract → contract preservation test [P]
- Each DependencyMapping → import chain update task
- Build validation and integration testing tasks

**Migration Task Categories**:
1. **Pre-migration validation**: Document baseline state
2. **File migration tasks**: Move files preserving structure
3. **Import chain updates**: Update all @cvplus/enhancements imports
4. **Contract preservation**: Implement facade patterns as needed
5. **Integration testing**: Validate cross-module functionality
6. **Build validation**: Ensure TypeScript compilation and deployment

**Ordering Strategy**:
- TDD migration approach: Validation tests before migration implementation
- Dependency order: Backend services → Frontend components → Integration
- Incremental approach: One module at a time with rollback points
- Mark [P] for parallel execution (independent file migrations)

**Specific Task Focus Areas**:
- Processing module enhancement service migration
- Frontend enhancement component consolidation
- Root functions cleanup and migration
- API contract preservation and testing
- Build system integration and validation
- Performance benchmark preservation

**Estimated Output**: 35-40 numbered, ordered migration tasks in tasks.md

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