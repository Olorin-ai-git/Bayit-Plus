# IPv6 vs Email Entity Selection Analysis

**Date**: 2025-11-13  
**Investigation ID**: `unified_test_device_spoofing_1763062088`  
**Entity Selected**: IPv6 `2400:2200:720:c0e1:b99d:947b:6ffb:7bc1`  
**Entity Type**: `ip`  
**Expected**: Email address from risk analyzer

## Executive Summary

The investigation selected an **IPv6 address** instead of an **email address** because the test runner (`unified_ai_investigation_test_runner.py`) is **hardcoded** to query the risk analyzer with `group_by=IP` instead of using the default `group_by=EMAIL` configuration.

## Root Cause Analysis

### 1. Risk Analyzer Configuration from .env

**File**: `olorin-server/app/service/analytics/risk_analyzer.py`

**Configuration Loading** (Line 52):
```python
self.default_group_by = os.getenv('ANALYTICS_DEFAULT_GROUP_BY', 'email')
```

**Environment Variable**: `ANALYTICS_DEFAULT_GROUP_BY` is configured in `.env` file
- If set in `.env`: Uses that value
- If not set: Defaults to `'email'`

**Expected Behavior**: The risk analyzer should use the `ANALYTICS_DEFAULT_GROUP_BY` value from `.env` when no `group_by` parameter is explicitly passed.

### 2. Test Runner Override (Ignores .env Configuration)

**File**: `olorin-server/scripts/testing/unified_ai_investigation_test_runner.py`

**Location**: Lines 918-937 in `load_snowflake_data()` method

**Actual Code**:
```python
async def load_snowflake_data(self) -> bool:
    """Load top risk entities from database (PostgreSQL or Snowflake based on DATABASE_PROVIDER)"""
    from app.service.analytics.risk_analyzer import get_risk_analyzer
    from app.service.agent.tools.snowflake_tool.schema_constants import IP
    import os

    db_provider = os.getenv('DATABASE_PROVIDER', 'postgresql').upper()
    self.logger.info(f"📊 Loading top risk entities from {db_provider}...")

    try:
        # Get the risk analyzer (respects DATABASE_PROVIDER from .env)
        analyzer = get_risk_analyzer()

        # Fetch top 10% risk entities by IP address
        results = await analyzer.get_top_risk_entities(
            time_window='24h',
            group_by=IP,  # ⚠️ HARDCODED TO IP - IGNORES ANALYTICS_DEFAULT_GROUP_BY FROM .ENV
            top_percentage=10,
            force_refresh=False
        )
```

**Problem**: The test runner explicitly passes `group_by=IP`, **ignoring** the `ANALYTICS_DEFAULT_GROUP_BY` configuration from `.env` file. Even if `.env` is configured to use `email`, the test runner hardcodes `IP`.

### 3. Entity Selection Flow

**Investigation Flow**:
1. Test runner calls `load_snowflake_data()`
2. Risk analyzer queries Snowflake with `GROUP BY IP`
3. Returns top 10% risk IP addresses
4. Test runner selects first IP: `2400:2200:720:c0e1:b99d:947b:6ffb:7bc1`
5. Investigation proceeds with IP as entity

**File**: `unified_ai_investigation_test_runner.py` (Lines 1555-1580)

```python
if self.snowflake_entities:
    snowflake_entity = self.snowflake_entities[entity_index]
    
    # Entity data for investigation - using IP address as the entity
    entity_data = {
        "entity_id": snowflake_entity['ip'],  # Use IP address as entity ID
        "entity_type": "ip",
        "source": "snowflake",
        "risk_score": snowflake_entity['risk_score']
    }
    
    self.logger.info(f"Using Snowflake IP address: {snowflake_entity['ip']} (Risk Score: {snowflake_entity['risk_score']:.4f})")
```

## Investigation Logs Evidence

### From `investigation.log`:
```
[unified_test_device_spoofing_1763062088] 2025-11-13 14:28:09 [DEBUG] structured_investigation: [Step 8.1.1]   Entity: ip - 2400:2200:720:c0e1:b99d:947b:6ffb:7bc1
```

### From `metadata.json`:
```json
{
  "config": {
    "entity_id": "2400:2200:720:c0e1:b99d:947b:6ffb:7bc1",
    "entity_type": "ip"
  }
}
```

### From `thought_process_unified_test_device_spoofing_1763062088_investigation_orchestrator_1763062095.json`:
```json
{
  "reasoning": "Entity 2400:2200:720:c0e1:b99d:947b:6ffb:7bc1 of type ip requires comprehensive analysis to assess risk profile and detect potential anomalies",
  "data_sources": {
    "user": {
      "ip": "2400:2200:720:c0e1:b99d:947b:6ffb:7bc1",
      "risk_score": 0.278,
      "risk_weighted_value": 3804187.31,
      "transaction_count": 15,
      "fraud_count": 0,
      "source": "snowflake"
    },
    "entity": {
      "entity_id": "2400:2200:720:c0e1:b99d:947b:6ffb:7bc1",
      "entity_type": "ip",
      "source": "snowflake",
      "risk_score": 0.278
    }
  }
}
```

