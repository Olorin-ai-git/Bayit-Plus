# Week 11 Environment Variables - Required Configuration

This document lists ALL required environment variables for Week 11 (Feedback Loop & Continuous Learning) modules.

## ⚠️ CRITICAL: No Default Values

Per SYSTEM MANDATE compliance, **ALL** environment variables listed below are **REQUIRED** with **NO** fallback defaults. The system will raise `RuntimeError` if any required variable is missing.

---

## Week 11: Feedback Loop & Continuous Learning

### Feedback Collector Configuration

**FEEDBACK_WINDOW_SIZE**
- **Type**: integer (positive)
- **Required**: Yes
- **Example**: `FEEDBACK_WINDOW_SIZE=5000`
- **Description**: Maximum number of feedback items to retain in rolling window

**FEEDBACK_MIN_FOR_RETRAIN**
- **Type**: integer (positive)
- **Required**: Yes
- **Example**: `FEEDBACK_MIN_FOR_RETRAIN=100`
- **Description**: Minimum feedback samples required before triggering retraining

**FEEDBACK_FP_THRESHOLD**
- **Type**: float (0.0 to 1.0)
- **Required**: Yes
- **Example**: `FEEDBACK_FP_THRESHOLD=0.10`
- **Description**: False positive rate threshold for triggering retraining (10% = 0.10)

**FEEDBACK_FN_THRESHOLD**
- **Type**: float (0.0 to 1.0)
- **Required**: Yes
- **Example**: `FEEDBACK_FN_THRESHOLD=0.05`
- **Description**: False negative rate threshold for triggering retraining (5% = 0.05)

### Performance Tracker Configuration

**PERFORMANCE_WINDOW_SIZE**
- **Type**: integer (positive)
- **Required**: Yes
- **Example**: `PERFORMANCE_WINDOW_SIZE=1000`
- **Description**: Maximum number of performance snapshots to retain

**PERFORMANCE_DEGRADATION_THRESHOLD**
- **Type**: float (0.0 to 1.0)
- **Required**: Yes
- **Example**: `PERFORMANCE_DEGRADATION_THRESHOLD=0.05`
- **Description**: Performance degradation threshold (5% drop = 0.05)

**PERFORMANCE_LOOKBACK_HOURS**
- **Type**: integer (positive)
- **Required**: Yes
- **Example**: `PERFORMANCE_LOOKBACK_HOURS=24`
- **Description**: Number of hours to look back when calculating current performance

**PERFORMANCE_MIN_SAMPLES**
- **Type**: integer (positive)
- **Required**: Yes
- **Example**: `PERFORMANCE_MIN_SAMPLES=50`
- **Description**: Minimum snapshots required for performance evaluation

### Retraining Pipeline Configuration

**RETRAIN_INTERVAL_HOURS**
- **Type**: integer (positive)
- **Required**: Yes
- **Example**: `RETRAIN_INTERVAL_HOURS=168`
- **Description**: Scheduled retraining interval in hours (168 = weekly)

**RETRAIN_MIN_TRAINING_SAMPLES**
- **Type**: integer (positive)
- **Required**: Yes
- **Example**: `RETRAIN_MIN_TRAINING_SAMPLES=1000`
- **Description**: Minimum training samples required for retraining

**RETRAIN_VALIDATION_SPLIT**
- **Type**: float (0.0 to 1.0)
- **Required**: Yes
- **Example**: `RETRAIN_VALIDATION_SPLIT=0.2`
- **Description**: Fraction of data reserved for validation (20% = 0.2)

**RETRAIN_MIN_VALIDATION_F1**
- **Type**: float (0.0 to 1.0)
- **Required**: Yes
- **Example**: `RETRAIN_MIN_VALIDATION_F1=0.85`
- **Description**: Minimum F1 score on validation set required to accept retrained model

### Champion/Challenger Framework Configuration

