# Merchant Dimension Integration into Investigation Methodology

**Author**: AI Assistant  
**Date**: 2025-01-11  
**Status**: Proposal  
**Related**: Olorin Investigation System

## Executive Summary

Currently, the Olorin investigation system analyzes fraud through five domain agents (Network, Device, Location, Logs, Authentication) but does not systematically incorporate merchant-level analysis. Merchant data exists in Snowflake (`MERCHANT_NAME`, `MERCHANT_CATEGORY`, `MERCHANT_ID`, `MERCHANT_RISK_LEVEL`, etc.) but is not actively analyzed as a fraud signal dimension.

This proposal outlines how to incorporate merchant analysis into the investigation methodology to enhance fraud detection capabilities.

---

## Current State Analysis

### Available Merchant Data in Snowflake

The following merchant-related fields are available but underutilized:

**Core Merchant Fields:**
- `MERCHANT_NAME` - Merchant business name
- `MERCHANT_ID` - Unique merchant identifier  
- `MERCHANT_SEGMENT_ID` - Merchant segment classification
- `MERCHANT_CATEGORY` - Business category (from schema)
- `MERCHANT_RISK_LEVEL` - Pre-calculated risk level (from schema)
- `MERCHANT_COUNTRY` - Merchant location country
- `MERCHANT_CITY` - Merchant location city
- `MERCHANT_WEBSITE` - Merchant website URL

**Merchant Decision Fields:**
- `MERCHANT_DECISIONS` - Array of merchant decisions
- `MERCHANT_LAST_DECISION` - Last decision made by merchant
- `MERCHANT_LAST_DECISION_DATETIME` - Timestamp of last decision
- `COUNT_MERCHANT_DECISIONS` - Count of merchant decisions
- `DAYS_FROM_FIRST_MERCHANT_ACCEPTANCE_TO_TX` - Time since first acceptance

**Business Context:**
- `PARTNER_ID` - Partner identifier
- `PARTNER_NAME` - Partner name
- `PARTNER_INDUSTRY` - Partner industry

### Current Investigation Gaps

1. **No Merchant Agent**: No dedicated domain agent for merchant analysis
2. **Limited Merchant Context**: Merchant data is queried but not systematically analyzed
3. **Missing Merchant Patterns**: No detection of merchant-specific fraud patterns:
   - Merchant velocity (rapid transactions across merchants)
   - Merchant category clustering (suspicious category combinations)
   - Merchant risk correlation (high-risk merchant associations)
   - Merchant decision patterns (acceptance/rejection patterns)
4. **No Merchant Risk Scoring**: Merchant risk factors not incorporated into overall risk assessment

---

## Proposed Solution: Multi-Layered Merchant Integration

### Approach 1: Create Dedicated Merchant Agent (Recommended)

**Create a new Merchant Agent** following the same pattern as existing domain agents.

#### Merchant Agent Responsibilities

1. **Merchant Profile Analysis**
   - Analyze merchant risk level distribution
   - Identify high-risk merchant associations
   - Detect merchant category patterns
   - Assess merchant geographic distribution

2. **Merchant Velocity Analysis**
   - Detect rapid merchant switching (velocity bursts)
   - Identify first-time merchant usage patterns
   - Analyze merchant diversity vs. concentration

3. **Merchant Decision Pattern Analysis**
   - Analyze merchant acceptance/rejection patterns
   - Detect merchant decision anomalies
   - Correlate merchant decisions with fraud outcomes

4. **Merchant Risk Correlation**
   - Cross-reference merchant risk with transaction risk
   - Identify merchant-fraud correlation patterns
   - Detect merchant category fraud hotspots

5. **Merchant Network Analysis**
   - Identify merchant clusters (same partner/segment)
   - Detect merchant relationship patterns
   - Analyze merchant ecosystem connections

#### Implementation Structure

