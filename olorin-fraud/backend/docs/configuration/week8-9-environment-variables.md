# Week 8 & 9 Environment Variables - Required Configuration

This document lists ALL required environment variables for Week 8 (Ensemble Modeling) and Week 9 (Calibration & Confidence Scoring) modules.

## ⚠️ CRITICAL: No Default Values

Per SYSTEM MANDATE compliance, **ALL** environment variables listed below are **REQUIRED** with **NO** fallback defaults. The system will raise `RuntimeError` or `ValueError` if any required variable is missing.

---

## Week 8: Ensemble Modeling

### Ensemble Strategy Configuration

**ENSEMBLE_STRATEGY**
- **Type**: string
- **Required**: Yes
- **Valid Values**: "weighted_averaging", "averaging", "max_score"
- **Example**: `ENSEMBLE_STRATEGY=weighted_averaging`
- **Description**: Strategy for combining multiple model predictions

### Rule-Based Model Configuration

**RULE_BASED_MODEL_VERSION**
- **Type**: string
- **Required**: Yes
- **Example**: `RULE_BASED_MODEL_VERSION=1.0`
- **Description**: Version identifier for rule-based model

**RULE_BASED_BASE_SCORE**
- **Type**: float (0.0 to 1.0)
- **Required**: Yes
- **Example**: `RULE_BASED_BASE_SCORE=0.5`
- **Description**: Baseline risk score before pattern adjustments

**RULE_BASED_CONFIDENCE_BASE**
- **Type**: float (0.0 to 1.0)
- **Required**: Yes
- **Example**: `RULE_BASED_CONFIDENCE_BASE=0.5`
- **Description**: Base confidence level for rule-based predictions

**RULE_BASED_CONFIDENCE_INCREMENT**
- **Type**: float (0.0 to 1.0)
- **Required**: Yes
- **Example**: `RULE_BASED_CONFIDENCE_INCREMENT=0.1`
- **Description**: Confidence increment per detected pattern

**RULE_BASED_FEATURE_IMPORTANCE**
- **Type**: string (comma-separated feature:weight pairs)
- **Required**: Yes
- **Format**: `feature1:weight1,feature2:weight2,...`
- **Example**:
  ```
  RULE_BASED_FEATURE_IMPORTANCE=tx_per_5min_by_email:0.85,geo_distance:0.90,tx_hour:0.65,device_first_seen:0.70,tx_amount:0.75,unique_devices_per_email:0.80,velocity_5min:0.85,velocity_15min:0.75,merchant_concentration_ratio:0.60
  ```
- **Description**: Feature importance weights for rule-based model

### XGBoost Model Configuration

**ENABLE_XGBOOST_MODEL**
- **Type**: string boolean
- **Required**: Yes
- **Valid Values**: "true", "false"
- **Example**: `ENABLE_XGBOOST_MODEL=true`
- **Description**: Enable/disable XGBoost model in ensemble

**XGBOOST_MODEL_VERSION** (required if ENABLE_XGBOOST_MODEL=true)
- **Type**: string
- **Required**: Yes (when enabled)
- **Example**: `XGBOOST_MODEL_VERSION=1.0`
- **Description**: Version identifier for XGBoost model

**XGBOOST_MODEL_PATH** (required if ENABLE_XGBOOST_MODEL=true)
- **Type**: string (file path)
- **Required**: Yes (when enabled)
- **Example**: `XGBOOST_MODEL_PATH=/path/to/xgboost_model.json`
- **Description**: Path to trained XGBoost model artifact

**XGBOOST_CONFIDENCE_THRESHOLD**
- **Type**: float (0.0 to 1.0)
- **Required**: Yes (when enabled)
- **Example**: `XGBOOST_CONFIDENCE_THRESHOLD=0.85`
- **Description**: Confidence threshold for XGBoost predictions

### LightGBM Model Configuration

**ENABLE_LIGHTGBM_MODEL**
- **Type**: string boolean
- **Required**: Yes
- **Valid Values**: "true", "false"
- **Example**: `ENABLE_LIGHTGBM_MODEL=false`
- **Description**: Enable/disable LightGBM model in ensemble

**LIGHTGBM_MODEL_VERSION** (required if ENABLE_LIGHTGBM_MODEL=true)
- **Type**: string
- **Required**: Yes (when enabled)
- **Example**: `LIGHTGBM_MODEL_VERSION=1.0`
- **Description**: Version identifier for LightGBM model

