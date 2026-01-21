# Monthly Analysis Selector Gap Analysis

## ❌ Current State: Score-Based Filtering NOT Applied to Monthly Analysis

### Findings

After analyzing the codebase, **the score-based filtering refinements are NOT currently effective for the monthly analysis flow**.

Here's why:

### Two Different Selection Paths

#### 1. **RiskAnalyzer** (✅ HAS score-based filtering)
**Used by**:
- API endpoints (`/api/analytics/top-risk-entities`)
- Auto-select entity helper
- Manual ad-hoc queries

**Selection Logic**:
```python
# app/service/analytics/risk_analyzer.py
WHERE avg_risk_score >= 0.15  # ✅ Min threshold filtering
ORDER BY CASE
    WHEN avg_risk_score >= 0.70 THEN risk_weighted_value * 2.0  # ✅ High-score weighting
    ELSE risk_weighted_value
END DESC
```

#### 2. **ComparisonDataLoader** (❌ NO score-based filtering)
**Used by**:
- Monthly analysis orchestrator
- Auto-comparison workflow
- Systematic testing scripts

**Selection Logic**:
```python
# app/service/investigation/comparison_modules/comparison_data_loader.py
# Compound mode: Uses combined_risk_score = MAX(MaxMind) × MAX(Model) × Velocity
# Single mode: Selects by confirmed fraud (IS_FRAUD_TX = 1)

# NO minimum score threshold
# NO high-score weighting multiplier
# Different formula entirely
```

### Code Flow Analysis

```
Monthly Analysis Flow:
┌─────────────────────────────────────────────────┐
│ monthly_analysis_orchestrator.py                │
│                                                 │
│ run_auto_comparisons_for_top_entities()        │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│ auto_comparison.py                              │
│                                                 │
│ if compound_entity_enabled:                     │
│     loader.get_high_risk_compound_entities()    │ ❌ Uses own query
│ else:                                           │
│     loader.get_fraudulent_emails_grouped_...()  │ ❌ Uses own query
└─────────────────────────────────────────────────┘

RiskAnalyzer Flow (separate):
┌─────────────────────────────────────────────────┐
│ risk_analyzer.py                                │
│                                                 │
│ get_top_risk_entities()                         │ ✅ Uses score filtering
└─────────────────────────────────────────────────┘
```

### Key Differences

| Feature | RiskAnalyzer | ComparisonDataLoader |
|---------|-------------|---------------------|
| **Min Score Threshold** | ✅ 0.15 (configurable) | ❌ None |
| **High Score Weighting** | ✅ 2.0x at 0.70+ | ❌ None |
| **Formula** | `SUM(MODEL_SCORE * GMV) * COUNT(*)` | `MAX(Maxmind) × MAX(Model) × Velocity` |
| **Top %** | ✅ Configurable | ✅ Configurable (same var) |
| **Score Filtering** | ✅ Data-driven | ❌ Hardcoded |

### Configuration Variables

Both paths share:
```bash
ANALYTICS_DEFAULT_TOP_PERCENTAGE=30  # ✅ Used by both
```

Only RiskAnalyzer uses:
```bash
SELECTOR_ENABLE_SCORE_FILTERING=true      # ❌ Not used by ComparisonDataLoader
SELECTOR_MIN_SCORE_THRESHOLD=0.15         # ❌ Not used by ComparisonDataLoader
SELECTOR_HIGH_SCORE_THRESHOLD=0.70        # ❌ Not used by ComparisonDataLoader
SELECTOR_HIGH_SCORE_WEIGHT_MULTIPLIER=2.0 # ❌ Not used by ComparisonDataLoader
```

## ⚠️ Impact

### What IS Affected ✅
- API calls to `/api/analytics/top-risk-entities`
- Auto-select entity population
- Ad-hoc risk analysis queries
- Validation scripts that directly call `RiskAnalyzer`

### What IS NOT Affected ❌
- Monthly analysis workflow (`run_monthly_analysis.py`)
- Auto-comparison investigations
- Compound entity selection
- All systematic testing scripts

## 🔧 Recommended Solution

### Option 1: Unify Selection Logic (Recommended)

**Modify `ComparisonDataLoader` to use `RiskAnalyzer`**:

```python
# In comparison_data_loader.py
async def get_high_risk_compound_entities(...):
    # Instead of custom query, use RiskAnalyzer
    from app.service.analytics.risk_analyzer import get_risk_analyzer

    analyzer = get_risk_analyzer()
    results = await analyzer.get_top_risk_entities(
        time_window=f"{lookback_hours}h",
        group_by="email",  # or compound key
        top_percentage=top_percentage,
        reference_date=reference_time
    )

    # Then enhance with compound entity logic if needed
```

