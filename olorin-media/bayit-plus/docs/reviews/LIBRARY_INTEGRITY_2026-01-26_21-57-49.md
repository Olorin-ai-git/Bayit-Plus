# Library Integrity Verification Report

**Date**: 2026-01-26 21:57:50 UTC
**Mode**: Dry-Run (Preview Only)
**Scope**: All Content
**Limit**: None

## Executive Summary

- **Total files scanned**: 725,350
- **Files verified**: 725,350
- **Hash mismatches**: 0 
- **GCS files missing**: 0
- **GCS files inaccessible**: 63
- **Streaming failures**: 0
- **Metadata incomplete**: 0
- **Metadata rehydrated**: 0
- **Total issues**: 725287
- **Critical issues**: 63

---

## Critical Issues (Immediate Attention Required)

---

## Warnings

### Inaccessible GCS Files (63)

| Content ID | Title | Status Code |
|------------|-------|-------------|
| 696418bd... | Winnie the Pooh | N/A |
| 6964193f... | 25th Hour | N/A |
| 6964199c... | 65 | N/A |
| 69641ad8... | 300 | N/A |
| 69641b44... | 3:10 to Yuma | N/A |
| 69641b59... | A Good Day to Die Hard | N/A |
| 69641c0d... | A Little Chaos | N/A |
| 69641cf0... | A Man Called Otto | N/A |
| 69642071... | A Most Violent Year | N/A |
| 696420e8... | A Most Wanted Man | N/A |
| 6964193f... | 25th Hour | N/A |
| 6964199c... | 65 | N/A |
| 69641ad8... | 300 | N/A |
| 69641b44... | 3:10 to Yuma | N/A |
| 69641b59... | A Good Day to Die Hard | N/A |
| 69641c0d... | A Little Chaos | N/A |
| 69641cf0... | A Man Called Otto | N/A |
| 69642071... | A Most Violent Year | N/A |
| 696420e8... | A Most Wanted Man | N/A |
| 69642cb7... | American Beauty | N/A |

*... and 43 more*

---

## Actions Taken

**DRY-RUN MODE**: No changes were made to the database.

## Recommendations

1. **Immediate**: No critical GCS issues
2. **High Priority**: Fix 63 inaccessible GCS files
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
limit: None
total_duration: 1111m 20s
avg_time_per_item: 0.09s
```