```python
# olorin-server/app/service/agent/orchestration/domain_agents/merchant_agent.py

async def merchant_agent_node(state: InvestigationState, config: Optional[Dict] = None) -> Dict[str, Any]:
    """
    Merchant domain analysis agent.
    Analyzes merchant patterns, risk levels, and merchant-related fraud indicators.
    """
    # Follow same pattern as device_agent.py, network_agent.py, etc.
    # Analyze:
    # - Merchant risk level distribution
    # - Merchant velocity patterns
    # - Merchant category clustering
    # - Merchant decision patterns
    # - Merchant-fraud correlations
```

#### Integration Points

1. **Add to Domain Agent Registry**
   - Update `domain_agents_clean.py` to include merchant agent
   - Add merchant agent to orchestration graph
   - Update step numbering (merchant becomes Step 5.2.7, Risk becomes 5.2.8)

2. **Update Base Agent Configuration**
   - Add merchant to `DomainAgentBase._get_domain_step()` mapping
   - Add merchant-specific tool categories in `unified_prompts.py`

3. **Update Risk Agent Synthesis**
   - Include merchant findings in risk synthesis
   - Weight merchant risk factors appropriately
   - Cross-reference merchant patterns with other domains

---

### Approach 2: Enhance Existing Agents with Merchant Context

**Incorporate merchant analysis into existing domain agents** without creating a separate agent.

#### Network Agent Enhancements
- **Merchant-IP Correlation**: Analyze IP addresses associated with high-risk merchants
- **Merchant Geographic Patterns**: Cross-reference merchant locations with IP geolocation
- **Merchant Network Clusters**: Identify IPs that connect to multiple merchants

#### Device Agent Enhancements
- **Merchant-Device Correlation**: Analyze device usage patterns across merchants
- **Merchant Device Diversity**: Detect devices used with multiple merchants
- **Merchant Category Device Patterns**: Identify device patterns by merchant category

#### Location Agent Enhancements
- **Merchant-Location Consistency**: Verify merchant location vs. transaction location
- **Merchant Geographic Clustering**: Detect geographic merchant patterns
- **Merchant Travel Patterns**: Analyze travel patterns relative to merchant locations

#### Logs Agent Enhancements
- **Merchant Activity Patterns**: Analyze activity logs by merchant
- **Merchant Session Patterns**: Detect session patterns across merchants
- **Merchant Behavioral Anomalies**: Identify behavioral anomalies specific to merchants

#### Risk Agent Enhancements
- **Merchant Risk Weighting**: Incorporate merchant risk levels into overall risk score
- **Merchant Pattern Synthesis**: Synthesize merchant patterns across all domains
- **Merchant-Fraud Correlation**: Weight merchant factors in final risk assessment

---

### Approach 3: Hybrid Approach (Recommended for Phased Implementation)

**Phase 1: Enhance Existing Agents** (Quick Win)
- Add merchant analysis functions to existing agents
- Incorporate merchant data into current analysis patterns
- Update risk agent to include merchant factors

**Phase 2: Create Merchant Agent** (Long-term)
- Create dedicated merchant agent after validating Phase 1
- Extract merchant-specific logic into dedicated agent
- Enhance merchant analysis capabilities

---

## Detailed Implementation Plan

### Phase 1: Merchant Data Analysis Functions

Create reusable merchant analysis functions that can be used by all agents:

```python
# olorin-server/app/service/agent/orchestration/merchant_analysis.py

def analyze_merchant_risk_distribution(results: List[Dict]) -> Dict[str, Any]:
    """Analyze distribution of merchant risk levels."""
    # Group transactions by MERCHANT_RISK_LEVEL
    # Calculate risk distribution statistics
    # Identify high-risk merchant associations

def analyze_merchant_velocity(results: List[Dict]) -> Dict[str, Any]:
    """Detect merchant velocity patterns."""
    # Identify rapid merchant switching
    # Calculate merchant diversity metrics
    # Detect first-time merchant usage

def analyze_merchant_category_patterns(results: List[Dict]) -> Dict[str, Any]:
    """Analyze merchant category clustering."""
    # Group by MERCHANT_CATEGORY
    # Identify suspicious category combinations
    # Detect category fraud hotspots

def analyze_merchant_decisions(results: List[Dict]) -> Dict[str, Any]:
    """Analyze merchant decision patterns."""
    # Analyze MERCHANT_DECISIONS array
    # Correlate decisions with fraud outcomes
    # Detect decision anomalies
```

