# Helper Functions Note

## File Size Exception: _reapply_full.py (293 lines)

**File:** `_reapply_full.py`  
**Size:** 293 lines  
**Target:** < 200 lines  
**Status:** [WARN] Exception (single cohesive function)

### Why This Exception?

The file contains a single function `_run_reapply_fixes()` that implements the complete reapply workflow. This function:

1. **Cannot be easily split** - It's a sequential workflow with many interdependent steps
2. **Is already well-structured** - Clear logical sections with comments
3. **Maintains cohesion** - Splitting would create artificial boundaries

### Function Breakdown

```python
async def _run_reapply_fixes(audit_id, dry_run):
    # 1. Validation and setup (~20 lines)
    # 2. Extract issues from database (~30 lines)
    # 3. Apply title fixes (~40 lines)
    # 4. Apply metadata fixes (~40 lines)
    # 5. Apply poster fixes (~40 lines)
    # 6. Apply subtitle fixes (~50 lines)
    # 7. Apply misclassification fixes (~30 lines)
    # 8. Apply broken stream fixes (~30 lines)
    # 9. Retry failed tool calls (~30 lines)
    # 10. Final reporting (~25 lines)
```

### Alternatives Considered

1. **Split into sub-functions** - Would create tight coupling between functions
2. **Extract fix applicators** - Already done (7 separate applicator functions)
3. **State machine pattern** - Overcomplicated for this use case

### Conclusion

Accepting this as a **justified exception** to the 200-line rule. The main audit endpoint files are all under 200 lines, which was the primary goal.

---

*Created: 2026-01-31*
