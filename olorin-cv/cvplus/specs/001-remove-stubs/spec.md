# Feature Specification: Remove All Mock/Stub/TODO Code and Fully Implement

**Feature Branch**: `001-remove-stubs`
**Created**: 2025-11-29
**Status**: Draft
**Input**: User description: "remove mock code. based on your analysis create a comprehensive plan to remove all mock/stub/fixme and fully implement it."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Developers Deploy Production Code Without Mock Methods (Priority: P1)

Developers need the confidence that production code contains no stub/mock implementations that could silently fail or throw "Method not implemented" errors at runtime. When a production build is deployed, all service methods must have complete, functional implementations with full business logic - not placeholders.

**Why this priority**: This is the most critical requirement because stub methods in production are security risks and can cause runtime failures that crash workflows, lose user data, or expose vulnerabilities. Users cannot reliably use the application if core services throw unimplemented method errors.

**Independent Test**: Can be tested by scanning the entire production codebase for stub patterns (`throw new Error('Method not implemented')`, `throw NotImplementedError()`, etc.) and verifying zero matches. This delivers the core value of the feature - production readiness.

**Acceptance Scenarios**:

1. **Given** a production build of all packages, **When** scanning for stub implementations, **Then** zero stub methods remain in any service class
2. **Given** a deployed workflow service, **When** executing a template operation, **Then** it completes without "Method not implemented" errors
3. **Given** a complete code scan, **When** checking for methods with only `throw` statements in service classes, **Then** no matches are found

---

### User Story 2 - Developers Remove TODO/FIXME Comments and Complete Implementation (Priority: P1)

Developers need a codebase where TODO/FIXME comments represent completed refactoring tasks, not incomplete functionality. Every TODO item must either be addressed with a working implementation or explicitly documented as a known limitation with a workaround.

**Why this priority**: TODO/FIXME comments indicate incomplete features. 71+ such comments scattered across 25+ files create maintenance debt and uncertainty about feature completeness. Developers don't know if a feature is working as designed or if it's partially broken.

**Independent Test**: Can be tested by scanning for all TODO/FIXME patterns in non-test, non-documentation files and verifying that each comment either (a) is removed because work was completed, or (b) is in a demo/test file with clear justification.

**Acceptance Scenarios**:

1. **Given** the production codebase, **When** searching for "TODO" or "FIXME" in src/ directories (excluding tests), **Then** zero matches are found
2. **Given** a code review, **When** examining any service method, **Then** all implementation logic is present (not deferred)
3. **Given** the feature-access-cache service, **When** checking rate limiting, video generation, and podcast generation logic, **Then** complete implementations exist (not placeholders)

---

### User Story 3 - Developers Eliminate Code Duplication and Reduce Codebase Size (Priority: P1)

Developers need a maintainable codebase where common functionality is defined once and reused, not duplicated across 2-3 copies. The 15,000+ duplicate lines of CV preview generation code creates maintenance nightmares - a bug fix must be applied in multiple locations, and inconsistencies grow over time.

**Why this priority**: Code duplication increases bug surface area and makes refactoring risky. The same CV generation logic exists in 3+ locations (frontend, shell-ui, and workflow packages). This violates DRY principle and makes feature consistency impossible to maintain.

**Independent Test**: Can be tested by scanning the codebase for duplicate file patterns (enhancedTemplateGenerator.ts exists in 3 locations, etc.) and verifying single implementation locations. This delivers maintainability.

**Acceptance Scenarios**:

1. **Given** the codebase, **When** searching for files like "enhancedTemplateGenerator.ts", **Then** only one canonical implementation exists
2. **Given** a CV generation request from frontend, **When** tracing the code path, **Then** it uses shared utilities from a centralized location
3. **Given** a CV generation update, **When** fixing a bug in template styling, **Then** the fix applies to all CV features without requiring multiple edits

---

### User Story 4 - Developers Fix Security Issues in Feature Access Control (Priority: P1)

Developers need the feature access system to enforce security by default, not grant access by default. Currently, when a feature check fails or a premium feature status is unknown, the system defaults to allowing access. This is a security vulnerability.

**Why this priority**: Security defaults are critical. The current behavior where unknown premium features return `true` (allowed) means a misconfiguration could grant access to premium features without payment. This is a business and security risk.

**Independent Test**: Can be tested by verifying that feature access control returns explicit `false` for unknown/unverified features and that all premium feature checks have real implementation logic (not fallback placeholders).

**Acceptance Scenarios**:

1. **Given** a request for an unknown premium feature, **When** checking access, **Then** the system returns `false` (deny) not `true`
2. **Given** a feature with unverified premium status, **When** executing access control logic, **Then** it queries the database for actual status (not returning a fallback)
3. **Given** feature-access-cache service, **When** retrieving feature access, **Then** it uses real Firestore data (not placeholder values)

---

### User Story 5 - Developers Refactor Large Files to Improve Maintainability (Priority: P2)

Developers need files under 200 lines to improve readability and reduce cognitive complexity. Currently 200+ files exceed this limit, making them harder to understand and maintain. Large files encourage mixing of concerns and increase bug risk.