### Phase 2: Merchant-Specific Snowflake Queries

Enhance Snowflake queries to include merchant-focused analysis:

```sql
-- Merchant risk distribution query
SELECT 
    MERCHANT_NAME,
    MERCHANT_RISK_LEVEL,
    COUNT(*) as tx_count,
    SUM(CASE WHEN IS_FRAUD_TX = 1 THEN 1 ELSE 0 END) as fraud_count,
    AVG(MODEL_SCORE) as avg_risk_score
FROM DBT.DBT_PROD.TXS
WHERE {entity_filter}
GROUP BY MERCHANT_NAME, MERCHANT_RISK_LEVEL
ORDER BY fraud_count DESC;

-- Merchant velocity query
SELECT 
    MERCHANT_NAME,
    COUNT(DISTINCT TX_DATETIME::DATE) as days_active,
    COUNT(*) as tx_count,
    MIN(TX_DATETIME) as first_tx,
    MAX(TX_DATETIME) as last_tx
FROM DBT.DBT_PROD.TXS
WHERE {entity_filter}
GROUP BY MERCHANT_NAME
ORDER BY tx_count DESC;

-- Merchant category analysis
SELECT 
    MERCHANT_CATEGORY,
    COUNT(DISTINCT MERCHANT_NAME) as unique_merchants,
    COUNT(*) as tx_count,
    AVG(MODEL_SCORE) as avg_risk_score,
    SUM(CASE WHEN IS_FRAUD_TX = 1 THEN 1 ELSE 0 END) as fraud_count
FROM DBT.DBT_PROD.TXS
WHERE {entity_filter}
GROUP BY MERCHANT_CATEGORY
ORDER BY fraud_count DESC;
```

### Phase 3: Merchant Risk Scoring

Create merchant-specific risk scoring functions:

```python
def compute_merchant_risk_score(
    merchant_risk_level: str,
    merchant_fraud_rate: float,
    merchant_velocity: int,
    merchant_category_risk: float,
    merchant_decision_anomalies: bool
) -> float:
    """
    Calculate merchant-specific risk score.
    
    Factors:
    - MERCHANT_RISK_LEVEL (high/medium/low)
    - Historical fraud rate for merchant
    - Merchant velocity (rapid switching = higher risk)
    - Merchant category risk (some categories higher risk)
    - Merchant decision anomalies (unusual patterns)
    """
    base_risk = {
        "high": 0.7,
        "medium": 0.4,
        "low": 0.2
    }.get(merchant_risk_level.lower(), 0.5)
    
    # Adjust based on fraud rate
    fraud_adjustment = min(0.3, merchant_fraud_rate)
    
    # Adjust based on velocity (rapid switching = risk)
    velocity_adjustment = min(0.2, merchant_velocity / 10.0)
    
    # Adjust based on category risk
    category_adjustment = merchant_category_risk * 0.2
    
    # Adjust based on decision anomalies
    anomaly_adjustment = 0.15 if merchant_decision_anomalies else 0.0
    
    final_score = min(1.0, base_risk + fraud_adjustment + velocity_adjustment + 
                     category_adjustment + anomaly_adjustment)
    
    return round(final_score, 3)
```

### Phase 4: Integration with Investigation Flow

#### Update Investigation Executor

```python
# olorin-server/app/router/controllers/investigation_executor.py

# Add merchant analysis to investigation phases:
# - Phase 3: Context Preparation - Include merchant queries
# - Phase 4: Agent Investigation - Execute merchant agent (if created)
# - Phase 5: Results Processing - Include merchant findings in aggregation
```

#### Update Risk Agent Synthesis