**CHAMPION_MIN_CHALLENGER_SAMPLES**
- **Type**: integer (positive)
- **Required**: Yes
- **Example**: `CHAMPION_MIN_CHALLENGER_SAMPLES=500`
- **Description**: Minimum predictions required from challenger before promotion evaluation

**CHAMPION_PROMOTION_THRESHOLD**
- **Type**: float (0.0 to 1.0)
- **Required**: Yes
- **Example**: `CHAMPION_PROMOTION_THRESHOLD=0.02`
- **Description**: Minimum improvement required to promote challenger (2% = 0.02)

**CHAMPION_TRAFFIC_SPLIT**
- **Type**: float (0.0 to 1.0)
- **Required**: Yes
- **Example**: `CHAMPION_TRAFFIC_SPLIT=0.1`
- **Description**: Fraction of traffic routed to challenger (10% = 0.1)

**CHAMPION_EVALUATION_METRIC**
- **Type**: string
- **Required**: Yes
- **Valid Values**: "precision", "recall", "accuracy", "f1_score"
- **Example**: `CHAMPION_EVALUATION_METRIC=f1_score`
- **Description**: Metric used to evaluate champion vs challenger

---

## Example .env Configuration

```bash
# Week 11: Feedback Loop & Continuous Learning

# Feedback Collector
FEEDBACK_WINDOW_SIZE=5000
FEEDBACK_MIN_FOR_RETRAIN=100
FEEDBACK_FP_THRESHOLD=0.10
FEEDBACK_FN_THRESHOLD=0.05

# Performance Tracker
PERFORMANCE_WINDOW_SIZE=1000
PERFORMANCE_DEGRADATION_THRESHOLD=0.05
PERFORMANCE_LOOKBACK_HOURS=24
PERFORMANCE_MIN_SAMPLES=50

# Retraining Pipeline
RETRAIN_INTERVAL_HOURS=168
RETRAIN_MIN_TRAINING_SAMPLES=1000
RETRAIN_VALIDATION_SPLIT=0.2
RETRAIN_MIN_VALIDATION_F1=0.85

# Champion/Challenger Framework
CHAMPION_MIN_CHALLENGER_SAMPLES=500
CHAMPION_PROMOTION_THRESHOLD=0.02
CHAMPION_TRAFFIC_SPLIT=0.1
CHAMPION_EVALUATION_METRIC=f1_score
```

---

## Validation

All Week 11 modules perform strict validation at initialization:
- Missing required variables → `RuntimeError` with clear error message
- Invalid format/type → `ValueError` with format specification
- **Fail-fast behavior**: No silent fallbacks or default values

## Usage Notes

1. **Feedback Thresholds**: Set based on acceptable false positive/negative rates
2. **Performance Degradation**: Typically 5% (0.05) degradation triggers investigation
3. **Retraining Frequency**: Balance between model freshness and computational cost
4. **Challenger Traffic**: Start with 10-20% traffic, gradually increase if performing well
5. **Promotion Threshold**: Require statistical significance (typically 2-5% improvement)

## Compliance

This configuration follows the SYSTEM MANDATE:
- ✅ No hardcoded values
- ✅ No fallback defaults
- ✅ Fail-fast on missing configuration
- ✅ All values externalized to environment variables

## Module Summary

**Week 11 Modules Created:**
1. `feedback_collector.py` (188 lines) - Human feedback collection and analysis
2. `performance_tracker.py` (170 lines) - Performance monitoring and degradation detection
3. `retraining_pipeline.py` (198 lines) - Automated retraining orchestration
4. `champion_challenger.py` (195 lines) - Champion/challenger deployment framework
5. `feedback_helpers.py` (0 lines) - No separate helpers needed
6. `performance_helpers.py` (108 lines) - Performance calculation utilities
7. `retraining_helpers.py` (76 lines) - Retraining job management utilities
8. `champion_helpers.py` (169 lines) - Champion/challenger utilities

**Total:** 7 main modules + 3 helper modules, all < 200 lines per file ✅
