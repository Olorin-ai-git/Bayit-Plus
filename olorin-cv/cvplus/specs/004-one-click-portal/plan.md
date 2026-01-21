# Implementation Plan: One Click Portal


**Branch**: `004-one-click-portal` | **Date**: 2025-09-13 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/Users/gklainert/Documents/cvplus/specs/004-one-click-portal/spec.md`

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
One Click Portal is a premium feature that allows users to generate fully functional web portals with a single click. These portals showcase the applicant's CV information and include an integrated AI chat interface using RAG (Retrieval Augmented Generation) technology. Recruiters can visit these portals and interact with an AI assistant that has deep knowledge of the candidate's CV content, enabling intelligent Q&A about the applicant's background and qualifications. The feature is **partially implemented** with existing Portal components in the frontend and backend functions in the public-profiles submodule.

## Technical Context
**Language/Version**: TypeScript 5.0+, Node.js 20+, React 18+
**Primary Dependencies**: Firebase Functions, Firebase Firestore, React, Tailwind CSS, Anthropic Claude API, Vector Database (Pinecone/ChromaDB)
**Storage**: Firebase Firestore for metadata, Firebase Storage for assets, Vector Database for RAG embeddings
**Testing**: Vitest (frontend), Jest (backend), Cypress (E2E)
**Target Platform**: Web browsers (desktop/mobile), Firebase Cloud Functions
**Project Type**: web - CVPlus uses modular submodule architecture where each package contains both frontend and backend code
**Performance Goals**: Portal generation <60s, Chat response <3s, 10k concurrent portals
**Constraints**: Premium feature only, RAG accuracy >85%, mobile responsive
**Scale/Scope**: Extend existing Portal implementation, enhance RAG capabilities, improve UX
**Submodule Architecture**: Portal functionality spans multiple submodules:
- `packages/public-profiles/` - Contains existing Portal backend functions and types
- `packages/core/` - Shared types, utilities, validation
- `packages/premium/` - Premium feature validation and billing
- `packages/auth/` - User authentication and authorization
- Frontend components currently in `/frontend/src/components/features/Portal/` will be moved to appropriate submodule

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Simplicity**:
- Projects: 4 (public-profiles submodule enhancement, core types, premium gates, frontend migration) ✅
- Using framework directly? Yes - React, Firebase Functions directly ✅
- Single data model? Yes - Portal entities extend existing CV/User models ✅
- Avoiding patterns? Yes - direct Firebase integration, no unnecessary abstractions ✅

**Architecture**:
- EVERY feature as library? Yes - Portal functionality in public-profiles submodule ✅
- Libraries listed: public-profiles (Portal generation, RAG chat), core (types), premium (validation) ✅
- CLI per library: Firebase Functions CLI + npm scripts for each submodule ✅
- Library docs: Each submodule has README.md with API documentation ✅

**Testing (NON-NEGOTIABLE)**:
- RED-GREEN-Refactor cycle enforced? Yes - contract tests first, then implementation ✅
- Git commits show tests before implementation? Yes - separate commits for tests and implementation ✅
- Order: Contract→Integration→E2E→Unit strictly followed? Yes ✅
- Real dependencies used? Yes - Firebase emulators, real vector DB for testing ✅
- Integration tests for: Portal generation, RAG responses, submodule interactions ✅
- FORBIDDEN: Implementation before test, skipping RED phase ✅

**Observability**:
- Structured logging included? Yes - Firebase Functions logging, portal analytics ✅
- Frontend logs → backend? Yes - portal interaction tracking ✅
- Error context sufficient? Yes - Portal generation status, chat errors ✅

**Versioning**:
- Version number assigned? 1.0.0 for Portal enhancement (extends existing) ✅
- BUILD increments on every change? Yes - follows submodule versioning ✅
- Breaking changes handled? N/A - enhancement to existing Portal features ✅

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

### Source Code (CVPlus Submodule Architecture)
```
# CVPlus Root Repository
packages/
├── public-profiles/         # Primary Portal module (git submodule)
│   ├── src/
│   │   ├── backend/         # Portal functions: generateWebPortal, portalChat, etc.
│   │   ├── frontend/        # Portal UI components (to be enhanced)
│   │   ├── types/           # Portal-specific types
│   │   └── services/        # RAG processing, portal generation
│   └── package.json
├── core/                    # Shared utilities (git submodule)
│   ├── src/
│   │   ├── types/           # Common types, interfaces
│   │   ├── utils/           # Shared utilities
│   │   └── constants/       # Application constants
│   └── package.json
├── premium/                 # Premium features (git submodule)
│   ├── src/
│   │   ├── backend/         # Subscription validation
│   │   └── services/        # Premium feature gates
│   └── package.json
└── auth/                    # Authentication (git submodule)
    ├── src/
    │   ├── backend/         # User auth functions
    │   └── middleware/      # Auth guards
    └── package.json

# Root Repository (orchestration only)
frontend/src/components/features/Portal/  # Existing components (to be migrated)
functions/src/index.ts                   # Function exports from submodules
```

**Structure Decision**: CVPlus Submodule Architecture - Each package is a self-contained git submodule with frontend and backend code

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
- Each contract → contract test task [P]
- Each entity → model creation task [P] 
- Each user story → integration test task
- Implementation tasks to make tests pass

**Ordering Strategy**:
- TDD order: Tests before implementation 
- Dependency order: Models before services before UI
- Mark [P] for parallel execution (independent files)

**Estimated Output**: 25-30 numbered, ordered tasks in tasks.md

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
- [ ] Phase 1: Design complete (/plan command)
- [ ] Phase 2: Task planning complete (/plan command - describe approach only)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [ ] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved
- [x] Complexity deviations documented

---
*Based on Constitution v2.1.1 - See `/memory/constitution.md`*