```python
# olorin-server/app/service/agent/orchestration/domain_agents/risk_agent.py

def _calculate_real_risk_score(domain_findings: Dict[str, Any], facts: Dict[str, Any]) -> float:
    # ... existing code ...
    
    # Add merchant risk factor
    merchant_findings = domain_findings.get("merchant", {})
    if merchant_findings and merchant_findings.get("risk_score"):
        merchant_risk = merchant_findings["risk_score"]
        # Weight merchant risk appropriately (e.g., 15% of total)
        weighted_scores.append((merchant_risk, 0.15))
    
    # ... rest of calculation ...
```

---

## Merchant Analysis Use Cases

### Use Case 1: Merchant Velocity Fraud Detection

**Scenario**: User makes rapid transactions across multiple merchants in short time period.

**Analysis**:
- Detect merchant switching velocity
- Identify first-time merchant usage patterns
- Correlate with device/IP changes
- Flag as potential card testing or account takeover

**Risk Indicators**:
- 5+ merchants in < 1 hour
- First-time merchant usage rate > 50%
- Merchant diversity spike vs. baseline

### Use Case 2: High-Risk Merchant Association

**Scenario**: User transacts primarily with high-risk merchants.

**Analysis**:
- Analyze merchant risk level distribution
- Identify concentration in high-risk merchants
- Correlate with transaction risk scores
- Flag as potential fraud pattern

**Risk Indicators**:
- > 70% transactions with high-risk merchants
- Merchant risk level mismatch with user profile
- High-risk merchant + high transaction amount

### Use Case 3: Merchant Category Clustering

**Scenario**: User transacts with merchants in suspicious category combinations.

**Analysis**:
- Analyze merchant category patterns
- Identify unusual category combinations
- Detect category fraud hotspots
- Correlate with known fraud patterns

**Risk Indicators**:
- Rapid switching between unrelated categories
- Categories with known fraud patterns
- Category mismatch with user profile

### Use Case 4: Merchant Decision Anomalies

**Scenario**: Merchant decisions show unusual patterns.

**Analysis**:
- Analyze merchant decision history
- Detect decision anomalies
- Correlate decisions with fraud outcomes
- Identify merchant decision manipulation

**Risk Indicators**:
- Unusual merchant decision patterns
- Merchant decisions inconsistent with risk scores
- Merchant decision changes correlate with fraud

---

## Merchant Dimension Integration Checklist

### Immediate Actions (Phase 1)

- [ ] **Create merchant analysis utility functions**
  - [ ] `analyze_merchant_risk_distribution()`
  - [ ] `analyze_merchant_velocity()`
  - [ ] `analyze_merchant_category_patterns()`
  - [ ] `analyze_merchant_decisions()`

- [ ] **Enhance existing domain agents**
  - [ ] Add merchant analysis to Network Agent
  - [ ] Add merchant analysis to Device Agent
  - [ ] Add merchant analysis to Location Agent
  - [ ] Add merchant analysis to Logs Agent

- [ ] **Update Risk Agent**
  - [ ] Include merchant risk factors in risk calculation
  - [ ] Add merchant patterns to synthesis narrative
  - [ ] Weight merchant factors appropriately

- [ ] **Enhance Snowflake queries**
  - [ ] Add merchant-focused queries to Snowflake tool
  - [ ] Include merchant aggregations in base queries
  - [ ] Add merchant filters to entity queries

### Medium-Term Actions (Phase 2)

- [ ] **Create Merchant Agent**
  - [ ] Create `merchant_agent.py` following domain agent pattern
  - [ ] Implement merchant-specific analysis functions
  - [ ] Add merchant agent to orchestration graph
  - [ ] Update step numbering and documentation

- [ ] **Merchant Risk Scoring**
  - [ ] Implement `compute_merchant_risk_score()`
  - [ ] Create merchant risk assessment logic
  - [ ] Integrate merchant scores into overall risk

- [ ] **Merchant Pattern Detection**
  - [ ] Implement merchant velocity detection
  - [ ] Implement merchant category clustering
  - [ ] Implement merchant decision anomaly detection

