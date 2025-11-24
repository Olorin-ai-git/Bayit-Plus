# IS_FRAUD_TX Data Availability Investigation

## Problem Statement

The confusion matrix is not populating correctly because `IS_FRAUD_TX` values are consistently `NULL` for all transactions. This leads to all transactions being excluded from confusion matrix calculations.

## Investigation Approach

### Enhanced Diagnostic Logging

Added comprehensive diagnostic logging to `query_isfraud_tx_for_transactions` function in `investigation_transaction_mapper.py`:

1. **Full Query Logging**: Logs the complete SQL query being executed
2. **Diagnostic Query**: Runs a separate query to check overall `IS_FRAUD_TX` distribution for the queried transactions (without date filter)
3. **Detailed Result Inspection**: Logs the first 5 result rows with transaction IDs and `IS_FRAUD_TX` values, including their types
4. **Distribution Statistics**: Logs counts of fraud, not fraud, and NULL values

### What the Diagnostics Will Reveal

When the server runs and queries `IS_FRAUD_TX`, the logs will show:

1. **Overall Distribution**: Whether `IS_FRAUD_TX` has values in the database for these transactions
   - If the diagnostic query shows non-NULL values but the main query doesn't, it indicates a date filter issue
   - If both show NULL, it indicates the data is actually NULL in the database

2. **Date Filter Impact**: The main query filters by `TX_DATETIME <= window_end`, which may exclude transactions if the date filter is too restrictive

3. **Data Type Issues**: The detailed logging will show if there are any data type mismatches or unexpected value formats

## Expected Scenarios

### Scenario 1: IS_FRAUD_TX is NULL in Database (Expected Behavior)

**If**: Diagnostic query shows all NULL values
**Then**: This is expected if:
- Fraud confirmation happens with a delay (e.g., after chargebacks, disputes, or manual review)
- Recent transactions haven't been confirmed as fraud/not fraud yet
- The column is only populated after a certain time period

**Recommendation**:
- Use a longer lookback period (e.g., 6+ months) to ensure transactions have had time to be confirmed
- Consider excluding recent transactions from confusion matrix calculations
- Document that NULL values are expected and represent unconfirmed transactions

### Scenario 2: IS_FRAUD_TX Has Values But Query Returns NULL (Query Issue)

**If**: Diagnostic query shows non-NULL values but main query returns NULL
**Then**: There may be an issue with:
- Date filter (`TX_DATETIME <= window_end`) being too restrictive
- Transaction ID matching (case sensitivity, type mismatch)
- Query execution or result parsing

**Recommendation**:
- Review the date filter logic
- Verify transaction ID matching is working correctly
- Check if the date filter should be removed or adjusted

### Scenario 3: IS_FRAUD_TX Has Values But Not Being Mapped (Mapping Issue)

**If**: Query returns rows with non-NULL values but they're not being mapped to transactions
**Then**: There may be an issue with:
- Transaction ID normalization
- Dictionary key matching
- Case sensitivity in column names

**Recommendation**:
- Review the transaction ID normalization logic
- Verify dictionary key matching handles both uppercase and lowercase
- Check if transaction IDs need to be converted to strings for consistent comparison

## Next Steps

1. **Run the Server**: Start the server and trigger the startup analysis to generate logs
2. **Review Logs**: Check the diagnostic logs for:
   - `[QUERY_ISFRAUD_TX] DIAGNOSTIC - Overall IS_FRAUD_TX distribution`
   - `[QUERY_ISFRAUD_TX] First 5 result rows`
   - `[QUERY_ISFRAUD_TX] Query returned X rows`
3. **Analyze Results**: Determine which scenario applies based on the diagnostic output
4. **Implement Fix**: Based on the scenario, implement the appropriate fix:
   - If Scenario 1: Adjust lookback period or document expected NULL behavior
   - If Scenario 2: Fix query logic or date filtering
   - If Scenario 3: Fix mapping logic

## Code Changes Made

### File: `olorin-server/app/service/investigation/investigation_transaction_mapper.py`

1. **Enhanced Logging** (lines 124-127):
   - Changed `logger.debug` to `logger.info` for better visibility
   - Added full query logging
   - Added sample transaction IDs logging

2. **Diagnostic Query** (lines 129-162):
   - Added a diagnostic query that checks `IS_FRAUD_TX` distribution without date filter
   - Logs overall statistics (total, non-NULL, NULL, fraud, not fraud counts)

3. **Detailed Result Inspection** (lines 172-182):
   - Logs first 5 result rows with transaction IDs and `IS_FRAUD_TX` values
   - Includes data types for debugging

## Testing

To test the diagnostic logging:

1. Start the server: `cd olorin-server && poetry run uvicorn app.main:app --reload`
2. Trigger startup analysis (if `AUTO_RUN_STARTUP_ANALYSIS=true`)
3. Check logs for `[QUERY_ISFRAUD_TX]` entries
4. Review the diagnostic output to determine the root cause

## Alternative Investigation Script

A standalone diagnostic script (`investigate_isfraud_tx_simple.py`) was created but cannot run due to import dependencies. The enhanced logging in the main codebase provides the same diagnostic capabilities and will execute during normal server operation.

