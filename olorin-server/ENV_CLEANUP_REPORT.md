# .env File Cleanup Report

Generated: $(date)

## Summary

- **Original lines**: 744
- **Unique properties**: 566
- **Duplicates removed**: 2
- **Unused properties found**: 52
- **Properties after cleanup**: 566

## Changes Made

### 1. Duplicates Removed

| Property | First Value | Duplicate Value | Action |
|----------|-------------|-----------------|--------|
| `ANALYTICS_DEFAULT_GROUP_BY` | `MERCHANT_NAME` | `merchant_name` | ⚠️ Kept first (values differ!) |
| `ANALYZER_TIME_WINDOW_HOURS` | `24` | `24` | ✅ Kept first (values same) |

### 2. Added Property

| Property | Value | Reason |
|----------|-------|--------|
| `RISK_THRESHOLD_DEFAULT` | `0.5` | Recommended by merchant outlier tuning (see MERCHANT_OUTLIER_TUNING_SUMMARY.md) |

## Unused Properties (52)

The following properties are defined in `.env` but not referenced in the codebase:

<details>
<summary>Click to expand unused properties list</summary>

- `ANALYTICS_DEFAULT_TIME_WINDOW`
- `ANOMALY_DETECTION_API_KEY`
- `AURA_INSTANCEID`
- `AURA_INSTANCENAME`
- `AUTO_RUN_SCHEDULED_DETECTIONS`
- `BLOCKCHAIN_API_KEY`
- `CAPTURE_LLM_RESPONSES`
- `CHAINALYSIS_API_KEY`
- `COMPOSIO_FIGMA_URL`
- `COMPOSIO_GITHUB_URL`
- `COMPOSIO_GOOGLE_CALENDAR_URL`
- `COMPOSIO_GOOGLE_DRIVE_URL`
- `COMPOSIO_SLACK_URL`
- `CRYPTOCURRENCY_API_KEY`
- `DARKWEB_API_KEY`
- `DATABRICKS_CLUSTER_ID`
- `DATABRICKS_HOST`
- `ENABLE_RULE_BASED_MODEL`
- `ETHERSCAN_API_KEY`
- `FIRE_CRAWL_API_KEY`
- `FRAUD_DETECTION_API_KEY`
- `INTELLIGENCE_API_KEY`
- `INVESTIGATION_EXPORT_MAX_SIZE_MB`
- `INVESTIGATION_EXPORT_URL_EXPIRY_HOURS`
- `INVESTIGATION_HISTORY_RETENTION_DAYS`
- `INVESTIGATION_LOG_FILE`
- `INVESTIGATION_MAX_CONCURRENT_PER_USER`
- `INVESTIGATION_MAX_DURATION_MINUTES`
- `INVESTIGATION_POLLING_STATUS_CACHE_TTL_SECONDS`
- `INVESTIGATION_RESULTS_QUERY_TIMEOUT_MS`
- `INVESTIGATION_STATUS_QUERY_TIMEOUT_MS`
- `INVESTIGATION_STREAMING_BATCH_SIZE`
- `ML_AI_API_KEY`
- `OSINT_API_KEY`
- `POSTGRES_MAX_TRANSACTIONS_LIMIT`
- `POSTGRES_POOL_MAX_OVERFLOW`
- `POSTGRES_POOL_SIZE`
- `POSTGRES_POOL_TIMEOUT`
- `POSTGRES_QUERY_TIMEOUT`
- `RISK_LEVEL_CRITICAL_THRESHOLD`
- `RISK_LEVEL_HIGH_THRESHOLD`
- `RISK_LEVEL_LOW_THRESHOLD`
- `RISK_LEVEL_MEDIUM_THRESHOLD`
- `SKIP_ANOMALY_CONFIG_ON_STARTUP_FAILURE`
- `SNOWFLAKE_HOST`
- `SNOWFLAKE_MAX_TRANSACTIONS_LIMIT`
- `SNOWFLAKE_POOL_MAX_OVERFLOW`
- `SNOWFLAKE_POOL_SIZE`
- `SNOWFLAKE_POOL_TIMEOUT`
- `SNOWFLAKE_QUERY_TIMEOUT`
- `SOCIAL_MEDIA_API_KEY`
- `TOP_N_RISKY_ENTITIES`

</details>

**Note**: These properties are kept in the file in case they're referenced in configuration files, scripts, or documentation. They can be safely removed if confirmed unused.

## Recommendations

### Immediate Actions

1. **Apply cleaned .env**:
   ```bash
   mv .env.cleaned .env
   ```

2. **Verify no regressions**:
   ```bash
   # Test server startup
   poetry run python -m app.local_server
   ```

### Optional Actions

1. **Remove unused properties**: 
   - Review the list of 52 unused properties
   - Remove if confirmed not needed by external tools/scripts

2. **Standardize naming**:
   - Note: `ANALYTICS_DEFAULT_GROUP_BY` had conflicting values
   - First value (`MERCHANT_NAME`) was kept
   - Verify this is correct for your use case

3. **Add missing recommended properties**:
   - `RISK_THRESHOLD_DEFAULT=0.5` (already added)

## Files Created

- `.env.backup.YYYYMMDD_HHMMSS` - Original .env backup
- `.env.cleaned` - Cleaned .env file (ready to use)
- `ENV_CLEANUP_REPORT.md` - This report

## Validation

To verify the cleaned .env works correctly:

```bash
# 1. Count properties
grep -cE '^[A-Z_]+=' .env.cleaned
# Expected: 566

# 2. Check for duplicates
grep -E '^[A-Z_]+=' .env.cleaned | sed 's/=.*//' | sort | uniq -d
# Expected: (empty)

# 3. Verify RISK_THRESHOLD_DEFAULT
grep "^RISK_THRESHOLD_DEFAULT=" .env.cleaned
# Expected: RISK_THRESHOLD_DEFAULT=0.5
```

## Related Documentation

- `MERCHANT_OUTLIER_TUNING_SUMMARY.md` - Explains why RISK_THRESHOLD_DEFAULT=0.5 is recommended

