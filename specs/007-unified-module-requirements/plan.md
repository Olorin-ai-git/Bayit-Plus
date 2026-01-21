# Implementation Plan: Unified Module Requirements

**Branch**: `007-unified-module-requirements` | **Date**: 2025-09-13 | **Spec**: [spec.md](/Users/gklainert/Documents/cvplus/specs/007-unified-module-requirements/spec.md)
**Input**: Feature specification from `/specs/007-unified-module-requirements/spec.md`

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
Standardize all CVPlus submodules with consistent structural requirements, documentation, configuration, and validation. This enables developers to quickly understand and maintain any module while ensuring reliable CI/CD processes. The primary requirement is establishing unified standards for README files, package.json scripts, directory structure, TypeScript configuration, entry points, testing setup, naming conventions, and dependency management across all 18+ submodules in the CVPlus ecosystem.

## Critical Architectural Requirements

**🚨 MANDATORY MODULE STANDARDS** - Each module MUST comply with ALL of the following:

1. **Code Segregation Principle**: Each module should NOT have ANY code not required by it. If such code exists, it MUST be immediately migrated to the relevant modules where it belongs.

2. **Distribution Architecture**: Each module MUST be closed to direct code usage and reference and open to distribution. Every module MUST have a `dist/` folder with properly built and packaged code for consumption.

3. **Real Implementation Only**: NO stubs, placeholders, commented out code, or mock implementations are allowed. ONLY real, functional implementations are permitted.

4. **Build and Test Standards**: All modules MUST have a clean build without errors and warnings, and their tests MUST pass completely.

5. **Dependency Chain Integrity**: Each module MUST maintain the correct dependency chain without circular dependencies or architectural violations.

6. **Pre-Creation Verification Principle**: Each module MUST NOT create new files BEFORE verifying those files and/or functionality exists in other modules it can import AND before verifying the missing functionality REALLY BELONGS TO ITS MODULE's RESPONSIBILITY and concern AND it does NOT break the CVPLUS architecture, responsibility and chain of dependencies.

## Technical Context
**Language/Version**: TypeScript 5.0+, Node.js 18+
**Primary Dependencies**: Varies by module (Firebase Functions, React, Express, etc.)
**Storage**: Configuration files, module templates, compliance schemas
**Testing**: Jest/Vitest for modules, validation scripts for compliance
**Target Platform**: All CVPlus submodules (cross-platform)
**Project Type**: Multi-module ecosystem (18+ git submodules)
**Performance Goals**: [NEEDS CLARIFICATION: validation frequency - on commit, daily, or on-demand?]
**Constraints**: Self-contained modules, backward compatibility, minimal disruption
**Scale/Scope**: 18+ existing submodules, standardization across entire CVPlus codebase

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Simplicity**:
- Projects: 3 (validation-cli, template-generator, compliance-dashboard)
- Using framework directly? YES (Node.js fs, path modules directly)
- Single data model? YES (ModuleStructure, ComplianceRule, ValidationReport)
- Avoiding patterns? YES (direct file operations, no unnecessary abstractions)

**Critical Architectural Compliance**:
- Code segregation validation? YES (detect misplaced code, suggest migrations)
- Distribution architecture enforcement? YES (validate dist/ folder existence and contents)
- Mock/stub detection? YES (scan for placeholders, commented code, incomplete implementations)
- Build/test validation? YES (verify clean builds and passing tests)
- Dependency chain analysis? YES (detect circular dependencies and violations)

**Architecture**:
- EVERY feature as library? YES (validation-lib, template-lib, reporting-lib)
- Libraries listed:
  - validation-lib: Module structure validation and compliance checking
  - template-lib: Standardized module template generation
  - reporting-lib: Compliance report generation and visualization
- CLI per library:
  - validate-module --path [module] --format [json|text]
  - generate-template --type [module-type] --output [path]
  - generate-report --modules [paths] --format [html|json]
- Library docs: llms.txt format planned? YES

**Testing (NON-NEGOTIABLE)**:
- RED-GREEN-Refactor cycle enforced? YES (tests written first)
- Git commits show tests before implementation? YES (enforced)
- Order: Contract→Integration→E2E→Unit strictly followed? YES
- Real dependencies used? YES (actual module files, no mocks)
- Integration tests for: module validation, template generation, compliance reporting
- FORBIDDEN: Implementation before test, skipping RED phase

