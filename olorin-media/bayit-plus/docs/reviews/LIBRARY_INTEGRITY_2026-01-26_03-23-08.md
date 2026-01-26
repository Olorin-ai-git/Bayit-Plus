# Library Integrity Verification Report

**Date**: 2026-01-26 03:23:08 UTC
**Mode**: Dry-Run (Preview Only)
**Scope**: All Content
**Limit**: 100

## Executive Summary

- **Total files scanned**: 100
- **Files verified**: 100
- **Hash mismatches**: 0 
- **GCS files missing**: 0
- **GCS files inaccessible**: 0
- **Streaming failures**: 0
- **Metadata incomplete**: 0
- **Metadata rehydrated**: 0
- **Total issues**: 100
- **Critical issues**: 0

---

## Critical Issues (Immediate Attention Required)

---

## Warnings

---

## Actions Taken

**DRY-RUN MODE**: No changes were made to the database.

## Recommendations

1. **Immediate**: No critical GCS issues
2. **High Priority**: No accessibility issues
3. **Medium Priority**: Metadata complete
4. **Low Priority**: Schedule weekly integrity checks with medium verification level

---

## Verification Configuration

```yaml
batch_size: 50
concurrency: 10
verify_hashes: False
verify_streaming: False
rehydrate_metadata: False
dry_run: True
category_filter: None
limit: 100
total_duration: 0m 9s
avg_time_per_item: 0.09s
```
