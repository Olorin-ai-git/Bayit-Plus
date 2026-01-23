# Phase 4: Coverage Expansion - Completion Plan

**Date**: 2026-01-20
**Current Status**: Phase 4A Complete (44 tests created), Phase 4B-4C Ready for Execution
**Objective**: Reach 85% test coverage and update CI/CD threshold

---

## Phase 4B: Coverage Analysis & Gap Identification

### Step 1: Run Full Coverage Analysis

```bash
cd /Users/olorin/Documents/olorin/backend

# Run complete test suite with coverage report
poetry run pytest tests/ \
  --cov=app \
  --cov-report=term-missing \
  --cov-report=html \
  --cov-report=json \
  -v
```

### Step 2: Analyze Coverage Report

The command above generates:
- **Terminal output**: Coverage summary with missing lines
- **HTML report**: `htmlcov/index.html` - detailed visualization
- **JSON report**: Coverage data for processing

**Key metrics to check:**
- Overall coverage percentage
- Services at <80% coverage (priority for additional tests)
- Specific lines/functions missing coverage

### Step 3: Identify Coverage Gaps

After running the report, identify which services need more tests:

```bash
# View coverage by module
cd htmlcov
open index.html  # Open in browser for detailed analysis

# Or check terminal output for modules <80%:
# Look for lines like:
# app/services/live_recording_service.py   45%   123-150, 156-200
# app/services/upload_service/__init__.py   62%   45-67, 89-120
```

### Expected Coverage After Phase 4A Tests

Based on the 44 new tests (26 Series Linker + 18 Support):
- **Series Linker Service**: +5-8% coverage
- **Support Service**: +3-5% coverage
- **Overall Backend**: ~72-75% (estimated)

**Gap to 85%**: Approximately 10-13% additional coverage needed

### Phase 4D: Priority Services for Additional Tests

If overall coverage is <85%, create tests in this priority order:

#### Priority 1: Live Recording Service
**File**: `backend/app/services/live_recording_service.py`
**Current Coverage**: Estimated 40-50%
**Test File**: Create `backend/tests/test_live_recording_integration.py`
**Test Scenarios**:
- Stream start/stop operations
- Segment creation and validation
- Recording state transitions
- Error handling (network failures, buffer issues)
- Storage upload integration
- Concurrent recording handling

#### Priority 2: Upload Service Expansion
**File**: `backend/app/services/upload_service/`
**Current Coverage**: Estimated 55-65%
**Test File**: Extend `backend/tests/test_upload_service_integration.py`
**Additional Test Scenarios**:
- Retry logic for failed uploads
- Quota enforcement
- Concurrent file uploads
- Large file handling (>1GB)
- Storage validation
- Integrity checking edge cases

#### Priority 3: FFmpeg Service Edge Cases
**File**: `backend/app/services/ffmpeg/`
**Current Coverage**: Estimated 60-70%
**Test File**: Extend `backend/tests/test_ffmpeg_service_integration.py`
**Additional Test Scenarios**:
- Codec unsupported scenarios
- Resolution conversion edge cases
- Bitrate adaptation logic
- Subtitle extraction
- Thumbnail generation failures
- Timeout handling

#### Priority 4: Content Metadata Service
**File**: `backend/app/services/olorin/content_metadata_service.py`
**Current Coverage**: Estimated 50-60%
**Test File**: Create `backend/tests/test_content_metadata_integration.py`
**Test Scenarios**:
- Metadata enrichment with external APIs
- Caching behavior
- TMDB integration error handling
- Hebrew language handling
- Metadata validation
- Duplicate detection

---

## Phase 4C: CI/CD Threshold Update

### Step 1: Update PR Validation Workflow

**File**: `.github/workflows/pr-validation.yml`

**Find this section:**
```yaml
- name: Run tests with coverage
  run: |
    poetry run pytest tests/ \
      --cov=app \
      --cov-report=xml \
      --cov-report=term-missing \
      --cov-fail-under=70  # <-- CHANGE THIS LINE
```

**Change to:**
```yaml
- name: Run tests with coverage
  run: |
    poetry run pytest tests/ \
      --cov=app \
      --cov-report=xml \
      --cov-report=term-missing \
      --cov-fail-under=85  # <-- UPDATED TO 85
```

### Step 2: Verify Updated Threshold Locally

```bash
cd /Users/olorin/Documents/olorin/backend

# This should FAIL if coverage <85%
poetry run pytest tests/ \
  --cov=app \
  --cov-fail-under=85 \
  -q

# Expected output (if coverage >=85%):
# ============ X passed in Y.XXs =============
# Coverage report:
# app: 85% (exact percentage varies)
```

### Step 3: Commit Changes

```bash
cd /Users/olorin/Documents/olorin

# Stage the files
git add -A

# Commit with detailed message
git commit -m "Phase 4B-C: Coverage expansion to 85% and CI/CD threshold update

Phase 4A: Added 44 integration tests across 2 files
- test_series_linker_integration.py (26 tests, 556 lines)
- test_support_service_integration.py (18 tests, 422 lines)

Phase 4B: Analyzed coverage gaps and identified priority services

Phase 4C: Updated CI/CD threshold
- Changed pr-validation.yml: --cov-fail-under=70 → --cov-fail-under=85
- Enforces 85% minimum coverage for all future PRs

Coverage impact:
- Series Linker: +5-8%
- Support Service: +3-5%
- Overall backend: +2-3%

Next: Phase 4D - Create additional tests if needed to reach 85%

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"

# View the commit
git log --oneline -1
```

---

## Phase 4D: Additional Test Creation (If Needed)

**Decision Point**: Run Phase 4B analysis first.

- **If coverage ≥85%**: Skip to Phase 5 (Performance Monitoring)
- **If coverage <85%**: Create additional tests following Priority 1-4 above

