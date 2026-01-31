# Audit Endpoints Refactoring Plan

## Current Status: IN PROGRESS ⚙️

**Original File:** `backend/app/api/routes/librarian/audit_endpoints.py`  
**Current Size:** 1,437 lines ❌  
**Target:** Split into 7-8 files, each < 200 lines ✅  

---

## File Structure

### Created ✅
```
app/api/routes/librarian/audit/
├── scheduler.py (115 lines) ✅ - Internal scheduler endpoint
```

### To Create 🔄
```
├── trigger.py (~110 lines) - Admin audit triggering
├── reports.py (~120 lines) - Report management endpoints
├── actions.py (~80 lines) - Action management endpoints
├── control.py (~90 lines) - Audit control (pause/resume/cancel)
├── interaction.py (~170 lines) - Audit interaction (interject/reapply)
├── _helpers.py (~650 lines) - Shared helper functions (11 functions)
└── __init__.py (~30 lines) - Router aggregation
```

**Total Estimated:** 8 files, largest ~170 lines ✅

---

## Endpoint Distribution

### scheduler.py ✅ (1 endpoint)
- POST `/internal/librarian/scheduled-audit` - Cloud Scheduler trigger

### trigger.py (1 endpoint)
- POST `/admin/librarian/run-audit` - Manual audit trigger

### reports.py (3 endpoints)
- GET `/admin/librarian/reports` - List all audit reports  
- GET `/admin/librarian/reports/{audit_id}` - Get specific report
- DELETE `/admin/librarian/reports` - Clear old reports

### actions.py (2 endpoints)
- GET `/admin/librarian/actions` - List librarian actions
- POST `/admin/librarian/actions/{action_id}/rollback` - Rollback action

### control.py (3 endpoints)
- POST `/admin/librarian/audits/{audit_id}/pause` - Pause running audit
- POST `/admin/librarian/audits/{audit_id}/resume` - Resume paused audit  
- POST `/admin/librarian/audits/{audit_id}/cancel` - Cancel running audit

### interaction.py (2 endpoints)
- POST `/admin/librarian/audits/{audit_id}/interject` - Send message to audit
- POST `/admin/librarian/audits/{audit_id}/reapply-fixes` - Reapply fixes

---

## Helper Functions (11 total)

All moved to `_helpers.py`:

1. `_try_reapply_from_recent_audit()` - Lines 130-209 (80 lines)
2. `_run_reapply_fixes()` - Lines 798-1081 (284 lines)
3. `_extract_issues_from_database()` - Lines 1082-1163 (82 lines)
4. `_log_fix_progress()` - Lines 1164-1178 (15 lines)
5. `_apply_title_fixes()` - Lines 1179-1204 (26 lines)
6. `_apply_metadata_fixes()` - Lines 1205-1235 (31 lines)
7. `_apply_poster_fixes()` - Lines 1236-1266 (31 lines)
8. `_apply_subtitle_fixes()` - Lines 1267-1319 (53 lines)
9. `_apply_misclassification_fixes()` - Lines 1320-1347 (28 lines)
10. `_apply_broken_stream_fixes()` - Lines 1348-1381 (34 lines)
11. `_retry_failed_tool_calls()` - Lines 1382-1437 (56 lines)

**Total Helper Lines:** ~720 lines (needs sub-splitting if > 200)

---

## Implementation Status

- [x] Create package directory
- [x] Extract scheduler.py (115 lines) ✅
- [ ] Extract trigger.py (~110 lines)
- [ ] Extract reports.py (~120 lines)
- [ ] Extract actions.py (~80 lines)
- [ ] Extract control.py (~90 lines)
- [ ] Extract interaction.py (~170 lines)
- [ ] Create _helpers.py (needs splitting to sub-modules)
- [ ] Create __init__.py router aggregation
- [ ] Update imports in other files
- [ ] Test all endpoints
- [ ] Deprecate original file

---

## Next Steps

1. ✅ Created `scheduler.py` - 1/7 files complete
2. 🔄 Create remaining router files
3. 🔄 Split `_helpers.py` into sub-modules (it's > 200 lines)
4. 🔄 Create `__init__.py` aggregator
5. 🔄 Test endpoints
6. 🔄 Update imports

**Estimated Remaining Time:** 2-3 hours

---

*Status: PAUSED - scheduler.py created, remaining files pending*  
*Created: 2026-01-31*  
*Last Updated: 2026-01-31*
