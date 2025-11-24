# Implementation Plan: Robust End-to-End Testing for Investigation Platform

**Branch**: `001-robust-e2e-testing` | **Date**: 2025-11-04 | **Spec**: `/specs/001-robust-e2e-testing/spec.md`

## Summary

Build a production-grade Playwright E2E test suite that validates the complete investigation creation and lifecycle using real API interactions, WebSocket connections, and UI verification. The suite will ensure API consistency (monotonic progress, append-only events, versioning), server-side lifecycle logging, and UI parity across all investigation stages. Foundation exists (70% complete); remaining work focuses on expanding coverage for event ordering, snapshot versioning, resilience patterns, and comprehensive assertions.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 18+ LTS, React 18.x
**Primary Dependencies**: @playwright/test 1.40+, zod (schema validation), custom e2e utilities
**Storage**: N/A (integration tests against live APIs)
**Testing Framework**: Playwright Test with 11 browser/device projects, JUnit/JSON/HTML reporters
**Target Platform**: Desktop (Chrome, Firefox, Safari), Mobile (iOS, Android), Tablet
**Project Type**: Frontend E2E testing with real backend integration
**Performance Goals**:
- Investigation completion: ≤120 seconds (configurable)
- Progress API response: ≤1000ms
- Event API response: ≤2000ms
- UI update latency: ≤2 seconds from event arrival

**Constraints**:
- No mocks/stubs (real API integration required)
- All configuration environment-driven
- Fail-fast on invalid configuration
- Graceful test skipping if optional APIs unavailable

**Scale/Scope**:
- 7 primary test files + comprehensive utility library
- 50+ assertions across all user stories
- Single and multi-entity investigation scenarios
- Parallel execution support (CI: 1 worker, local: configurable)

## Constitution Check

✅ **Gates Passed**:
- ✅ No mocks outside `/demo/**` (real API integration only)
- ✅ All configuration externalized to environment variables
- ✅ No hardcoded URLs, timeouts, or feature flags
- ✅ Schema validation with fail-fast behavior
- ✅ Production-ready error handling
- ✅ Type-safe with TypeScript strict mode

⚠️ **Justifications**:
- Multiple test files justified: Each user story has distinct assertions and API interactions
- HTTP client enhancements justified: Exponential backoff needed for resilience testing (US8)
- Comprehensive logging justified: Real API debugging requires structured, detailed logs

## Project Structure

### Documentation (Specifications)

```text
specs/001-robust-e2e-testing/
├── spec.md              # Feature requirements (9 user stories, P1-P3)
├── plan.md              # This file - implementation roadmap
├── research.md          # Phase 0: Infrastructure analysis, gaps, recommendations
├── data-model.md        # Phase 1: Data models, API contracts, schemas, TypeScript types
├── quickstart.md        # Phase 1: Setup, configuration, CLI commands, troubleshooting
├── contracts/           # Phase 1: Service interfaces (future: GraphQL/REST specs)
└── tasks.md             # Phase 2: Granular implementation tasks (PENDING)
```

### Source Code (Frontend E2E Testing)

```text
olorin-front/src/shared/testing/e2e/
├── config/
│   └── playwright.config.ts         # Playwright configuration with 11 projects
│
├── utils/
│   ├── api.ts                       # API helpers: getProgress, getEvents, getInvestigationLogs
│   ├── assertions.ts                # Assertion functions: monotonicity, ordering, versioning
│   ├── assertion-helpers.ts         # Helper implementations
│   ├── http-client.ts               # HTTP client with configurable retry/timeout
│   ├── ids.ts                       # Investigation ID extraction helpers
│   ├── logs.ts                      # Log fetching and parsing
│   ├── log-parser.ts                # Structured log analysis
│   ├── types.ts                     # TypeScript interfaces for all models
│   ├── test-logger.ts               # Structured logging with ANSI colors
│   └── validation-schemas.ts        # Zod schemas for API responses
│
└── tests/
    ├── investigation-state-mgmt.e2e.test.ts    # ✅ Implemented: US1, US6
    ├── trigger-investigation.spec.ts           # Phase 2: US1 focused
    ├── verify-progress-and-events.spec.ts      # Phase 2: US3, US4
    ├── verify-ui-reflects-backend.spec.ts      # Phase 2: US6 comprehensive
    ├── verify-snapshot-versioning.spec.ts      # Phase 2: US5
    ├── refresh-rehydrate.spec.ts               # Phase 2: US7
    ├── negative-and-resilience.spec.ts         # Phase 2: US8, US9
    └── logs-validation.spec.ts                 # Phase 2: US2 comprehensive
```

**Structure Decision**: Web application frontend (E2E testing layer), integrated with existing Playwright setup. Tests organized by feature/user story with shared utilities. Configuration-driven with environment variable support. No mocks; real API integration only.

## Complexity Tracking

| Aspect | Complexity | Justification |
|--------|-----------|---|
| Multi-test architecture (7 files) | Medium | Each user story has distinct assertions; separation enables parallel execution and clear responsibilities |
| Real API integration (no mocks) | Medium | Required for production validation; adds integration complexity but eliminates mock maintenance |
| Exponential backoff implementation | Medium | Essential for resilience testing (US8); handles transient failures without flakiness |
| Schema validation (Zod) | Low | Already in codebase; used for API response validation and config loading |
| Environment-driven configuration | Low | Pattern established in existing test; extended with new parameters for timeouts, retry logic |

## Implementation Phases

### Phase 0: Research ✅ COMPLETE
- [x] Analyze existing Playwright setup and utilities
- [x] Identify gaps vs specification requirements
- [x] Document current infrastructure (70% complete)
- [x] Assess risks and dependencies