**Why this priority**: While important for code quality, this is lower priority than removing stubs/todos/duplicates because large files don't cause runtime failures. However, they do slow down development.

**Independent Test**: Can be tested by verifying that all source files (excluding tests and generated code) are under 200 lines and maintain clear, single responsibility.

**Acceptance Scenarios**:

1. **Given** the source codebase, **When** measuring file line counts (excluding tests/vendor), **Then** 100% of files are under 200 lines
2. **Given** a refactored service file, **When** reading the code, **Then** it clearly focuses on a single responsibility
3. **Given** a large component split into smaller components, **When** composing them together, **Then** the behavior is identical to the original

---

### User Story 6 - DevOps Consolidates Duplicate Middleware to Reduce Maintenance (Priority: P2)

DevOps and developers need a single, centralized AuthGuard middleware implementation. Currently, 3+ duplicate implementations exist, each requiring updates when security requirements change.

**Why this priority**: Middleware duplication increases the risk of security inconsistencies and requires changes in multiple locations. However, this is lower priority than core functionality issues.

**Independent Test**: Can be tested by finding all AuthGuard implementations and verifying only one canonical version exists that all packages import.

**Acceptance Scenarios**:

1. **Given** all packages, **When** searching for AuthGuard implementations, **Then** only one canonical implementation is found
2. **Given** a security update to authentication, **When** updating AuthGuard, **Then** the change applies to all packages without duplication

---

### Edge Cases

- What happens when a service method is partially implemented (some paths are stubs, others are complete)? → The partial stubs must be completed
- How does the system handle feature flags for incomplete features? → Features must be complete; if not ready, use feature flags to gate them from users
- What if removing stubs requires database migrations? → Migrations must be included in the implementation plan
- What about third-party services that can't be fully implemented (e.g., email, video generation requiring external APIs)? → These must have real API integrations, not mock implementations
- How are placeholder values replaced with real logic? → Each placeholder must be traced to find the real logic source or implement actual business logic

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST NOT contain any methods that throw "Method not implemented" error in production code
- **FR-002**: System MUST NOT contain any unimplemented TODO/FIXME comments in src/ directories (except demo/test code with justification)
- **FR-003**: Duplicate utility functions (like CV generators) MUST be consolidated into single, shared implementations
- **FR-004**: Feature access control MUST explicitly deny access for unverified/unknown premium features (default-deny security posture)
- **FR-005**: All payment provider integrations MUST use real logic, not placeholder/fallback values
- **FR-006**: Email service, video generation, and podcast generation MUST have real implementations or documented limitations
- **FR-007**: All service methods that reference Firestore MUST actually query the database, not return hardcoded values
- **FR-008**: Rate limiting implementation MUST be complete and functional, not deferred
- **FR-009**: Source code files MUST be under 200 lines (excluding tests and generated code) for maintainability
- **FR-010**: AuthGuard middleware MUST have a single canonical implementation imported by all packages

### Key Entities

- **Service Methods**: Implementations in workflow, auth, premium, core, and feature services that have stub placeholders
- **Code Duplicates**: Utility files tripled across frontend/shell-ui/workflow packages
- **TODOs/FIXMEs**: Comments in service implementations indicating incomplete work
- **Feature Access**: Premium feature verification logic with fallback placeholders
- **Database Queries**: Services that should read from Firestore but return hardcoded values instead
- **Middleware**: AuthGuard implementations duplicated across packages

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Zero stub methods remain in production code (verified by automated scan for "Method not implemented" patterns)
- **SC-002**: Zero TODO/FIXME comments in src/ production code (verified by automated grep scan)
- **SC-003**: All CV preview generation code uses single shared implementation (verified by file count check)
- **SC-004**: Feature access control returns explicit `false` for unknown features (verified by code review and tests)
- **SC-005**: All 93+ stub methods in workflow services have real implementations with working tests
- **SC-006**: All 71+ TODO items are either completed or removed (verified by comment count)
- **SC-007**: 15,000+ duplicate lines consolidated to single implementation (verified by diff analysis)
- **SC-008**: 200+ files exceeding 200-line limit are refactored (verified by line count check)
- **SC-009**: AuthGuard middleware has single canonical implementation (verified by file count check)
- **SC-010**: All external service integrations (email, video, podcast, payments) use real implementations, not mocks (verified by code review)

## Assumptions

Based on the feature description and codebase analysis, these assumptions are made:

1. **"Complete implementation" means business logic is present** - Methods should perform actual work (query databases, call APIs, calculate results), not just return hardcoded values
2. **Test code is excluded** - Test files, demo components, and test utilities can retain stubs/mocks; only production src/ code must be complete
3. **External APIs are available** - Email service, video generation, etc. have real APIs available; implementations should call them, not mock them
4. **Database (Firestore) is the source of truth** - Services should query Firestore, not return hardcoded/cached values
5. **Feature flags exist for incomplete features** - If a feature isn't ready for users, it should be feature-flagged rather than stubbed
6. **Refactoring does not change user-facing behavior** - File splits and consolidations should preserve all current functionality
7. **Priority order matters** - P1 items (stubs, TODOs, duplicates, security) are addressed before P2 items (file refactoring)
8. **All code must be tested** - New implementations must have unit/integration tests validating behavior

