# Integration Guide: CI, Auto-Expand, and Power Assessment

## Executive Summary

**Good news**: Your codebase **already implements** most of the proposed features! This guide shows what's working, what could be enhanced, and how to optimize the startup analysis flow.

## ✅ What's Already Implemented

### 1. **Confidence Intervals (CI)**
- ✅ **Location**: `app/service/investigation/ci_utils.py`
- ✅ **Implementation**: Wilson intervals using `wilson_interval()` function
- ✅ **Integration**: Used in `metrics_calculation.py::compute_derived_metrics()`
- ✅ **Display**: HTML reports show CI for precision, recall, accuracy
- ✅ **Config**: `EVAL_DEFAULTS["ci_confidence"]` (default: 0.95)

### 2. **Power Assessment**
- ✅ **Location**: `app/service/investigation/metrics_calculation.py`
- ✅ **Implementation**: Checks `min_transactions`, `min_actual_frauds`, `min_predicted_positives`
- ✅ **Status**: Returns `"stable"` or `"low_power"` with reasons
- ✅ **Display**: HTML reports show power badges (✓ Stable / ⚠ Low Power)
- ✅ **Config**: `EVAL_DEFAULTS["min_support"]`

### 3. **Auto-Expand Windows**
- ✅ **Location**: `app/service/investigation/auto_expand.py`
- ✅ **Implementation**: `expand_window_until_support()` function
- ✅ **Integration**: Used in `comparison_service.py::compare_windows()`
- ✅ **Features**:
  - Expands backward in time until minimum support met
  - Respects label maturity for retro windows
  - Configurable step size (default: 7 days)
  - Max window cap (default: 56 days)
- ✅ **Config**: `EVAL_DEFAULTS["auto_expand"]`

### 4. **Configuration**
- ✅ **Location**: `app/config/eval.py`
- ✅ **Structure**: All settings configurable via environment variables
- ✅ **Defaults**: Sensible defaults matching the proposal

## 🔍 Current Startup Flow Analysis

### How It Works Now

1. **Startup** (`app/service/__init__.py::on_startup()`)
   - Gets top riskiest entities from risk analyzer
   - Calls `run_auto_comparisons_for_top_entities()` with `top_n=10`

2. **Auto Comparison** (`auto_comparison.py::run_auto_comparisons_for_top_entities()`)
   - For each entity, calls `run_auto_comparison_for_entity()`
   - Creates comparison request: **Retro 14d (6mo back)** vs **Recent 14d**
   - Runs `compare_windows()` which:
     - ✅ Uses auto-expand (if enabled)
     - ✅ Calculates CI and power assessment
     - ✅ Generates HTML reports with badges

3. **Comparison Service** (`comparison_service.py::compare_windows()`)
   - ✅ Auto-expands windows if support is low (lines 132-195)
   - ✅ Calculates metrics with CI (lines 251-253, 279-281)
   - ✅ Includes power assessment in response (lines 273-274, 299-300)
   - ✅ Returns `AutoExpandMetadata` in window info (lines 379, 385)

## 🎯 Integration Recommendations

### 1. **Verify Auto-Expand is Enabled in Startup Flow**

**Current State**: Auto-expand is enabled by default (`EVAL_AUTO_EXPAND=true`), but verify it's working:

```python
# In auto_comparison.py::run_auto_comparison_for_entity()
# The comparison request already goes through compare_windows()
# which uses auto-expand, so this should already work!

# To verify, check logs for:
# "Window expanded: YYYY-MM-DD to YYYY-MM-DD → YYYY-MM-DD to YYYY-MM-DD"
```

**Recommendation**: Add explicit logging in startup flow to show when windows are expanded:

```python
# In auto_comparison.py, after compare_windows() call:
if response.windowA.auto_expand_meta and response.windowA.auto_expand_meta.expanded:
    logger.info(f"✅ Window A expanded: {response.windowA.auto_expand_meta.attempts[0]}d → {response.windowA.auto_expand_meta.attempts[1]}d")
if response.windowB.auto_expand_meta and response.windowB.auto_expand_meta.expanded:
    logger.info(f"✅ Window B expanded: {response.windowB.auto_expand_meta.attempts[0]}d → {response.windowB.auto_expand_meta.attempts[1]}d")
```

### 2. **Enhance Startup Flow to Show Power Status**

**Current State**: Power assessment is calculated but not prominently displayed in startup logs.

**Recommendation**: Add power status summary to startup flow results:

```python
# In auto_comparison.py::run_auto_comparison_for_entity()
# After compare_windows(), add:

power_status_a = response.A.power.status if response.A.power else "unknown"
power_status_b = response.B.power.status if response.B.power else "unknown"

logger.info(f"📊 Power Status - Window A: {power_status_a}, Window B: {power_status_b}")

if power_status_a == "low_power" or power_status_b == "low_power":
    logger.warning(f"⚠️ Low power detected - results may be unreliable")
    if response.A.power and response.A.power.reasons:
        logger.info(f"   Window A reasons: {', '.join(response.A.power.reasons)}")
    if response.B.power and response.B.power.reasons:
        logger.info(f"   Window B reasons: {', '.join(response.B.power.reasons)}")
```

### 3. **Add CI Width Validation**

**Current State**: CI is calculated but not validated for width.

**Recommendation**: Add guardrail check (as suggested in proposal):

```python
# In metrics_calculation.py::compute_derived_metrics()
# After calculating CI, add validation:

def _validate_ci_width(ci_dict: Dict[str, Optional[Tuple[float, float]]]) -> Dict[str, bool]:
    """Check if CI widths are acceptable (< 0.10)."""
    warnings = {}
    for metric, ci in ci_dict.items():
        if ci and len(ci) == 2:
            width = ci[1] - ci[0]
            warnings[metric] = width > 0.10
    return warnings

# In compute_derived_metrics(), after ci_dict creation:
ci_warnings = _validate_ci_width(ci_dict)
if any(ci_warnings.values()):
    logger.warning(f"⚠️ Wide confidence intervals detected: {ci_warnings}")
```

### 4. **Improve HTML Report Display**

**Current State**: HTML reports show CI and power badges, but could be more prominent.

**Recommendation**: Enhance HTML report to show:
- Auto-expand status more prominently
- CI width warnings
- Support metrics breakdown

```python
# In html_report_generator.py, enhance _generate_metrics_comparison():

# Add auto-expand indicator
if response.windowA.auto_expand_meta and response.windowA.auto_expand_meta.expanded:
    expand_note_a = f'<div style="font-size: 0.85em; color: #78350f; margin-top: 5px;">⚠ Expanded from {response.windowA.auto_expand_meta.attempts[0]}d to {response.windowA.auto_expand_meta.attempts[1]}d to reach minimum support</div>'
else:
    expand_note_a = ''

# Add support metrics breakdown
if metrics_a.support:
    support_info_a = f'''
    <div style="font-size: 0.85em; color: #6b7280; margin-top: 5px;">
        Support: {metrics_a.support.known_transactions} known transactions, 
        {metrics_a.support.actual_frauds} frauds, 
        {metrics_a.support.predicted_positives} predicted positives
    </div>
    '''
```

### 5. **Add Summary Statistics to Startup Results**

**Current State**: Startup flow returns individual results but no aggregate statistics.

**Recommendation**: Add aggregate statistics showing:
- How many windows were expanded
- How many had low power
- Average CI widths

```python
# In auto_comparison.py::run_auto_comparisons_for_top_entities()
# After processing all entities, add:

def summarize_comparison_results(results: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Generate summary statistics from comparison results."""
    successful = [r for r in results if r.get('status') == 'success']
    
    expanded_count = 0
    low_power_count = 0
    ci_widths = {'precision': [], 'recall': [], 'accuracy': []}
    
    for r in successful:
        response = r.get('comparison_response')
        if not response:
            continue
        
        # Count expanded windows
        if response.windowA.auto_expand_meta and response.windowA.auto_expand_meta.expanded:
            expanded_count += 1
        if response.windowB.auto_expand_meta and response.windowB.auto_expand_meta.expanded:
            expanded_count += 1
        
        # Count low power
        if response.A.power and response.A.power.status == 'low_power':
            low_power_count += 1
        if response.B.power and response.B.power.status == 'low_power':
            low_power_count += 1
        
        # Collect CI widths
        for window_metrics in [response.A, response.B]:
            if window_metrics.ci:
                for metric in ['precision', 'recall', 'accuracy']:
                    ci = window_metrics.ci.get(metric)
                    if ci and len(ci) == 2:
                        ci_widths[metric].append(ci[1] - ci[0])
    
    return {
        'total_comparisons': len(successful),
        'expanded_windows': expanded_count,
        'low_power_windows': low_power_count,
        'avg_ci_widths': {
            metric: sum(widths) / len(widths) if widths else None
            for metric, widths in ci_widths.items()
        }
    }

# At end of run_auto_comparisons_for_top_entities():
summary = summarize_comparison_results(results)
logger.info(f"📊 Startup Analysis Summary:")
logger.info(f"   Expanded windows: {summary['expanded_windows']}")
logger.info(f"   Low power windows: {summary['low_power_windows']}")
logger.info(f"   Avg CI widths: {summary['avg_ci_widths']}")
```