**Observability**:
- Structured logging included? YES (validation results, compliance scores)
- Frontend logs → backend? N/A (CLI tools with structured output)
- Error context sufficient? YES (specific compliance violations with remediation)

**Versioning**:
- Version number assigned? 1.0.0
- BUILD increments on every change? YES
- Breaking changes handled? YES (backward compatibility for existing modules)

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

**Structure Decision**: Option 1 (Single project with library-based CLI tools for module validation and standardization)

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
- API contract → validation CLI contract test [P]
- API contract → template generation CLI contract test [P]
- API contract → reporting CLI contract test [P]
- Each entity (ModuleStructure, ComplianceRule, ValidationReport, ModuleTemplate) → model creation task [P]
- Each quickstart scenario → integration test task
- Implementation tasks to make contract/integration tests pass
- CLI implementation tasks for validation, template generation, and reporting
- **Critical Architectural Validation Tasks**:
  - Code segregation scanner → detect misplaced code across modules [P]
  - Distribution architecture validator → verify dist/ folder compliance [P]
  - Mock/stub detector → scan for non-implementation code [P]
  - Build validation engine → verify clean builds across all modules [P]
  - Dependency chain analyzer → detect circular dependencies and violations [P]

**Ordering Strategy (TDD-first)**:
1. **Contract Tests Phase** (Red phase):
   - API contract tests for validation endpoints
   - API contract tests for template generation endpoints
   - API contract tests for compliance reporting endpoints
   - All tests must fail initially (no implementation)

2. **Model Creation Phase** [P]:
   - ModuleStructure type definitions and validation
   - ComplianceRule schema and validation logic
   - ValidationReport aggregation and scoring
   - ModuleTemplate structure and customization

3. **Integration Test Phase**:
   - Quickstart scenario 1: Module validation workflow
   - Quickstart scenario 2: Template generation workflow
   - Quickstart scenario 3: Batch validation workflow
   - Quickstart scenario 4: Auto-remediation workflow
   - Quickstart scenario 5: Ecosystem monitoring workflow
   - Quickstart scenario 6: Legacy module migration workflow

4. **CLI Implementation Phase**:
   - validation-lib core logic (make contract tests pass)
   - template-lib core logic (make contract tests pass)
   - reporting-lib core logic (make contract tests pass)
   - CLI command interfaces and argument parsing
   - Error handling and user feedback

5. **Validation and Polish Phase**:
   - Performance optimization (< 30 sec validation)
   - Documentation generation (llms.txt format)
   - Integration with CVPlus ecosystem
   - Backward compatibility validation

**Parallel Execution Markers [P]**:
- Model creation tasks (independent type definitions)
- Library implementations (separate domains)
- Contract test creation (independent endpoints)
- Documentation tasks (independent files)

**Estimated Output**: 32-38 numbered, ordered tasks in tasks.md

**Libraries and CLI Commands to Implement**:
1. **validation-lib** + CLI: `cvplus-validator validate|validate-all|fix|ecosystem|trends|segregation|distribution|mocks|builds|dependencies`
2. **template-lib** + CLI: `cvplus-generator list-templates|create`
3. **reporting-lib** + CLI: `cvplus-reporter generate|monitor|trends`
4. **migration-lib** + CLI: `cvplus-migrator analyze|plan|migrate`
5. **architecture-lib** + CLI: `cvplus-architect scan-segregation|check-distribution|detect-mocks|validate-builds|analyze-dependencies`

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
- [x] Phase 0: Research complete (/plan command) - research.md created with all NEEDS CLARIFICATION resolved
- [x] Phase 1: Design complete (/plan command) - data-model.md, contracts/module-validation-api.yaml, quickstart.md created
- [x] Phase 2: Task planning complete (/plan command - describe approach only) - detailed task generation strategy documented
- [ ] Phase 3: Tasks generated (/tasks command) - awaiting /tasks command execution
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS - all constitutional requirements satisfied
- [x] Post-Design Constitution Check: PASS - design maintains constitutional compliance
- [x] All NEEDS CLARIFICATION resolved - validation frequency and enforcement mechanism defined
- [x] Complexity deviations documented - none required, design follows constitutional principles

---
*Based on Constitution v2.1.1 - See `/memory/constitution.md`*