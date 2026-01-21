# Week 10 Environment Variables - Required Configuration

This document lists ALL required environment variables for Week 10 (Real-time Monitoring) modules.

## ⚠️ CRITICAL: No Default Values

Per SYSTEM MANDATE compliance, **ALL** environment variables listed below are **REQUIRED** with **NO** fallback defaults. The system will raise `RuntimeError` if any required variable is missing.

---

## Week 10: Real-time Monitoring

### Metrics Collector Configuration

**METRICS_WINDOW_SIZE**
- **Type**: integer (positive)
- **Required**: Yes
- **Example**: `METRICS_WINDOW_SIZE=1000`
- **Description**: Maximum number of prediction samples to retain in rolling window

**METRICS_RETENTION_HOURS**
- **Type**: integer (positive)
- **Required**: Yes
- **Example**: `METRICS_RETENTION_HOURS=24`
- **Description**: Number of hours to retain historical metrics data

### Alerting System Configuration

**ALERT_LATENCY_THRESHOLD_MS**
- **Type**: float (positive)
- **Required**: Yes
- **Example**: `ALERT_LATENCY_THRESHOLD_MS=200.0`
- **Description**: P95 latency threshold in milliseconds for alert generation

**ALERT_ERROR_RATE_THRESHOLD**
- **Type**: float (0.0 to 1.0)
- **Required**: Yes
- **Example**: `ALERT_ERROR_RATE_THRESHOLD=0.05`
- **Description**: Error rate threshold (5% = 0.05) for alert generation

**ALERT_SCORE_DRIFT_THRESHOLD**
- **Type**: float (0.0 to 1.0)
- **Required**: Yes
- **Example**: `ALERT_SCORE_DRIFT_THRESHOLD=0.15`
- **Description**: Standard deviation threshold for score drift detection

**ALERT_CONFIDENCE_DROP_THRESHOLD**
- **Type**: float (0.0 to 1.0)
- **Required**: Yes
- **Example**: `ALERT_CONFIDENCE_DROP_THRESHOLD=0.7`
- **Description**: Minimum mean confidence threshold (alerts if drops below)

### SLA Tracker Configuration

**SLA_AVAILABILITY_TARGET**
- **Type**: float (0.0 to 1.0)
- **Required**: Yes
- **Example**: `SLA_AVAILABILITY_TARGET=0.999`
- **Description**: Target availability SLA (99.9% = 0.999)

**SLA_LATENCY_P95_TARGET_MS**
- **Type**: float (positive)
- **Required**: Yes
- **Example**: `SLA_LATENCY_P95_TARGET_MS=100.0`
- **Description**: Target P95 latency SLA in milliseconds

**SLA_ACCURACY_TARGET**
- **Type**: float (0.0 to 1.0)
- **Required**: Yes
- **Example**: `SLA_ACCURACY_TARGET=0.95`
- **Description**: Target prediction accuracy SLA (95% = 0.95)

**SLA_WINDOW_SIZE**
- **Type**: integer (positive)
- **Required**: Yes
- **Example**: `SLA_WINDOW_SIZE=10000`
- **Description**: Maximum number of samples for SLA calculation rolling window

### Database Provider (Shared Configuration)

**DATABASE_PROVIDER**
- **Type**: string
- **Required**: Yes
- **Valid Values**: "snowflake", "postgres"
- **Example**: `DATABASE_PROVIDER=snowflake`
- **Description**: Database provider for analytics queries
- **Note**: This variable is also required by analytics modules (drift_detector, pipeline_monitor, throughput_calculator, precision_recall, explainer)

### Drift Detection Thresholds (Analytics Modules)

**DRIFT_PSI_THRESHOLD**
- **Type**: float (positive)
- **Required**: Yes (for drift_detector.py)
- **Example**: `DRIFT_PSI_THRESHOLD=0.2`
- **Description**: Population Stability Index threshold for drift detection

**DRIFT_KL_THRESHOLD**
- **Type**: float (positive)
- **Required**: Yes (for drift_detector.py)
- **Example**: `DRIFT_KL_THRESHOLD=0.1`
- **Description**: Kullback-Leibler divergence threshold for drift detection