### Phase 1: Technical Design (PENDING - OUTPUTS READY)
- [x] Define data models for Progress, Events, Logs, Snapshots
- [x] Document API contracts with request/response examples
- [x] Create TypeScript interfaces and Zod schemas
- [x] Write quickstart guide with CLI commands and troubleshooting
- [ ] Create GraphQL/REST contract files (placeholder in /contracts/)

### Phase 2: Implementation Plan (PENDING - NEEDS GENERATION)
- [ ] Generate granular tasks.md with step-by-step implementation
- [ ] Define task dependencies and sequencing
- [ ] Assign complexity levels (Low/Medium/High)
- [ ] Estimate effort per task

### Phase 3: Core Test Implementation (PENDING)
- [ ] Expand existing investigation-state-mgmt test for comprehensive coverage
- [ ] Implement trigger-investigation.spec.ts (US1)
- [ ] Implement verify-progress-and-events.spec.ts (US3, US4)
- [ ] Implement verify-ui-reflects-backend.spec.ts (US6)
- [ ] Add progress monotonicity assertions
- [ ] Add event ordering validators
- [ ] Add server log sequence validators

### Phase 4: Advanced Test Implementation (PENDING)
- [ ] Implement verify-snapshot-versioning.spec.ts (US5)
- [ ] Implement refresh-rehydrate.spec.ts (US7)
- [ ] Implement resilience-and-backoff.spec.ts (US8)
- [ ] Add exponential backoff with jitter
- [ ] Add 429/timeout error injection
- [ ] Add idempotent rendering validation (US9)

### Phase 5: Backend Integration (PENDING)
- [ ] Verify API response formats match data-model.md
- [ ] Test shell command log fetching (LOG_FETCH_CMD)
- [ ] Validate ETag/versioning support
- [ ] Test cross-environment configuration (local/staging/prod)

### Phase 6: Documentation & Polish (PENDING)
- [ ] Extract test logger to shared utilities
- [ ] Create comprehensive README.md
- [ ] Add mobile-specific test variants
- [ ] Implement visual regression baseline screenshots
- [ ] Document all environment variables with examples

### Phase 7: CI/CD Integration (PENDING)
- [ ] Set up GitHub Actions workflow (example provided in quickstart.md)
- [ ] Configure GitLab CI pipeline (example provided in quickstart.md)
- [ ] Add artifact retention and reporting
- [ ] Test parallel execution in CI environment

### Phase 8: Performance & Optimization (PENDING)
- [ ] Profile test execution time
- [ ] Optimize polling intervals per environment
- [ ] Implement test caching for unchanged APIs
- [ ] Document performance baseline

## Quality Gates

**Phase 0 Research Gate**: ✅ PASSED
- Infrastructure analyzed
- Gaps identified
- Risks documented
- Recommendations provided

**Phase 1 Design Gate**: PENDING (ready for approval)
- Data models complete ✅
- API contracts specified ✅
- TypeScript types defined ✅
- Zod schemas provided ✅
- Quickstart written ✅

**Phase 2 Implementation Gate**: PENDING
- Tasks.md generated (awaiting)
- Task dependencies mapped
- Effort estimated
- Risk mitigation planned

## Dependencies & Blockers

**No Blocking Issues**:
- ✅ All required utilities exist
- ✅ Playwright configured and tested
- ✅ Backend APIs confirmed operational
- ✅ WebSocket integration working

**Nice-to-Have Enhancements**:
- Shell-based log fetching (LOG_FETCH_CMD) - functional fallback exists
- ETag caching for snapshots - works with Last-Modified as fallback
- Exponential backoff - not yet implemented, needed for US8

## Success Criteria

**Phase 1 Completion**:
- ✅ Data models documented with TypeScript types
- ✅ API contracts specified with HTTP examples
- ✅ Configuration schema defined with Zod
- ✅ Quickstart guide complete with troubleshooting

**Phase 2-8 Completion**:
- All 9 user stories have passing tests
- 50+ assertions across all user stories
- No test flakiness (< 2% failure rate over 50 CI runs)
- All assertions documented in test output
- Comprehensive error messages for failures
- Mobile and desktop test variants
- CI/CD integration with artifact collection
- Performance baseline documented

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Backend API structure differs from contract | Early API exploration complete; schema validation catches mismatches |
| Investigation completion > 120s | Configurable timeout (TIME_BUDGET_MS); CI default: 180-300s |
| Transient network failures cause flakiness | Implement exponential backoff with jitter (Phase 4) |
| Server logs unavailable | Graceful skip with test annotation (per spec) |
| WebSocket connection drops | HTTP polling fallback already tested |
| Missing UI selectors | Semantic selectors as fallback; locator picker tool available |

## Resource Requirements

**Estimated Effort**:
- Phase 0 (Research): 4 hours ✅ COMPLETE
- Phase 1 (Design): 6 hours ✅ COMPLETE (outputs ready for review)
- Phase 2-8 (Implementation): 20-30 hours (detailed breakdown in tasks.md)

**Team**:
- 1 Frontend test engineer (primary)
- 1 Backend engineer (API validation, optional)
- 1 QA engineer (test strategy review, optional)

**Timeline**:
- Design phase: Complete
- Implementation: 4-5 days (1 person) or 2-3 days (2 people)
- CI/CD integration: 1 day
- Documentation: 1 day

## Next Steps

1. **Immediate**: Phase 1 design approval (review data-model.md, quickstart.md)
2. **Short-term**: Generate Phase 2 tasks.md with granular implementation plan
3. **Mid-term**: Execute Phase 3-4 core and advanced test implementation
4. **Long-term**: Integration, optimization, and documentation polish

---

**Status**: ✅ Ready for Phase 2 Implementation Planning
**Last Updated**: 2025-11-04
**Quality Gate**: ✅ Passed