**Pros**:
- Single source of truth for selection logic
- Score-based filtering automatically applies
- Easier to maintain and validate
- Configuration changes apply universally

**Cons**:
- Requires refactoring ComparisonDataLoader
- May need to preserve compound entity scoring formula
- Testing required for backward compatibility

### Option 2: Duplicate Score Filtering (Quick Fix)

**Add score filtering directly to ComparisonDataLoader**:

```python
# In comparison_data_loader.py query
HAVING COUNT(*) >= 3
  AND avg_model_score >= {min_score_threshold}  # ✅ Add min threshold

# In score calculation
CASE
    WHEN avg_model_score >= {high_score_threshold}
    THEN combined_risk_score * {multiplier}
    ELSE combined_risk_score
END as weighted_risk_score  # ✅ Add score weighting
```

**Pros**:
- Quick to implement
- Minimal risk to existing logic
- Preserves compound entity formula

**Cons**:
- Code duplication
- Two places to update for threshold changes
- Risk of drift between implementations

### Option 3: Hybrid Approach (Best of Both)

**Create shared score filtering module**:

```python
# app/service/analytics/score_filtering.py
class ScoreFilter:
    @staticmethod
    def apply_score_filter(query_builder, enable=True):
        if not enable:
            return query_builder

        min_threshold = float(os.getenv("SELECTOR_MIN_SCORE_THRESHOLD", "0.15"))
        high_threshold = float(os.getenv("SELECTOR_HIGH_SCORE_THRESHOLD", "0.70"))
        multiplier = float(os.getenv("SELECTOR_HIGH_SCORE_WEIGHT_MULTIPLIER", "2.0"))

        return query_builder.filter_min_score(min_threshold).weight_high_scores(high_threshold, multiplier)
```

Then use in both RiskAnalyzer and ComparisonDataLoader.

**Pros**:
- DRY principle (Don't Repeat Yourself)
- Consistent behavior across flows
- Single configuration source
- Testable in isolation

**Cons**:
- Requires abstraction layer
- More upfront design work

## 📊 Immediate Action Items

### 1. Document the Gap ✅
- This file documents the current state

### 2. Decide on Approach
- Discuss with team which option to pursue
- Consider timeline and testing requirements

### 3. Implement for Monthly Analysis
- Apply chosen solution to ComparisonDataLoader
- Test with historical data
- Validate against baseline

### 4. Update Configuration Docs
- Clarify which flows use which variables
- Document any monthly-analysis-specific config

## 🧪 Testing Requirements

Once monthly analysis has score filtering:

1. **Validation**: Run `validate_selector_refinements.py` on monthly analysis flow
2. **Comparison**: Compare entity selection before/after
3. **Precision**: Measure fraud rate improvement
4. **Coverage**: Ensure no fraud loss

## 📝 Interim Workaround

Until monthly analysis has score filtering, you can:

1. **Manually apply thresholds** in post-processing:
   ```python
   # After loader.get_high_risk_compound_entities()
   filtered = [e for e in entities if e['avg_model_score'] >= 0.15]
   ```

2. **Adjust top_percentage** to compensate:
   ```bash
   # Since no score filtering, use tighter top %
   ANALYTICS_DEFAULT_TOP_PERCENTAGE=10  # Instead of 30
   ```

3. **Use compound mode** (already has better precision):
   ```bash
   COMPOUND_ENTITY_ENABLED=true  # Uses MaxMind × Model × Velocity
   ```

## 🎯 Next Steps

**Immediate** (Day 1):
- [ ] Review this gap analysis with team
- [ ] Decide on implementation approach
- [ ] Create ticket for monthly analysis enhancement

**Short Term** (Week 1):
- [ ] Implement score filtering for monthly analysis
- [ ] Test on historical data
- [ ] Validate precision improvements

**Medium Term** (Month 1):
- [ ] Unify selection logic across all flows
- [ ] Create shared score filtering module
- [ ] Update all documentation

## 📚 References

- **RiskAnalyzer**: `app/service/analytics/risk_analyzer.py:958-1015`
- **ComparisonDataLoader**: `app/service/investigation/comparison_modules/comparison_data_loader.py:275-420`
- **Monthly Orchestrator**: `app/service/investigation/monthly_analysis_orchestrator.py:196`
- **Auto Comparison**: `app/service/investigation/auto_comparison.py:124-142`
- **Configuration**: `.env:760-764`

---

**Status**: Gap identified, solution options documented, ready for implementation decision.