**LIGHTGBM_MODEL_PATH** (required if ENABLE_LIGHTGBM_MODEL=true)
- **Type**: string (file path)
- **Required**: Yes (when enabled)
- **Example**: `LIGHTGBM_MODEL_PATH=/path/to/lightgbm_model.txt`
- **Description**: Path to trained LightGBM model artifact

**LIGHTGBM_CONFIDENCE_THRESHOLD**
- **Type**: float (0.0 to 1.0)
- **Required**: Yes (when enabled)
- **Example**: `LIGHTGBM_CONFIDENCE_THRESHOLD=0.85`
- **Description**: Confidence threshold for LightGBM predictions

---

## Week 9: Calibration & Confidence Scoring

### Confidence Scoring Configuration

**CONFIDENCE_ALPHA**
- **Type**: float (0.0 to 1.0)
- **Required**: Yes
- **Example**: `CONFIDENCE_ALPHA=0.05`
- **Description**: Significance level for confidence intervals (0.05 = 95% confidence)

**CONFIDENCE_MIN_SAMPLES**
- **Type**: integer (positive)
- **Required**: Yes
- **Example**: `CONFIDENCE_MIN_SAMPLES=30`
- **Description**: Minimum sample size for confidence interval calculation

### Calibration Configuration

**CALIBRATOR_PATH**
- **Type**: string (directory path)
- **Required**: Yes
- **Example**: `CALIBRATOR_PATH=/home/user/.olorin/calibrators`
- **Description**: Directory path for calibrator artifacts (isotonic regression models)

**CALIBRATION_MIN_SAMPLES**
- **Type**: integer (positive)
- **Required**: Yes
- **Example**: `CALIBRATION_MIN_SAMPLES=100`
- **Description**: Minimum number of samples required for calibration

---

## Example .env Configuration

```bash
# Week 8: Ensemble Modeling
ENSEMBLE_STRATEGY=weighted_averaging
RULE_BASED_MODEL_VERSION=1.0
RULE_BASED_BASE_SCORE=0.5
RULE_BASED_CONFIDENCE_BASE=0.5
RULE_BASED_CONFIDENCE_INCREMENT=0.1
RULE_BASED_FEATURE_IMPORTANCE=tx_per_5min_by_email:0.85,geo_distance:0.90,tx_hour:0.65,device_first_seen:0.70,tx_amount:0.75,unique_devices_per_email:0.80,velocity_5min:0.85,velocity_15min:0.75,merchant_concentration_ratio:0.60

# XGBoost Model (set to false to disable)
ENABLE_XGBOOST_MODEL=true
XGBOOST_MODEL_VERSION=1.0
XGBOOST_MODEL_PATH=/Users/olorin/.olorin/models/xgboost_model.json
XGBOOST_CONFIDENCE_THRESHOLD=0.85

# LightGBM Model (set to false to disable)
ENABLE_LIGHTGBM_MODEL=false
LIGHTGBM_MODEL_VERSION=1.0
LIGHTGBM_MODEL_PATH=/Users/olorin/.olorin/models/lightgbm_model.txt
LIGHTGBM_CONFIDENCE_THRESHOLD=0.85

# Week 9: Calibration & Confidence
CONFIDENCE_ALPHA=0.05
CONFIDENCE_MIN_SAMPLES=30
CALIBRATOR_PATH=/Users/olorin/.olorin/calibrators
CALIBRATION_MIN_SAMPLES=100
```

---

## Validation

All Week 8 & 9 modules perform strict validation at initialization:
- Missing required variables → `RuntimeError` with clear error message
- Invalid format/type → `ValueError` with format specification
- **Fail-fast behavior**: No silent fallbacks or default values

## Usage Notes

1. **Feature Importance String Format**: Use colon-separated pairs, comma-delimited
2. **Boolean Values**: Use lowercase "true" or "false"
3. **File Paths**: Use absolute paths for model artifacts
4. **Directory Paths**: Ensure directories exist and are writable

## Compliance

This configuration follows the SYSTEM MANDATE:
- ✅ No hardcoded values
- ✅ No fallback defaults
- ✅ Fail-fast on missing configuration
- ✅ All values externalized to environment variables
