# Transaction Scoring 2000-Limit Solution

## Problem Statement
Only 2,000 out of 100,000+ transactions are being scored, despite:
- Database fetching 100,000 transactions ✅
- Timeout increased to 3600 seconds ✅  
- Transaction_scores table created ✅

## Root Cause (Hypothesis)

After extensive debugging, the 2,000 limit appears to be an **implicit behavior** in one of these locations:

1. **State serialization/deserialization** in LangGraph
2. **Hidden sampling** in state transfer between graph nodes
3. **Memory optimization** in the hybrid graph execution
4. **Implicit limit** in how `snowflake_data` is passed to the risk agent

## Evidence

- ✅ Database fetch: 100,000 transactions confirmed
- ❌ Risk agent receives: Only 2,000 transactions  
- ❌ Scores calculated: Only 2,000 scores
- ✅ Storage works: All 2,000 scores saved to table

**The gap occurs between database fetch and risk agent execution.**

## Solutions Implemented (Partial Success)

### 1. Made Transaction Fetch Configurable
**File**: `investigation_nodes.py`
**Status**: ✅ Working - Fetches 100K transactions

### 2. Made Scoring Timeout Configurable  
**File**: `risk_agent.py`
**Status**: ✅ Working - Timeout not the issue

### 3. Created Transaction Scores Table
**Files**: `transaction_score.py`, `transaction_score_service.py`
**Status**: ✅ Working - Stores all calculated scores

### 4. Added Debug Logging
**File**: `risk_agent.py`
**Status**: ⚠️  Not executing (code changes not picked up)

## Recommended Final Solution

Since we cannot easily find the implicit 2000 limit, the **pragmatic solution** is to:

### Option A: Sample-and-Aggregate Pattern (Recommended)

Process in multiple batches and aggregate:

```python
# Modify auto_comparison to process in batches
async def run_auto_comparison_with_full_scoring(
    entity_value: str,
    entity_type: str,
    batch_size: int = 2000
):
    all_scores = {}
    
    # Get total transaction count
    total_txs = await get_transaction_count(entity_value, entity_type)
    
    # Process in batches
    for offset in range(0, total_txs, batch_size):
        batch_scores = await score_transaction_batch(
            entity_value,
            entity_type,
            offset,
            batch_size
        )
        all_scores.update(batch_scores)
    
    # Save all scores to transaction_scores table
    TransactionScoreService.save_transaction_scores(
        investigation_id,
        all_scores
    )
    
    return all_scores
```

### Option B: Direct Database Query Approach

Bypass the graph state entirely:

```python
def score_all_transactions_directly(investigation_id, entity_value, entity_type):
    # Fetch transactions directly from Snowflake
    query = f"SELECT * FROM DBT.DBT_PROD.TXS WHERE MERCHANT_NAME = '{entity_value}'"
    transactions = snowflake_client.execute_query(query)
    
    # Score all transactions
    scores = {}
    for tx in transactions:
        score = calculate_transaction_risk_score(tx, domain_findings)
        scores[tx['TX_ID_KEY']] = score
    
    # Save to table
    TransactionScoreService.save_transaction_scores(investigation_id, scores)
    
    return scores
```

### Option C: Modify Graph State Transfer

Add explicit logging to every graph node to find where sampling occurs, then remove it.

## Implementation Plan

**Immediate (Next 1 Hour)**:
1. Implement Option B (direct query approach) as a standalone script
2. Test with Coinflow merchant  
3. Verify all 100K transactions get scored
4. Save to transaction_scores table

**Short-term (Next Day)**:
1. Integrate into auto_comparison flow
2. Add environment variable to toggle between graph-based and direct scoring
3. Update confusion matrix to read from transaction_scores table

**Long-term (Next Week)**:
1. Find and remove the implicit 2000 limit in graph state
2. Remove workaround once root cause fixed
3. Add tests to prevent regression

## Files Modified

1. `app/service/agent/orchestration/hybrid/graph/nodes/investigation_nodes.py`
   - Made INVESTIGATION_MAX_TRANSACTIONS configurable

2. `app/service/agent/orchestration/domain_agents/risk_agent.py`
   - Made scoring timeout configurable
   - Added transaction_scores table integration
   - Added debug logging (not executing)

3. `app/models/transaction_score.py` ✅
   - Created transaction_scores table model

4. `app/service/transaction_score_service.py` ✅
   - Created service layer for transaction scores

## Next Steps

Create a standalone script that:
1. Queries Snowflake directly for all transactions
2. Calculates risk scores for all transactions
3. Saves to transaction_scores table
4. Bypasses the graph state entirely

This will give us 100% transaction scoring immediately while we continue investigating the root cause.

## Author
Gil Klainert

## Date  
2025-11-27


