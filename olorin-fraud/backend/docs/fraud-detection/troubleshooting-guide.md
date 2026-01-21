# Fraud Detection System - Troubleshooting Guide

**Version**: 1.0
**Last Updated**: 2025-11-24
**Audience**: Operations & Engineering Teams

---

## Table of Contents

1. [Configuration Issues](#configuration-issues)
2. [Model Loading Failures](#model-loading-failures)
3. [Performance Degradation](#performance-degradation)
4. [Alert System Issues](#alert-system-issues)
5. [Data Quality Problems](#data-quality-problems)
6. [Retraining Failures](#retraining-failures)
7. [Champion/Challenger Issues](#championchallenger-issues)
8. [Integration Problems](#integration-problems)

---

## Configuration Issues

### Issue: RuntimeError - Missing Environment Variable

**Symptom**:
```
RuntimeError: ENSEMBLE_STRATEGY environment variable is required
```

**Cause**: Required environment variable not set in `.env` file

**Solution**:
```bash
# 1. Check which variable is missing from error message
# 2. Add to .env file
echo "ENSEMBLE_STRATEGY=weighted_averaging" >> .env

# 3. Restart service
# The application will reload configuration
```

**Verification**:
```bash
# Verify variable is set
grep "ENSEMBLE_STRATEGY" .env

# Test configuration loading
python -c "
import os
from dotenv import load_dotenv
load_dotenv()
print(os.getenv('ENSEMBLE_STRATEGY'))
"
```

**Prevention**:
- Use `.env.example` template
- Run configuration validation script on startup
- Document all new variables in configuration docs

---

### Issue: Invalid Configuration Value

**Symptom**:
```
ValueError: FEEDBACK_FP_THRESHOLD must be between 0.0 and 1.0
```

**Cause**: Configuration value outside valid range

**Solution**:
```bash
# 1. Check current value
grep "FEEDBACK_FP_THRESHOLD" .env

# 2. Correct to valid range (0.0-1.0 for rates/percentages)
# For 10%, use 0.10 not 10
sed -i 's/FEEDBACK_FP_THRESHOLD=10/FEEDBACK_FP_THRESHOLD=0.10/' .env

# 3. Common corrections:
# Rates: 0.0-1.0 (0.05 = 5%)
# Counts: positive integers
# Paths: valid file system paths
```

**Common Value Ranges**:
- Error rates/thresholds: 0.0 to 1.0
- Percentiles: 0.0 to 1.0 (0.95 = 95th percentile)
- Window sizes: positive integers (100-10000)
- Hours: positive integers
- Latency: milliseconds (positive float)

---

### Issue: Model Path Not Found

**Symptom**:
```
FileNotFoundError: Model file not found at /Users/olorin/.olorin/models/xgboost_fraud_model.json
```

**Cause**: Model file doesn't exist at configured path

**Solution**:
```bash
# 1. Check if path exists
ls -la /Users/olorin/.olorin/models/

# 2. Create directory if missing
mkdir -p /Users/olorin/.olorin/models/

# 3. Either:
#    a) Copy model file to correct location
cp /path/to/model.json /Users/olorin/.olorin/models/xgboost_fraud_model.json

#    b) Or update .env with correct path
# XGBOOST_MODEL_PATH=/actual/path/to/model.json

# 4. Verify file exists and is readable
ls -lh /Users/olorin/.olorin/models/xgboost_fraud_model.json
```

**Prevention**:
- Use consistent paths across environments
- Include model files in deployment
- Verify file permissions (readable by application)

---

## Model Loading Failures

### Issue: Model Fails to Load

**Symptom**:
```
RuntimeError: XGBoost: Model not available. Ensure XGBOOST_MODEL_PATH is configured and model is trained.
```

**Cause**: Model file corrupt, incompatible version, or not trained

**Diagnosis**:
```python
# Test model loading directly
import xgboost as xgb

try:
    model = xgb.Booster()
    model.load_model('/path/to/model.json')
    print("✓ Model loaded successfully")
except Exception as e:
    print(f"✗ Model loading failed: {e}")
```

**Solutions**:

**If model is corrupt**:
```bash
# Restore from backup
cp /backups/xgboost_fraud_model.json /Users/olorin/.olorin/models/

# Or retrain model
python -m app.service.analytics.model_training
```

**If version mismatch**:
```bash
# Check XGBoost version
python -c "import xgboost; print(xgboost.__version__)"

# Model trained with different version - need to retrain
# Or upgrade/downgrade XGBoost to match
```

**If model not trained**:
```bash
# Train initial model
python -m app.service.analytics.initial_training

# Or disable model temporarily
# ENABLE_XGBOOST_MODEL=false
```

---

### Issue: Ensemble Model Prediction Fails

**Symptom**:
```
ValueError: Cannot combine predictions - all 3 predictions have zero confidence
```

**Cause**: All models in ensemble returning zero confidence

**Diagnosis**:
```python
from app.service.analytics.ensemble_model import EnsembleModel

model = EnsembleModel()

# Check individual models
for m in model.models:
    print(f"{m.model_name}: is_trained={m.is_trained}")
```

**Solution**:
```python
# If no models trained:
# 1. Verify model paths
# 2. Check model files exist
# 3. Enable at least rule-based model as fallback

# Update .env:
# ENABLE_RULE_BASED_MODEL=true

# Rule-based model doesn't require training
# Will provide fallback predictions
```

**Prevention**:
- Always have rule-based model enabled
- Monitor model health daily
- Alert if all models fail

---

## Performance Degradation

### Issue: High Latency (P95 > Threshold)

**Symptom**: Alert - `latency_threshold_exceeded`

**Diagnosis**:
```python
from app.service.monitoring.metrics_collector import MetricsCollector
import numpy as np

collector = MetricsCollector()
latencies = list(collector.prediction_latencies)[-1000:]

print(f"P50: {np.percentile(latencies, 50):.2f}ms")
print(f"P95: {np.percentile(latencies, 95):.2f}ms")
print(f"P99: {np.percentile(latencies, 99):.2f}ms")
print(f"Max: {np.max(latencies):.2f}ms")

# Identify outliers
outliers = [l for l in latencies if l > 200]
print(f"Outliers (>200ms): {len(outliers)}")
```

**Common Causes & Solutions**:

**1. Snowflake Query Slow**:
```python
# Check threshold calculator cache
from app.service.analytics.threshold_calculator import ThresholdCalculator

calc = ThresholdCalculator()
# Cache TTL is 1 hour
# If cache misses, queries are slow

# Solution: Increase cache TTL or pre-warm cache
```

**2. Model Inference Slow**:
```python
# Profile model prediction time
import time

start = time.time()
prediction = ensemble_model.predict(features)
elapsed = (time.time() - start) * 1000

print(f"Ensemble prediction: {elapsed:.2f}ms")

# If >100ms, check individual models
```

**3. Feature Extraction Slow**:
```python
# Check feature engineering pipeline
from app.service.analytics.feature_engineering import FeatureEngineeringPipeline

pipeline = FeatureEngineeringPipeline()

# Verify cache is working
# Cache TTL is 5 minutes
# High cache hit rate = good performance
```

**4. Database Connection Pool Exhausted**:
```bash
# Check connection pool settings
grep "POOL_SIZE" .env

# Increase if needed:
# SNOWFLAKE_POOL_SIZE=10
# SNOWFLAKE_POOL_MAX_OVERFLOW=20
```

---

### Issue: Performance Degradation Detected

**Symptom**:
```
Performance degradation detected: F1 score dropped from 0.90 to 0.83
```

**Diagnosis**:
```python
from app.service.feedback.performance_tracker import PerformanceTracker

tracker = PerformanceTracker()

# Check degradation details
degradation = tracker.check_degradation()

print(f"Degraded: {degradation['degraded']}")
if degradation['degraded']:
    for metric in degradation['degraded_metrics']:
        print(f"{metric['metric']}: {metric['baseline']:.3f} → {metric['current']:.3f}")
```

**Causes & Solutions**:

**1. Data Drift**:
- Transaction patterns changed
- New fraud schemes
- Seasonal variations

**Solution**: Trigger retraining
```python
from app.service.feedback.retraining_pipeline import RetrainingPipeline, RetrainingTrigger

pipeline = RetrainingPipeline()

# Collect training data (feedback + recent transactions)
training_data = get_labeled_data()  # Your implementation

# Trigger retraining
result = pipeline.trigger_retraining(
    trigger_reason=RetrainingTrigger.PERFORMANCE_DEGRADATION,
    training_data=training_data,
    model_id="fraud_model",
    model_version="1.3.0"
)
```

**2. Model Staleness**:
- Model trained on old data
- Patterns evolved

**Solution**: Check last training date, retrain if >1 week old

**3. Data Quality Issues**:
- Missing features
- Corrupt data
- Schema changes

**Solution**: Investigate data pipeline, fix upstream issues

---

## Alert System Issues

### Issue: Alert Fatigue (Too Many Alerts)

**Symptom**: Hundreds of alerts per day, mostly false positives

**Diagnosis**:
```python
from app.service.monitoring.alerting import AlertingSystem

alerting = AlertingSystem()
alerts = alerting.get_active_alerts()

# Group by type
from collections import Counter
alert_types = Counter(a['alert_type'] for a in alerts)

print("Alert breakdown:")
for alert_type, count in alert_types.most_common():
    print(f"  {alert_type}: {count}")
```

**Solutions**:

**1. Adjust Thresholds**:
```bash
# If too many latency alerts, increase threshold
# Current: ALERT_LATENCY_THRESHOLD_MS=200.0
# New: ALERT_LATENCY_THRESHOLD_MS=250.0

# If too many error alerts, increase tolerance
# Current: ALERT_ERROR_RATE_THRESHOLD=0.05
# New: ALERT_ERROR_RATE_THRESHOLD=0.07
```

**2. Add Alert Cooldown**:
```python
# Implement in alerting.py:
# Don't re-alert for same issue within X minutes
# Track last alert time per type
```

**3. Aggregate Related Alerts**:
```python
# Instead of alerting per transaction
# Alert once per 5-minute window
```

---

### Issue: Missing Critical Alerts

**Symptom**: Issue occurred but no alert generated

**Diagnosis**:
```python
# Check if metrics being collected
metrics = collector.get_prediction_metrics()
print(f"Sample count: {metrics['total_predictions']}")

# If zero samples, metrics not being recorded
```

**Causes**:

**1. Metrics Not Recorded**:
```python
# Ensure record_prediction called for each prediction
collector.record_prediction(
    score=prediction.score,
    confidence=prediction.confidence,
    latency_ms=latency,
    features=features
)
```

**2. Thresholds Too Lenient**:
```bash
# Check thresholds
grep "ALERT_" .env

# If issue at 15% error rate but threshold is 20%
# Lower threshold to catch issues earlier
```

**3. Alert Check Not Running**:
```python
# Verify check_metrics called
alerting = AlertingSystem()
metrics = collector.get_all_metrics()
alerts = alerting.check_metrics(metrics)

# Should run automatically, but verify integration
```

---

## Data Quality Problems

### Issue: High Null Rate in Features

**Symptom**: Many features have null/missing values

**Diagnosis**:
```python
# Check feature completeness
features = extract_features(transaction)

null_count = sum(1 for v in features.values() if v is None)
total_count = len(features)
null_rate = null_count / total_count

print(f"Null rate: {null_rate:.2%}")
print(f"Null features: {[k for k,v in features.items() if v is None]}")
```

**Solutions**:

**1. Missing Data in Source**:
- Check transaction has all required fields
- Verify database query returns all columns
- Fix data pipeline upstream

**2. Feature Extraction Failing**:
- Check for exceptions in extraction code
- Verify field names match database schema
- Handle missing data gracefully

**3. Drift in Data Schema**:
- Column renamed in database
- New schema not reflected in code
- Update feature extraction to match current schema

---

### Issue: Drift Alert Triggered

**Symptom**: Data drift detected (PSI or KL divergence above threshold)

**Diagnosis**:
```python
from app.service.analytics.drift_detector import DriftDetector

detector = DriftDetector()

# Check which features drifting
drift_report = detector.detect_drift(
    start_date=baseline_start,
    end_date=baseline_end,
    comparison_start=current_start,
    comparison_end=current_end
)

for feature, metrics in drift_report.items():
    if metrics['psi'] > 0.2:
        print(f"Drifting feature: {feature}")
        print(f"  PSI: {metrics['psi']:.3f}")
        print(f"  KL divergence: {metrics['kl_divergence']:.3f}")
```

**Actions**:

**1. Investigate Cause**:
- Business change (new product line, market expansion)
- Data quality issue
- Fraud pattern evolution
- Seasonal variation

**2. If Legitimate Change**:
- Update baseline period
- Retrain model with recent data
- Adjust features if needed

**3. If Data Issue**:
- Fix data pipeline
- Restore correct data
- Alert data engineering team

---

## Retraining Failures

### Issue: Retraining Job Fails

**Symptom**:
```
Retraining failed: Validation F1 score (0.72) below minimum threshold (0.85)
```

**Diagnosis**:
```python
from app.service.feedback.retraining_pipeline import RetrainingPipeline

pipeline = RetrainingPipeline()

# Check recent history
history = pipeline.get_retrain_history(limit=5)

for job in history:
    print(f"Job {job['job_id']}: {job['status']}")
    if job['status'] == 'failed':
        print(f"  Error: {job['error']}")
```

**Causes & Solutions**:

**1. Insufficient Training Data**:
```python
# Need more labeled examples
# Current: {len(training_data)} samples
# Required: {pipeline.min_training_samples}

# Solution: Collect more feedback
# Or lower threshold temporarily
# RETRAIN_MIN_TRAINING_SAMPLES=500
```

**2. Poor Data Quality**:
```python
# Check training data distribution
labels = [d['actual_label'] for d in training_data]
fraud_rate = sum(labels) / len(labels)

print(f"Fraud rate: {fraud_rate:.2%}")

# If <1% or >50%, data imbalanced
# Solution: Collect more balanced samples
```

**3. Validation Threshold Too High**:
```bash
# If new model achieves 0.82 F1 but threshold is 0.85
# Either:
# a) Improve model (more data, better features)
# b) Lower threshold if 0.82 acceptable
# RETRAIN_MIN_VALIDATION_F1=0.80
```

---

### Issue: Retraining Never Triggers

**Symptom**: No automatic retraining despite configured schedule

**Diagnosis**:
```python
# Check last retrain time
status = pipeline.get_status()
print(f"Last retrain: {status['last_retrain_time']}")

# Check feedback summary
from app.service.feedback.feedback_collector import FeedbackCollector
collector = FeedbackCollector()
summary = collector.get_feedback_summary()

print(f"Total feedback: {summary['total_feedback']}")
print(f"Ready for retrain: {summary['ready_for_retrain']}")
```

**Causes**:

**1. Not Enough Feedback**:
```python
# Need {collector.min_feedback_for_retrain} samples
# Have {summary['total_feedback']}

# Solution: Lower threshold or wait longer
# FEEDBACK_MIN_FOR_RETRAIN=50
```

**2. Error Rates Below Threshold**:
```python
# FP rate: {summary['metrics']['false_positive_rate']:.2%}
# Threshold: {collector.fp_threshold:.2%}

# If performing well, no trigger
# This is expected behavior
```

**3. Scheduler Not Running**:
```bash
# Verify retraining scheduler active
# Check logs for scheduled runs
# Verify RETRAIN_INTERVAL_HOURS configured
```

---

## Champion/Challenger Issues

### Issue: Challenger Never Promoted

**Symptom**: Challenger deployed but never becomes champion

**Diagnosis**:
```python
from app.service.feedback.champion_challenger import ChampionChallengerFramework

framework = ChampionChallengerFramework()

# Check evaluation
evaluation = framework.evaluate_promotion()

print(f"Decision: {evaluation['decision']}")
print(f"Message: {evaluation['message']}")

if 'champion_metric' in evaluation:
    print(f"Champion {framework.evaluation_metric}: {evaluation['champion_metric']:.3f}")
    print(f"Challenger {framework.evaluation_metric}: {evaluation['challenger_metric']:.3f}")
    print(f"Improvement: {evaluation['improvement']:.3f}")
```

**Causes**:

**1. Insufficient Predictions**:
```python
# Need {framework.min_challenger_samples} predictions
# Have {framework.challenger['prediction_count']}

# Solution: Wait longer or lower threshold
# CHAMPION_MIN_CHALLENGER_SAMPLES=200
```

**2. Improvement Below Threshold**:
```python
# Improvement: {evaluation['improvement']:.3f}
# Required: {framework.promotion_threshold:.3f}

# Challenger not significantly better
# This is expected - champion is good

# Options:
# a) Wait - challenger may improve with more data
# b) Lower threshold if marginal improvement acceptable
# CHAMPION_PROMOTION_THRESHOLD=0.01
```

**3. Challenger Performing Worse**:
```python
# Improvement: -0.05 (negative = worse)

# Challenger not ready
# Options:
# a) Deploy different challenger
# b) Retrain current challenger with more data
# c) Keep champion (working as designed)
```

---

### Issue: Champion/Challenger Traffic Split Not Working

**Symptom**: All traffic going to champion, none to challenger

**Diagnosis**:
```python
status = framework.get_deployment_status()

print("Deployment:")
print(f"  Champion: {status['champion']['model_id']}")
print(f"  Challenger: {status['challenger']}")
print(f"Traffic split:")
print(f"  Champion: {status['traffic_split']['champion']*100}%")
print(f"  Challenger: {status['traffic_split']['challenger']*100}%")
```

**Cause**: Traffic routing not implemented in prediction flow

**Solution**:
```python
# Ensure prediction code uses traffic split

# Example implementation:
import hashlib

def get_model_for_prediction(entity_id):
    # Consistent hashing for traffic split
    hash_value = int(hashlib.md5(entity_id.encode()).hexdigest(), 16)
    threshold = int(framework.traffic_split * (2**128))

    if hash_value < threshold and framework.challenger:
        return framework.challenger
    return framework.champion

# Then record prediction to correct model
model = get_model_for_prediction(transaction.email)
framework.record_prediction(
    model_role=ModelRole.CHAMPION if model == framework.champion else ModelRole.CHALLENGER,
    performance_metrics={"f1_score": f1}
)
```

---

## Integration Problems

### Issue: Snowflake Connection Failures

**Symptom**:
```
snowflake.connector.errors.DatabaseError: Unable to connect to Snowflake
```

**Diagnosis**:
```bash
# Check Snowflake credentials
grep "SNOWFLAKE_" .env | grep -v PASSWORD | grep -v KEY

# Test connection
python -c "
from app.service.snowflake_service import SnowflakeService
try:
    service = SnowflakeService()
    result = service.execute_query('SELECT CURRENT_TIMESTAMP()')
    print('✓ Snowflake connected')
except Exception as e:
    print(f'✗ Connection failed: {e}')
"
```

**Solutions**:

**1. Invalid Credentials**:
```bash
# Verify credentials in Firebase Secrets or .env
# Check private key path exists
ls -la $SNOWFLAKE_PRIVATE_KEY_PATH

# Test authentication method
# Try password auth if key auth failing
```

**2. Network Issues**:
```bash
# Test connectivity
ping ETMZUSX-LW98386.snowflakecomputing.com

# Check firewall rules
# Verify IP whitelisting
```

**3. Connection Pool Exhausted**:
```bash
# Increase pool size
# SNOWFLAKE_POOL_SIZE=10
# SNOWFLAKE_POOL_MAX_OVERFLOW=20

# Check for connection leaks
# Ensure connections properly closed
```

---

### Issue: Feature Extraction Returns Empty

**Symptom**: Features dictionary is empty or has all None values

**Diagnosis**:
```python
# Test feature extraction
from app.service.risk.advanced_features import extract_advanced_features

features = extract_advanced_features(transaction)

print(f"Features extracted: {len(features)}")
print(f"Non-null features: {sum(1 for v in features.values() if v is not None)}")

if not features:
    print("✗ No features extracted")
    # Check transaction object
    print(f"Transaction fields: {vars(transaction)}")
```

**Causes**:

**1. Transaction Missing Fields**:
```python
# Required fields not present
required = ['email', 'amount', 'timestamp', 'ip_address', ...]
missing = [f for f in required if not hasattr(transaction, f)]

if missing:
    print(f"Missing fields: {missing}")
```

**2. Snowflake Query Fails**:
```python
# Velocity/threshold calculation queries fail
# Check Snowflake logs
# Verify tables exist and accessible
```

**3. Exception in Extraction Code**:
```python
# Add try/catch to identify failures
import traceback

try:
    features = extract_advanced_features(transaction)
except Exception as e:
    print(f"Exception: {e}")
    traceback.print_exc()
```

---

## Emergency Procedures

### Complete System Reset

**When**: Last resort, all other troubleshooting failed

**Steps**:
```bash
# 1. Backup current state
mkdir -p /backup/$(date +%Y%m%d)
cp -r ~/.olorin /backup/$(date +%Y%m%d)/

# 2. Clear all caches
rm -rf ~/.olorin/model_registry/*
rm -rf ~/.olorin/ab_experiments/*

# 3. Reset to last known good configuration
cp .env.backup .env

# 4. Verify configuration
python -c "from app.service.analytics.ensemble_model import EnsembleModel; print('Config OK')"

# 5. Restart service

# 6. Monitor for 1 hour
```

### Rollback to Previous Version

**When**: New deployment causing issues

**Steps**:
```bash
# 1. Identify last stable version
git log --oneline -10

# 2. Revert to stable commit
git checkout <stable-commit-hash>

# 3. Redeploy

# 4. Verify health
# Run health check script

# 5. Document incident
```

---

## Getting Help

### Internal Escalation

**Level 1**: operations@olorin.ai
**Level 2**: engineering@olorin.ai
**Level 3**: datascience@olorin.ai

### External Support

**Snowflake**: support.snowflake.com
**Cloud Provider**: Relevant support portal

### Documentation

- System Overview: `docs/fraud-detection/system-overview.md`
- Operational Runbook: `docs/fraud-detection/operational-runbook.md`
- Pattern Catalog: `docs/fraud-detection/pattern-catalog.md`

---

## Logging & Debugging

### Enable Debug Logging

```bash
# Temporarily enable debug logging
LOG_LEVEL=DEBUG

# For specific module
# In Python code:
import logging
logging.getLogger('app.service.analytics.ensemble_model').setLevel(logging.DEBUG)
```

### Useful Log Queries

```bash
# Recent errors
grep "ERROR" logs/application.log | tail -50

# Model predictions
grep "Ensemble prediction" logs/application.log | tail -20

# Alert triggers
grep "ALERT" logs/application.log | tail -30

# Performance metrics
grep "Performance recorded" logs/application.log | tail -20
```

### Performance Profiling

```python
# Profile slow function
import cProfile
import pstats

profiler = cProfile.Profile()
profiler.enable()

# Your slow code here
result = ensemble_model.predict(features)

profiler.disable()
stats = pstats.Stats(profiler)
stats.sort_stats('cumulative')
stats.print_stats(20)  # Top 20 slowest functions
```

---

**Last Updated**: 2025-11-24
**Next Review**: 2026-02-24
