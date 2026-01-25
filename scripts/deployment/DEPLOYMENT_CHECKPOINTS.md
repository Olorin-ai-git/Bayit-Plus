# Deployment Checkpoint Template

## Purpose
This document defines the validation checkpoints required after each deployment phase to ensure safe, incremental rollout.

## Checkpoint Workflow

After each phase/batch deployment:

1. **Deploy to staging**: Run `./scripts/deployment/deploy-staging.sh`
2. **Monitor for 2-4 hours**: Observe key metrics
3. **Review metrics**: Validate against thresholds
4. **Get explicit approval**: Document decision to proceed
5. **Document rollback procedure**: Ensure rollback path is tested

## Metrics to Monitor

### Error Rate
- **Threshold**: < baseline + 5%
- **Tool**: Sentry, Cloud Logging
- **Action if exceeded**: Investigate root cause, consider rollback

### API Latency
- **Threshold**: p95 < 500ms
- **Tool**: Cloud Run metrics, Application Performance Monitoring
- **Action if exceeded**: Profile slow endpoints, optimize

### Notification System Errors
- **Threshold**: < 10 errors per 5 minutes
- **Tool**: Cloud Logging, filtered by notification-related logs
- **Action if exceeded**: Check notification provider status, validate store

### Crash Rate
- **Threshold**: 0 crashes
- **Tool**: Sentry, Cloud Error Reporting
- **Action if exceeded**: Immediate investigation, rollback if critical

### Memory Usage
- **Threshold**: < 80% of allocated memory
- **Tool**: Cloud Run metrics
- **Action if exceeded**: Check for memory leaks, optimize

## Checkpoint Checklist

### Pre-Deployment
- [ ] All tests passing (119 notification tests)
- [ ] No console.log violations
- [ ] No new file size violations (baseline: 19)
- [ ] Code reviewed and approved
- [ ] Rollback procedure documented and tested
- [ ] Stakeholders notified of deployment

### Deployment Execution
- [ ] Staging deployment successful
- [ ] Smoke tests passed (11/11)
- [ ] No deployment errors in logs
- [ ] All services healthy

### Post-Deployment Monitoring (2-4 hours)
- [ ] Error rate within threshold
- [ ] API latency within threshold
- [ ] No notification system errors
- [ ] No crashes reported
- [ ] Memory usage stable
- [ ] User-reported issues: 0

### Approval to Proceed
- [ ] All metrics within thresholds
- [ ] Manual validation complete
- [ ] Team lead approval obtained
- [ ] Next phase planned and documented

## Example Checkpoint Report

```
Deployment Checkpoint Report
============================
Phase: Phase 1 Batch 1 - Voice/Audio Services
Date: 2026-01-25
Duration Monitored: 4 hours

Metrics:
✅ Error rate: 2.1% (baseline: 2.0%, threshold: 7.0%)
✅ API latency p95: 340ms (threshold: 500ms)
✅ Notification errors: 0 (threshold: 10/5min)
✅ Crashes: 0
✅ Memory usage: 62% (threshold: 80%)

Manual Validation:
✅ Wake word detection functional
✅ TTS synthesis working
✅ Live dubbing no latency increase
✅ Voice commands E2E functional

Decision: APPROVED to proceed to Phase 1 Batch 2

Approved by: [Name]
Date/Time: 2026-01-25 14:30 PST
```

## Rollback Decision Tree

```
Production Issue Detected
  ↓
Is error rate > baseline + 10%?
  ↓ YES
  Auto-rollback last deployment (full)
  ↓
  Rollback successful?
    ↓ NO
    Manual intervention required:
    1. Identify failing phase from logs
    2. Execute phase-specific rollback
    3. Redeploy without failing change
    4. Monitor 2 hours
    
    ↓ YES
    Post-rollback validation:
    1. Verify error rate returned to baseline
    2. Check all services healthy
    3. Document incident
    4. Schedule post-mortem
```

## Phase-Specific Checkpoints

### Phase 1 Batch 1: Voice/Audio Services
**Critical Metrics:**
- Wake word latency < 100ms (95th percentile)
- TTS synthesis < 500ms
- Live dubbing sync < 200ms
- Voice command E2E < 1500ms

**Validation:**
- Manual testing of wake word detection
- TTS quality verification
- Live dubbing audio sync check
- Voice command accuracy testing

### Phase 2: File Refactoring
**Critical Metrics:**
- No functional regressions
- Visual regression tests: 0 pixel differences
- Admin CRUD operations functional
- Database queries unchanged performance

**Validation:**
- Manual testing of all refactored screens
- Visual comparison screenshots
- CRUD operation smoke tests
- Query performance benchmarks

### Phase 3: Integration Implementation
**Critical Metrics:**
- i18n translations loading correctly
- Keyboard navigation functional
- Swipe gestures working
- Haptic feedback triggering

**Validation:**
- Test all 10 languages
- Keyboard-only navigation test
- Physical device gesture testing
- Haptic feedback verification

## Emergency Contacts

- **On-Call Engineer**: [Slack: @oncall]
- **Team Lead**: [Contact info]
- **Infrastructure Team**: [Slack: #infrastructure]
- **Security Team**: [Slack: #security]

## Deployment Log Template

```
Deployment Log
==============
Phase: [Phase name]
Batch: [Batch number]
Start Time: [YYYY-MM-DD HH:MM:SS]
End Time: [YYYY-MM-DD HH:MM:SS]
Duration: [X hours]

Pre-Deployment:
- Tests: [PASS/FAIL]
- Code Review: [APPROVED]
- Rollback: [TESTED]

Deployment:
- Staging: [SUCCESS/FAIL]
- Smoke Tests: [11/11 PASS]
- Services: [ALL HEALTHY]

Monitoring (2-4h):
- Error Rate: [%]
- Latency p95: [ms]
- Crashes: [count]
- Issues: [count]

Decision: [APPROVED/ROLLBACK]
Next Phase: [Phase name]
```