### Long-Term Enhancements (Phase 3)

- [ ] **Merchant Network Analysis**
  - [ ] Analyze merchant-partner relationships
  - [ ] Detect merchant ecosystem patterns
  - [ ] Identify merchant clusters

- [ ] **Merchant Intelligence Integration**
  - [ ] Integrate external merchant reputation data
  - [ ] Add merchant blacklist/whitelist support
  - [ ] Implement merchant risk intelligence feeds

- [ ] **Merchant Reporting**
  - [ ] Add merchant analysis to investigation reports
  - [ ] Create merchant-specific visualizations
  - [ ] Generate merchant risk dashboards

---

## Expected Benefits

### Fraud Detection Improvements

1. **Enhanced Pattern Detection**: Identify fraud patterns specific to merchant relationships
2. **Better Risk Scoring**: Incorporate merchant risk factors into overall assessment
3. **Velocity Detection**: Detect rapid merchant switching indicative of fraud
4. **Category Analysis**: Identify suspicious merchant category patterns

### Investigation Quality

1. **More Complete Context**: Merchant dimension provides additional fraud signals
2. **Cross-Domain Correlation**: Merchant patterns correlate with other domain findings
3. **Better Risk Assessment**: More accurate risk scores with merchant factors
4. **Actionable Insights**: Merchant-specific recommendations for investigation

### Operational Benefits

1. **Merchant Intelligence**: Build merchant risk intelligence over time
2. **Merchant Monitoring**: Identify high-risk merchants for monitoring
3. **Pattern Recognition**: Recognize merchant-related fraud patterns
4. **Investigation Efficiency**: Faster investigations with merchant context

---

## Risk Considerations

### Data Quality
- **Merchant Data Completeness**: Ensure merchant fields are populated
- **Merchant ID Consistency**: Handle merchant ID variations/normalization
- **Merchant Risk Level Accuracy**: Validate merchant risk level assignments

### Performance
- **Query Performance**: Merchant aggregations may impact query performance
- **Agent Execution Time**: Additional merchant analysis may increase investigation time
- **Storage**: Merchant analysis results may increase storage requirements

### Implementation Complexity
- **Agent Integration**: Adding merchant agent requires orchestration updates
- **Risk Score Weighting**: Determining appropriate merchant risk weights
- **Pattern Detection**: Implementing merchant pattern detection algorithms

---

## Success Metrics

### Detection Metrics
- **Merchant Pattern Detection Rate**: % of investigations where merchant patterns identified
- **Merchant Risk Correlation**: Correlation between merchant risk and fraud outcomes
- **Velocity Detection Accuracy**: Accuracy of merchant velocity fraud detection

### Investigation Metrics
- **Investigation Completeness**: % of investigations including merchant analysis
- **Risk Score Accuracy**: Improvement in risk score accuracy with merchant factors
- **Investigation Time**: Impact on investigation execution time

### Business Metrics
- **Fraud Detection Rate**: Improvement in overall fraud detection rate
- **False Positive Rate**: Impact on false positive rate
- **Investigation Quality**: Improvement in investigation quality scores

---

## Next Steps

1. **Review and Approve**: Review this proposal with stakeholders
2. **Prioritize Approach**: Decide on Approach 1, 2, or 3 (Hybrid recommended)
3. **Create Implementation Plan**: Detailed implementation plan for selected approach
4. **Phase 1 Implementation**: Start with quick wins (enhance existing agents)
5. **Validate and Iterate**: Validate Phase 1 results before proceeding to Phase 2

---

## References

- Current Investigation System: `docs/OLORIN_INVESTIGATION_SYSTEM.md`
- Domain Agents: `olorin-server/app/service/agent/orchestration/domain_agents/`
- Snowflake Schema: `olorin-server/app/service/agent/tools/snowflake_tool/schema_constants.py`
- Risk Agent: `olorin-server/app/service/agent/orchestration/domain_agents/risk_agent.py`