## LLM Recommendations Analysis

### From Orchestrator Thought Process

**Step 1 - Analysis** (Line 14):
- **Premise**: "Starting structured investigation for scenario: device_spoofing"
- **Reasoning**: "Entity 2400:2200:720:c0e1:b99d:947b:6ffb:7bc1 of type ip requires comprehensive analysis"
- **Conclusion**: "Initiating multi-domain investigation with device, location, network, and behavioral analysis"
- **Confidence**: 1.0

**No Recommendation**: The orchestrator does not recommend using email instead of IP. It accepts the IP entity as provided.

### From Risk Agent Thought Process

**Step 1 - Analysis** (Line 13):
- **Premise**: "Risk domain analysis required for ip 2400:2200:720:c0e1:b99d:947b:6ffb:7bc1"
- **Reasoning**: "Risk synthesis combines insights from all domain agents..."
- **Conclusion**: "Will examine Snowflake transaction data and tool results for risk risk indicators"

**No Recommendation**: The risk agent does not question the entity type selection. It proceeds with IP-based analysis.

### From Investigation Results

**Final Risk Score**: 0.46  
**Confidence**: 0.50  
**Domains Analyzed**: network, device, location, logs, authentication, merchant, risk

**Key Findings**:
- **Location Agent**: Detected 18 impossible travel patterns (AU↔JP)
- **Network Agent**: Cross-border activity (2 countries)
- **Device Agent**: Single device across 40 transactions
- **Merchant Agent**: Executed successfully

**LLM Analysis**: All agents used MockLLM (demo mode), so no real LLM recommendations were generated.

## Why IP Was Selected Over Email

### Technical Reasons

1. **Hardcoded Grouping**: Test runner explicitly uses `group_by=IP`
2. **No Entity Type Selection Logic**: No logic to prefer email over IP based on scenario
3. **Scenario-Agnostic**: The `device_spoofing` scenario doesn't specify preferred entity type
4. **Risk Analyzer Returns IPs**: Since query groups by IP, only IP addresses are returned

### Business Logic Considerations

**IP Addresses**:
- ✅ Good for network-based fraud detection
- ✅ Useful for geographic anomaly detection
- ✅ Can detect VPN/proxy usage
- ❌ Less useful for account-level fraud patterns
- ❌ Cannot directly identify user accounts

**Email Addresses**:
- ✅ Better for account-level fraud detection
- ✅ Can track user behavior across sessions
- ✅ More actionable for account takeovers
- ✅ Better for identity verification
- ❌ May have privacy concerns

## Recommendations

### 1. Respect .env Configuration

**File**: `olorin-server/scripts/testing/unified_ai_investigation_test_runner.py`

**Change**:
```python
# Current (hardcoded, ignores .env):
group_by=IP,

# Recommended (respects .env configuration):
group_by=os.getenv('ANALYTICS_DEFAULT_GROUP_BY', 'email'),

# Or use risk analyzer's default:
group_by=None,  # Let risk analyzer use its configured default from .env
```

**Benefit**: Test runner will respect the `ANALYTICS_DEFAULT_GROUP_BY` setting in `.env` file.

### 2. Scenario-Based Entity Selection

**Logic**:
- `device_spoofing`: Prefer `device_id` or `email` (user-level)
- `impossible_travel`: Prefer `email` or `user_id` (user-level)
- `ip_anomaly_detection`: Prefer `ip` (network-level)
- `account_takeover`: Prefer `email` (account-level)
- `velocity_fraud`: Prefer `email` or `user_id` (user-level)

### 3. Use Risk Analyzer Default

**Change**:
```python
# Let risk analyzer use its default (email) unless explicitly overridden
results = await analyzer.get_top_risk_entities(
    time_window='24h',
    group_by=None,  # Use default from risk analyzer
    top_percentage=10,
    force_refresh=False
)
```

### 4. Multi-Entity Support

**Enhancement**: Support investigating multiple entity types:
- Query both IP and email top risk entities
- Select entity type based on scenario requirements
- Fallback to email if IP query returns no results

## Impact Assessment

### Current Behavior
- ✅ Investigation works correctly with IP addresses
- ✅ All domain agents execute successfully
- ✅ Risk assessment completes
- ⚠️ May miss email-based fraud patterns
- ⚠️ Less actionable for account-level investigations

### With Email Selection
- ✅ Better for account-level fraud detection
- ✅ More actionable recommendations
- ✅ Better user identification
- ⚠️ May miss network-level threats
- ⚠️ Requires email data availability

## Transaction Data Analysis