### Example: Creating Live Recording Tests

```bash
# Create test file
touch backend/tests/test_live_recording_integration.py

# Add content based on pattern from Series Linker/Support tests:
# 1. Create database fixtures with test data
# 2. Create service fixtures (LiveRecordingService instance)
# 3. Implement test methods for each scenario
# 4. Use async/await patterns from existing tests
# 5. Implement proper cleanup in fixtures
```

---

## Phase 4 Completion Checklist

### Phase 4A ✅
- [x] Series Linker integration tests created (26 tests)
- [x] Support Service integration tests created (18 tests)
- [x] All tests passing locally
- [x] Changes committed (e464274a)
- [x] Documentation created

### Phase 4B ⏳
- [ ] Full test suite run with coverage analysis
- [ ] Coverage report generated (HTML + JSON)
- [ ] Current coverage percentage identified
- [ ] Coverage gaps analyzed
- [ ] Priority services for Phase 4D identified

### Phase 4C ⏳
- [ ] `.github/workflows/pr-validation.yml` updated (70% → 85%)
- [ ] Updated threshold tested locally
- [ ] New threshold verified to work
- [ ] Changes committed with detailed message

### Phase 4D (If Needed) ⏳
- [ ] Phase 4B results reviewed
- [ ] Decision: additional tests needed? (yes/no)
- [ ] If yes: Create tests for priority services
- [ ] If yes: Verify new tests reach 85% target
- [ ] If yes: Commit Phase 4D changes

### Phase 4 Final ⏳
- [ ] All tests passing
- [ ] Coverage ≥85% verified
- [ ] CI/CD threshold enforces 85%
- [ ] No regressions in existing tests
- [ ] PHASE4_TEST_EXPANSION_SUMMARY.md updated with final results
- [ ] Phase 5 planning complete

---

## Timeline & Next Steps

**Phase 4 Status**: 50% complete (4A & 4C ready, 4B pending execution)

**Execution Timeline**:
1. **Today**: Execute Phase 4B (coverage analysis) - 10 minutes
2. **Today**: Review results and make Phase 4D decision - 5 minutes
3. **If needed**: Execute Phase 4D (additional tests) - 2-4 hours depending on gap size
4. **Today/Tomorrow**: Execute Phase 4C (CI/CD update) - 5 minutes
5. **Tomorrow**: Begin Phase 5 (Performance Monitoring)

**Phase 5 Dependencies**:
- Phase 4 complete (all tests passing, coverage ≥85%)
- CI/CD threshold updated and verified
- No pending test failures

---

## Critical Notes

### Test Database Isolation
All Phase 4 tests use isolated test databases:
- Database name pattern: `{MONGODB_DB_NAME}_service_test`
- Automatic cleanup via fixture teardown
- No impact on production data

### Async/Await Patterns
All Phase 4 tests properly implement async patterns:
- Service methods awaited: `await service.method()`
- Fixtures use `@pytest_asyncio.fixture`
- Test methods marked with `@pytest.mark.asyncio`

### Coverage Analysis Notes
- Coverage percentage varies based on:
  - Number of lines in service
  - Complexity of service methods
  - Number of error paths tested
  - Number of edge cases covered

- Estimated percentages:
  - Series Linker contribution: +5-8% (complex service)
  - Support Service contribution: +3-5% (moderate service)
  - Each additional test file: +2-5% (depends on target service size)

### Phase 4D Estimation
If Phase 4B shows <85% coverage:
- Live Recording tests would add: ~3-5%
- Upload Service tests would add: ~2-4%
- FFmpeg tests would add: ~2-3%
- Combined (if needed): ~7-12% to reach 85%

---

## Success Criteria

- [x] 40+ new test methods (Phase 4A complete: 44 tests)
- [x] Tests follow project patterns (Series Linker & Support tests use established patterns)
- [x] Database isolation implemented (fixtures with cleanup)
- [ ] Overall coverage reaches 85%+ (pending Phase 4B analysis)
- [ ] All new tests passing (Phase 4A passing, Phase 4D dependent on creation)
- [ ] CI/CD threshold updated to 85% (Phase 4C pending)

---

## Files & Commits

### Phase 4A Commits
- **e464274a**: Series Linker & Support Service integration tests

### Phase 4B-C Commits (To be completed)
- Next commit: Phase 4B analysis + Phase 4C CI/CD update
- Following commit (if needed): Phase 4D additional tests

### Documentation
- `/PHASE4_TEST_EXPANSION_SUMMARY.md` - Phase 4A detailed summary
- `/PHASE4_COMPLETION_PLAN.md` - This file (Phase 4B-4C-4D guidance)

---

## Quick Command Reference

```bash
# Phase 4B: Generate coverage report
cd /Users/olorin/Documents/olorin/backend
poetry run pytest tests/ --cov=app --cov-report=html --cov-report=term-missing -v

# Phase 4C: Test new threshold
poetry run pytest tests/ --cov=app --cov-fail-under=85 -q

# View HTML coverage report
open /Users/olorin/Documents/olorin/backend/htmlcov/index.html

# Commit Phase 4 work
cd /Users/olorin/Documents/olorin
git add backend/tests/*.py .github/workflows/pr-validation.yml *.md
git commit -m "Phase 4B-C: Coverage analysis and CI/CD threshold update"
```

---

**Next Phase**: Once Phase 4 complete, proceed to **Phase 5: Performance Monitoring & Optimization** (Dashboard setup, SLO definition, Alerting configuration)

See also: [PRODUCTION_READINESS_FINAL.md](./PRODUCTION_READINESS_FINAL.md), [PHASE4_TEST_EXPANSION_SUMMARY.md](./PHASE4_TEST_EXPANSION_SUMMARY.md)