**NULL_SPIKE_THRESHOLD**
- **Type**: float (0.0 to 1.0)
- **Required**: Yes (for drift_detector.py)
- **Example**: `NULL_SPIKE_THRESHOLD=0.1`
- **Description**: Null value spike threshold (10% = 0.1 increase)

### Pipeline Monitor Thresholds

**PIPELINE_FRESHNESS_THRESHOLD_MINUTES**
- **Type**: integer (positive)
- **Required**: Yes (for pipeline_monitor.py)
- **Example**: `PIPELINE_FRESHNESS_THRESHOLD_MINUTES=5`
- **Description**: Maximum acceptable data freshness in minutes

**PIPELINE_COMPLETENESS_THRESHOLD**
- **Type**: float (0.0 to 1.0)
- **Required**: Yes (for pipeline_monitor.py)
- **Example**: `PIPELINE_COMPLETENESS_THRESHOLD=0.99`
- **Description**: Minimum data completeness threshold (99% = 0.99)

**PIPELINE_SUCCESS_RATE_THRESHOLD**
- **Type**: float (0.0 to 1.0)
- **Required**: Yes (for pipeline_monitor.py)
- **Example**: `PIPELINE_SUCCESS_RATE_THRESHOLD=0.95`
- **Description**: Minimum pipeline success rate threshold (95% = 0.95)

---

## Example .env Configuration

```bash
# Week 10: Real-time Monitoring - Metrics Collector
METRICS_WINDOW_SIZE=1000
METRICS_RETENTION_HOURS=24

# Week 10: Alerting System
ALERT_LATENCY_THRESHOLD_MS=200.0
ALERT_ERROR_RATE_THRESHOLD=0.05
ALERT_SCORE_DRIFT_THRESHOLD=0.15
ALERT_CONFIDENCE_DROP_THRESHOLD=0.7

# Week 10: SLA Tracker
SLA_AVAILABILITY_TARGET=0.999
SLA_LATENCY_P95_TARGET_MS=100.0
SLA_ACCURACY_TARGET=0.95
SLA_WINDOW_SIZE=10000

# Shared: Database Provider (required by analytics modules)
DATABASE_PROVIDER=snowflake

# Analytics: Drift Detection
DRIFT_PSI_THRESHOLD=0.2
DRIFT_KL_THRESHOLD=0.1
NULL_SPIKE_THRESHOLD=0.1

# Analytics: Pipeline Monitoring
PIPELINE_FRESHNESS_THRESHOLD_MINUTES=5
PIPELINE_COMPLETENESS_THRESHOLD=0.99
PIPELINE_SUCCESS_RATE_THRESHOLD=0.95
```

---

## Validation

All Week 10 modules perform strict validation at initialization:
- Missing required variables → `RuntimeError` with clear error message
- Invalid format/type → `ValueError` with format specification
- **Fail-fast behavior**: No silent fallbacks or default values

## Usage Notes

1. **Window Sizes**: Balance memory usage vs. statistical significance
2. **Thresholds**: Adjust based on production requirements and SLAs
3. **Database Provider**: Must match configured database backend
4. **Float Values**: Use decimal notation (e.g., 0.999, not 99.9%)

## Compliance

This configuration follows the SYSTEM MANDATE:
- ✅ No hardcoded values
- ✅ No fallback defaults
- ✅ Fail-fast on missing configuration
- ✅ All values externalized to environment variables

## Module Summary

**Week 10 Modules Created:**
1. `metrics_collector.py` (189 lines) - Real-time metrics aggregation
2. `alerting.py` (166 lines) - Anomaly detection and alert generation
3. `alert_models.py` (57 lines) - Alert data structures
4. `sla_tracker.py` (169 lines) - SLA monitoring and compliance tracking
5. `sla_calculations.py` (63 lines) - SLA calculation utilities

**Total:** 5 new modules, 644 lines of code, all < 200 lines per file ✅