## Constraints & Scope

### In Scope

- Pre-creating comprehensive Firestore schema (20 collections, field types, validation rules, indexes, security rules) BEFORE service implementation
- Removing all 93+ stub method implementations across 9 workflow service files
- Fixing all 71+ TODO/FIXME comments in source code
- Consolidating 15,000+ lines of duplicate CV generation code
- Fixing feature access control security issues with kill-switch feature flag
- Implementing real database queries replacing hardcoded values
- Implementing external service error handling (fail loud, graceful degradation, retry logic, circuit breakers)
- Centralizing AuthGuard middleware
- Refactoring files exceeding 200-line limit

### Out of Scope

- Changing user-facing functionality or behavior
- Adding new features beyond completing existing implementations
- Modifying test/demo code (stubs in tests are acceptable)
- Changing technology stack or frameworks
- Migrating to different databases or services
- Creating new documentation (focus is on code implementation)

## Dependencies & Risks

**Dependencies**:
- All implementations depend on Firestore database with pre-created schema (20 collections with field types, validation rules, indexes, security rules)
- Some implementations depend on external APIs (email provider, video service, payment provider) with defined error handling strategy
- Email/video/podcast generation may require API keys and integrations to be configured
- Feature flag infrastructure must be available for breaking change management

**External Service Integration Strategy**:
- **Critical services (payments)**: Fail loud (throw errors immediately); exponential backoff retry (3 attempts, max 30s); dead-letter queue for failed jobs
- **Non-critical services (email, video, podcast)**: Graceful degradation with fallbacks (email fallback provider, video skip with message, podcast text-only); async retry queue; errors logged but not thrown to user
- All external API calls must implement circuit breakers to prevent cascading failures
- Request timeouts: 5s for synchronous calls, 30s for async operations

**Breaking Changes Risk Mitigation**:
- Feature flag strategy: Deploy new feature access logic (default-deny) with kill-switch flag OFF
- Keep old behavior (default-allow) active until monitoring confirms no production issues
- Flip flag ON after validation period; instant rollback available if needed
- Monitor: unsuccessful feature access denials, API error rates, user complaints

**Risks**:
- **Data Migration Risk**: If stub services interact with database schema, actual implementations may require migrations
- **Breaking Changes Risk**: Removing defaults that granted access could break existing workflows if not properly feature-flagged (mitigated by kill-switch approach)
- **Integration Risk**: External API integrations may have rate limits or authentication issues (mitigated by retry logic and circuit breakers)
- **Performance Risk**: Querying real databases instead of returning hardcoded values could impact performance if not optimized
- **Timeline Risk**: 93+ stub implementations + 71+ TODOs could require 5-10 days of focused work

## Clarifications

### Session 2025-11-29

- Q: How should Firestore schema be set up before service implementations? → A: Pre-create comprehensive Firestore schema with all 20 collections, documented field types, validation rules, indexes, and security rules BEFORE implementing services
- Q: How should external service integration failures be handled? → A: Fail loud for critical services (payments), retry smart with exponential backoff (3 attempts, max 30s), implement dead-letter queue for failed jobs, graceful degradation for non-critical services (email fallback, video skipped)
- Q: How should breaking changes in feature access control be managed? → A: Deploy new default-deny logic with kill-switch feature flag OFF; monitor for issues; flip flag ON after validation; rollback available if needed

## Implementation Notes

This specification represents the complete scope of removing all production mock/stub/TODO code and implementing full functionality. The codebase analysis identified:

- **93+ stub methods** throwing "Method not implemented" across 9 service files
- **71+ TODO/FIXME comments** indicating incomplete features
- **15,000+ duplicate lines** of CV generation code in 3 locations
- **10+ placeholder values** in production code (defaults, fallbacks)
- **200+ files** exceeding 200-line maintainability limit

**Critical Prerequisites**:
- **Firestore Schema Setup** (MUST complete before Phase 2 service implementations): Create all 20 Firestore collections with documented field types, validation rules, indexes (for filtering/sorting), and security rules. Use Firestore console or migration script. Validate schema by running service integration tests.
- **Feature Flag Infrastructure** (MUST be available before Phase 1 security fixes): Implement kill-switch feature flag system for feature access control rollout; flag must support instant ON/OFF toggle without redeployment.

**Implementation Order**:
1. Phase 0: Firestore schema setup + feature flag infrastructure
2. Phase 1: Security fixes (with feature flag ON), code consolidation
3. Phase 2-4: Service implementations, external integrations, TODO resolution
4. Phase 5: File refactoring and final validation

The implementation plan should break this into chunks of 1-2 hour tasks, prioritize P1 items (stubs, TODOs, security, duplication), and ensure every implementation is tested and verified working before proceeding to the next item.