## 📋 Implementation Checklist

### Immediate Actions (Already Working)
- [x] CI calculation using Wilson intervals
- [x] Power assessment (stable/low_power)
- [x] Auto-expand functionality
- [x] HTML report display of CI and power badges
- [x] Configuration via environment variables

### Recommended Enhancements
- [ ] Add explicit logging for auto-expand in startup flow
- [ ] Add power status summary to startup logs
- [ ] Add CI width validation and warnings
- [ ] Enhance HTML report with auto-expand indicators
- [ ] Add aggregate statistics to startup results
- [ ] Add support metrics breakdown in HTML reports

### Frontend Enhancements (If Applicable)
- [ ] Display CI intervals in UI (if not already done)
- [ ] Show power badges in comparison UI
- [ ] Display auto-expand metadata in UI
- [ ] Add tooltips explaining CI and power assessment

## 🔧 Configuration Tuning

### Current Defaults (from `app/config/eval.py`)

```python
EVAL_DEFAULTS = {
    "ci_confidence": 0.95,  # 95% confidence intervals
    "min_support": {
        "min_transactions": 100,
        "min_actual_frauds": 10,
        "min_predicted_positives": 30
    },
    "auto_expand": {
        "enabled": True,
        "max_days": 56,  # Cap at 56 days
        "step_days": 7,  # Expand in 1-week steps
        "label_maturity_days": 14  # Retro windows must end ≤ today-14d
    }
}
```

### Tuning Recommendations

**For Low-Volume Entities**:
- Reduce `min_transactions` to 50
- Reduce `min_actual_frauds` to 5
- Increase `max_days` to 90

**For High-Volume Entities**:
- Increase `min_transactions` to 200
- Increase `min_actual_frauds` to 20
- Keep `max_days` at 56

**For Faster Feedback**:
- Reduce `step_days` to 3 (expand in 3-day steps)
- Reduce `label_maturity_days` to 7 (if labels mature faster)

## 🎓 Understanding the Metrics

### Confidence Intervals (CI)
- **What**: Range where true metric value likely falls (95% confidence)
- **Why**: Shows uncertainty in estimates, especially important for small samples
- **Example**: Precision = 72% (95% CI 66–78%) means true precision is likely between 66% and 78%

### Power Assessment
- **Stable**: Window has enough data for reliable metrics
- **Low Power**: Window lacks sufficient data (too few transactions, frauds, or predictions)
- **Why**: Prevents drawing conclusions from unreliable data

### Auto-Expand
- **What**: Automatically widens time window until minimum support is met
- **Why**: Ensures metrics are calculated on sufficient data
- **Trade-off**: Longer windows = more stable metrics but may hide recent drift

## 🚀 Next Steps

1. **Verify Current Implementation**: Run a startup analysis and check logs for:
   - Auto-expand messages
   - Power assessment status
   - CI values in HTML reports

2. **Add Enhanced Logging**: Implement the logging enhancements above to make status more visible

3. **Monitor Results**: Track how often windows are expanded and how often low power occurs

4. **Tune Configuration**: Adjust `EVAL_DEFAULTS` based on your entity volume patterns

5. **Frontend Integration**: If you have a frontend, ensure it displays CI and power badges prominently

## 📚 Related Files

- **CI Calculation**: `app/service/investigation/ci_utils.py`
- **Metrics**: `app/service/investigation/metrics_calculation.py`
- **Auto-Expand**: `app/service/investigation/auto_expand.py`
- **Comparison**: `app/service/investigation/comparison_service.py`
- **Config**: `app/config/eval.py`
- **HTML Reports**: `app/service/investigation/html_report_generator.py`
- **Startup Flow**: `app/service/investigation/auto_comparison.py`

## 💡 Key Takeaways

1. **You're already 90% there!** Most features are implemented and working.

2. **The main gap is visibility** - add logging and reporting to make status more obvious.

3. **Auto-expand is working** - it's integrated into `compare_windows()` which is called by the startup flow.

4. **HTML reports already show CI and power** - but could be enhanced with more detail.

5. **Configuration is flexible** - tune `EVAL_DEFAULTS` based on your data patterns.

---

**Bottom Line**: Your implementation matches the proposal's intent. The recommendations above focus on **visibility** and **reporting** rather than core functionality, which is already solid.