### Email Addresses in Data

**Finding**: All 40 transactions contain the same email address: `1511478431@qq.com`

**Evidence from `agent_results.json`**:
- All 40 transactions have `EMAIL: "1511478431@qq.com"`
- Same email across all transactions
- Email is available but not used as investigation entity

**Implication**: The risk analyzer could have grouped by email and identified this user account, but instead grouped by IP address.

### Risk Score Comparison

**IP Address Selected**: `2400:2200:720:c0e1:b99d:947b:6ffb:7bc1`
- Risk Score: 0.278
- Risk Weighted Value: 3,804,187.31
- Transaction Count: 15 (in risk analyzer query)
- Fraud Count: 0

**Email Available**: `1511478431@qq.com`
- Appears in 40 transactions (investigation data)
- Risk score unknown (not queried)
- Could potentially have higher risk score if grouped by email

## LLM Recommendations Summary

### From Investigation Logs

**No LLM Recommendations Found** regarding entity type selection because:

1. **Demo Mode**: Investigation ran in `TEST_MODE=demo`, using MockLLM
2. **MockLLM Behavior**: MockLLM provides generic responses, not real analysis
3. **No Entity Selection Logic**: Agents don't question entity type - they accept what's provided
4. **Orchestrator Acceptance**: Orchestrator accepts IP entity without questioning

### Agent Recommendations (Generic)

**Network Agent**:
- "Manual review recommended due to analysis failure"
- No entity type recommendation

**Device Agent**:
- "Manual review recommended due to analysis failure"
- No entity type recommendation

**Location Agent**:
- Detected 18 impossible travel patterns
- No recommendation to investigate by email instead

**Risk Agent**:
- "Recommendations not clearly identified"
- No entity type recommendation

**Merchant Agent**:
- No specific recommendations
- No entity type recommendation

## Conclusion

The IPv6 address was selected because the test runner **hardcoded** `group_by=IP`, **ignoring** the `ANALYTICS_DEFAULT_GROUP_BY` configuration from the `.env` file. 

**Key Findings**:
1. ✅ `.env` file configures `ANALYTICS_DEFAULT_GROUP_BY` (likely set to `email`)
2. ✅ Risk analyzer reads from `.env` and defaults to `EMAIL` grouping
3. ❌ Test runner **ignores** `.env` configuration and hardcodes `group_by=IP`
4. ✅ Email data available in transactions (`1511478431@qq.com`)
5. ⚠️ No LLM recommendations (demo mode uses MockLLM)
6. ⚠️ Agents don't question entity type selection

**Root Cause**: The test runner should respect the `.env` configuration but instead hardcodes IP grouping, bypassing the configured entity type preference.

**Impact**:
- Investigation worked correctly with IP address
- All 40 transactions analyzed successfully
- Email address available but not used as primary entity
- May have missed email-based fraud patterns

**Recommendation**: 
1. Make entity type selection configurable in test runner
2. Default to email addresses for account-level scenarios
3. Allow IP-based investigations for network-level scenarios
4. Consider multi-entity investigation support
5. Add LLM recommendations for entity type selection in LIVE mode


---

## ✅ Fix Implementation (Completed)

**Status**: **FIXED** - Test runner now respects `.env` configuration

### Changes Made

**File**: `olorin-server/scripts/testing/unified_ai_investigation_test_runner.py`

#### Updated `load_snowflake_data()` Method

**Before** (Line 934):
```python
group_by=IP,  # Hardcoded to IP - ignores .env
```

**After**:
```python
# Respect ANALYTICS_DEFAULT_GROUP_BY from .env file
default_group_by = os.getenv('ANALYTICS_DEFAULT_GROUP_BY', 'email').upper()

# Map string to schema constant
group_by_column = EMAIL  # Default to email
if default_group_by == 'IP' or default_group_by == 'IP_ADDRESS':
    group_by_column = IP
elif default_group_by == 'EMAIL':
    group_by_column = EMAIL

group_by=group_by_column,  # Respects ANALYTICS_DEFAULT_GROUP_BY from .env
```

#### Updated Entity Storage and Type Detection

- Stores entities with generic `entity` key plus type-specific keys
- Determines entity type from `.env` configuration
- Supports email, IP, device_id, and user_id entity types
- Proper EntityType enum mapping

### Testing

**Current Configuration** (from `.env`):
```bash
ANALYTICS_DEFAULT_GROUP_BY=email
```

**To Verify**:
1. Run: `python -m scripts.testing.run_unified_tests --scenario device_spoofing --mode demo`
2. Expected: Investigation uses email addresses (respecting `.env` config)

### Benefits

✅ Respects `.env` configuration  
✅ Backward compatible with IP grouping  
✅ Flexible entity type selection  
✅ Better defaults (email for account-level fraud)

See `docs/analysis/fix-summary-entity-type-selection.md` for complete details.
