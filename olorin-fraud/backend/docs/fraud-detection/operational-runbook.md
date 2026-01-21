# Fraud Detection System - Operational Runbook

**Version**: 1.0
**Last Updated**: 2025-11-24
**Owner**: Operations Team

---

## Table of Contents

1. [Daily Operations](#daily-operations)
2. [Monitoring Procedures](#monitoring-procedures)
3. [Alert Response](#alert-response)
4. [Model Management](#model-management)
5. [Performance Tuning](#performance-tuning)
6. [Incident Response](#incident-response)
7. [Maintenance Windows](#maintenance-windows)
8. [Escalation Procedures](#escalation-procedures)

---

## Daily Operations

### Morning Checklist

**Time**: 9:00 AM daily

**Tasks**:
1. Check SLA dashboard for overnight violations
2. Review active alerts from alerting system
3. Verify all models are healthy (champion + challenger if deployed)
4. Check performance degradation status
5. Review feedback collection metrics

**Commands**:
```python
# Check SLA status
from app.service.monitoring.sla_tracker import SLATracker
tracker = SLATracker()
status = tracker.get_all_slas()
print(status)

# Check active alerts
from app.service.monitoring.alerting import AlertingSystem
alerting = AlertingSystem()
alerts = alerting.get_active_alerts()
print(f"Active alerts: {len(alerts)}")

# Check model status
from app.service.feedback.champion_challenger import ChampionChallengerFramework
framework = ChampionChallengerFramework()
deployment = framework.get_deployment_status()
print(deployment)
```

**Expected Results**:
- `overall_compliant: true` for SLAs
- Active alerts: 0-2 (normal), 3+ requires investigation
- Champion model deployed and healthy
- Challenger (if present) should have >100 predictions

### End-of-Day Checklist

**Time**: 5:00 PM daily

**Tasks**:
1. Clear resolved alerts
2. Document any incidents
3. Review day's performance metrics
4. Check retraining pipeline status
5. Verify backup completion (if applicable)

**Commands**:
```python
# Clear resolved alerts
alerting.clear_alerts()

# Get performance summary
from app.service.feedback.performance_tracker import PerformanceTracker
tracker = PerformanceTracker()
current = tracker.get_current_performance()
print(current)

# Check retraining status
from app.service.feedback.retraining_pipeline import RetrainingPipeline
pipeline = RetrainingPipeline()
status = pipeline.get_status()
print(status)
```

### Weekly Tasks

**Every Monday**:
- Review weekly performance trends
- Analyze feedback collection metrics
- Check for model degradation
- Review SLA violations from past week

**Every Friday**:
- Export weekly metrics report
- Review champion/challenger performance
- Plan any configuration changes for next week

---

## Monitoring Procedures

### Real-time Metrics Monitoring

**Dashboard URL**: (Configure based on your deployment)

**Key Metrics to Monitor**:

**Latency Metrics**:
- P50 latency: Target <50ms
- P95 latency: Target <100ms
- P99 latency: Target <200ms

**Error Metrics**:
- Error rate: Target <5%
- Error types breakdown

**Prediction Metrics**:
- Score distribution (mean, std)
- Confidence distribution
- Prediction count (hourly)

**SLA Metrics**:
- Availability: Target 99.9%
- Latency P95: Target <100ms
- Accuracy: Target 95%

### Monitoring Commands

**Check Current Metrics**:
```python
from app.service.monitoring.metrics_collector import MetricsCollector

collector = MetricsCollector()

# Get prediction metrics
pred_metrics = collector.get_prediction_metrics()
print(f"Total predictions: {pred_metrics['total_predictions']}")
print(f"Mean score: {pred_metrics['score_stats']['mean']:.3f}")
print(f"P95 score: {pred_metrics['score_stats']['p95']:.3f}")

# Get latency metrics
latency_metrics = collector.get_latency_metrics()
print(f"P95 latency: {latency_metrics['p95_ms']:.2f}ms")

# Get error metrics
error_metrics = collector.get_error_metrics()
print(f"Error rate: {error_metrics['error_rate']:.2%}")
```

**Check SLA Compliance**:
```python
tracker = SLATracker()

# Individual SLAs
availability = tracker.get_availability_sla()
latency = tracker.get_latency_sla()
accuracy = tracker.get_accuracy_sla()

# All SLAs
all_slas = tracker.get_all_slas()
print(f"Overall compliant: {all_slas['overall_compliant']}")

# Check violations
violations = tracker.get_sla_violations()
if violations:
    print(f"⚠️  {len(violations)} SLA violations:")
    for v in violations:
        print(f"  - {v['sla_type']}: {v['severity']}")
```

---

## Alert Response

### Alert Severity Levels

**CRITICAL**: Immediate action required (page on-call)
- Availability SLA violation (actual < 95% of target)
- P95 latency > 2x threshold
- System down or unresponsive

**HIGH**: Action required within 1 hour
- Error rate > threshold
- P95 latency > threshold but < 2x
- Performance degradation >5%

**MEDIUM**: Action required within 4 hours
- Score drift detected
- Confidence drop
- Minor SLA violations

**LOW/INFO**: Review during business hours
- Performance trending down but not critical
- Minor anomalies

### Alert Response Procedures

#### Latency Threshold Exceeded

**Alert**: `latency_threshold_exceeded`

**Investigation Steps**:
1. Check current system load
2. Review database query performance
3. Check external API response times
4. Verify Snowflake connection
5. Check for unusual transaction patterns

**Remediation**:
```python
# Check recent latencies
collector = MetricsCollector()
latencies = list(collector.prediction_latencies)[-100:]
print(f"Last 100 latencies: mean={np.mean(latencies):.2f}ms")

# Check for outliers
outliers = [l for l in latencies if l > 200]
print(f"Outliers (>200ms): {len(outliers)}")

# If database issue, check connection pool
# If external API issue, check rate limits
# If Snowflake issue, verify threshold calculation cache
```

**Escalation**: If latency >500ms for >5 minutes, escalate to engineering

#### Error Rate Threshold Exceeded

**Alert**: `error_rate_threshold_exceeded`

**Investigation Steps**:
1. Check error types breakdown
2. Review recent error logs
3. Check for pattern in failing transactions
4. Verify external service availability
5. Check model health

**Remediation**:
```python
# Get error breakdown
error_metrics = collector.get_error_metrics()
errors_by_type = error_metrics['error_counts_by_type']
print("Errors by type:")
for error_type, count in errors_by_type.items():
    print(f"  {error_type}: {count}")

# If model errors, check model loading
# If validation errors, check data quality
# If external API errors, check service status
```

**Escalation**: If error rate >20%, escalate immediately

#### Score Drift Detected

**Alert**: `score_drift_detected`

**Investigation Steps**:
1. Review score distribution over time
2. Check for data quality issues
3. Verify model version hasn't changed unexpectedly
4. Check for pattern in drifted scores

**Remediation**:
```python
# Get score distribution
pred_metrics = collector.get_prediction_metrics()
score_stats = pred_metrics['score_stats']
print(f"Mean: {score_stats['mean']:.3f}")
print(f"Std: {score_stats['std']:.3f}")
print(f"P50: {score_stats['p50']:.3f}")
print(f"P95: {score_stats['p95']:.3f}")

# Compare to baseline
# If genuine drift, consider retraining
# If data quality issue, fix upstream
```

**Escalation**: If drift persists >24 hours, escalate to data science team

#### Confidence Drop Detected

**Alert**: `confidence_drop_detected`

**Investigation Steps**:
1. Review confidence distribution
2. Check model agreement (if ensemble)
3. Verify calibration model health
4. Check for unusual feature patterns

**Remediation**:
```python
# Get confidence distribution
confidence_stats = pred_metrics['confidence_stats']
print(f"Mean confidence: {confidence_stats['mean']:.3f}")
print(f"Min confidence: {confidence_stats['min']:.3f}")

# If ensemble disagreement, check individual models
# If calibration issue, verify calibrator loaded
# If feature issue, check feature extraction
```

**Escalation**: If mean confidence <0.5, escalate to data science team

---

## Model Management

### Model Deployment

**Champion Deployment**:
```python
from app.service.feedback.champion_challenger import ChampionChallengerFramework

framework = ChampionChallengerFramework()

# Deploy new champion
result = framework.deploy_champion(
    model_id="fraud_model_v1",
    model_version="1.2.0",
    model_artifact_path="/path/to/model",
    baseline_metrics={
        "precision": 0.92,
        "recall": 0.88,
        "accuracy": 0.90,
        "f1_score": 0.90
    }
)

print(f"Champion deployed: {result['model_id']}")
```

**Challenger Deployment**:
```python
# Deploy challenger for A/B testing
result = framework.deploy_challenger(
    model_id="fraud_model_v2",
    model_version="2.0.0",
    model_artifact_path="/path/to/new/model"
)

print(f"Challenger deployed: {result['model_id']}")
print(f"Traffic split: {framework.traffic_split * 100}%")
```

### Champion Promotion

**Evaluation Criteria**:
- Minimum predictions: 500 (CHAMPION_MIN_CHALLENGER_SAMPLES)
- Improvement threshold: 2% (CHAMPION_PROMOTION_THRESHOLD)
- Evaluation metric: f1_score (CHAMPION_EVALUATION_METRIC)

**Promotion Process**:
```python
# Evaluate promotion
evaluation = framework.evaluate_promotion()
print(f"Decision: {evaluation['decision']}")
print(f"Champion F1: {evaluation.get('champion_metric', 'N/A')}")
print(f"Challenger F1: {evaluation.get('challenger_metric', 'N/A')}")

# If promotion recommended
if evaluation['decision'] == 'promote':
    result = framework.promote_challenger()
    if result['success']:
        print("✓ Challenger promoted to champion")
    else:
        print(f"✗ Promotion failed: {result['message']}")
```

**Post-Promotion**:
1. Monitor new champion for 24 hours
2. Verify performance metrics
3. Check for any anomalies
4. Document promotion in change log

### Model Rollback

**When to Rollback**:
- New model error rate >10%
- New model latency >2x baseline
- SLA violations after deployment
- Critical bugs discovered

**Rollback Procedure**:
1. Stop traffic to problematic model
2. Deploy previous version as champion
3. Investigate root cause
4. Document incident
5. Plan remediation

---

## Performance Tuning

### Threshold Adjustment

**When to Adjust**:
- False positive rate too high
- False negative rate too high
- Alert fatigue (too many alerts)
- Missing critical issues (too few alerts)

**Adjustment Process**:
```bash
# 1. Analyze current performance
# Review feedback metrics
python -c "
from app.service.feedback.feedback_collector import FeedbackCollector
collector = FeedbackCollector()
summary = collector.get_feedback_summary()
print(f'FP rate: {summary[\"metrics\"][\"false_positive_rate\"]:.2%}')
print(f'FN rate: {summary[\"metrics\"][\"false_negative_rate\"]:.2%}')
"

# 2. Update .env file
# Edit thresholds based on analysis
# Example: ALERT_ERROR_RATE_THRESHOLD=0.07

# 3. Restart service to apply changes

# 4. Monitor for 24 hours
```

### Feature Selection Tuning

**Review Frequency**: Monthly

**Process**:
1. Analyze feature importance
2. Identify low-importance features
3. Check for correlated features
4. Update feature selection parameters
5. Retrain models

### Cache Optimization

**Metrics Cache** (Week 10):
- Window size: Adjust METRICS_WINDOW_SIZE based on memory
- Retention: Adjust METRICS_RETENTION_HOURS based on analysis needs

**Feature Cache** (Week 7):
- TTL: Currently 5 minutes, adjust if features stale
- Size: Monitor cache hit rate

**Threshold Cache** (Week 4):
- TTL: Currently 1 hour, increase if Snowflake load too high

---

## Incident Response

### Severity 1 (Critical)

**Definition**: System down, data loss, security breach

**Response Time**: Immediate (page on-call)

**Steps**:
1. Acknowledge incident
2. Assess impact
3. Initiate incident bridge
4. Implement temporary fix
5. Communicate status every 30 minutes
6. Implement permanent fix
7. Post-mortem within 24 hours

### Severity 2 (High)

**Definition**: Major functionality impaired, SLA violations

**Response Time**: Within 1 hour

**Steps**:
1. Acknowledge incident
2. Assess impact
3. Investigate root cause
4. Implement fix
5. Verify resolution
6. Document in incident log

### Severity 3 (Medium)

**Definition**: Minor functionality impaired, workaround available

**Response Time**: Within 4 hours (business hours)

**Steps**:
1. Create ticket
2. Investigate during business hours
3. Implement fix
4. Verify resolution

---

## Maintenance Windows

### Weekly Maintenance

**Time**: Sunday 2:00-4:00 AM (lowest traffic)

**Activities**:
- Model registry cleanup (old versions)
- Log rotation
- Metrics aggregation
- Performance analysis

### Monthly Maintenance

**Time**: First Sunday of month, 2:00-6:00 AM

**Activities**:
- Full system health check
- Database optimization
- Model retraining review
- Configuration audit
- Security patches

---

## Escalation Procedures

### Level 1: Operations Team

**Handles**:
- Routine monitoring
- Alert response (MEDIUM/LOW)
- Standard procedures
- Basic troubleshooting

**Contact**: operations@olorin.ai

### Level 2: Engineering Team

**Handles**:
- Alert response (HIGH/CRITICAL)
- System failures
- Performance issues
- Bug fixes

**Contact**: engineering@olorin.ai

**Escalation Criteria**:
- Latency >500ms for >5 minutes
- Error rate >20%
- System unresponsive
- SLA violations (2+ metrics)

### Level 3: Data Science Team

**Handles**:
- Model performance issues
- Feature engineering
- Calibration problems
- Drift investigation
- Retraining failures

**Contact**: datascience@olorin.ai

**Escalation Criteria**:
- Performance degradation >5%
- Model F1 score <0.85
- Persistent drift (>24 hours)
- Calibration ECE >0.10
- Mean confidence <0.5

### Level 4: Leadership

**Handles**:
- Business impact decisions
- Major incident coordination
- External communication

**Contact**: leadership@olorin.ai

**Escalation Criteria**:
- Severity 1 incidents >2 hours
- Customer-facing outage
- Data breach or security incident
- Regulatory compliance issue

---

## Appendix: Quick Reference

### Health Check Command
```python
python -c "
from app.service.monitoring.sla_tracker import SLATracker
from app.service.monitoring.alerting import AlertingSystem
tracker = SLATracker()
alerting = AlertingSystem()
print('SLAs:', tracker.get_all_slas()['overall_compliant'])
print('Alerts:', len(alerting.get_active_alerts()))
"
```

### Emergency Contacts
- Operations: operations@olorin.ai
- Engineering: engineering@olorin.ai
- Data Science: datascience@olorin.ai
- On-call: oncall@olorin.ai

### Critical Environment Variables
```bash
# Must be set correctly
DATABASE_PROVIDER=snowflake
ENSEMBLE_STRATEGY=weighted_averaging
CHAMPION_EVALUATION_METRIC=f1_score

# Alert thresholds
ALERT_LATENCY_THRESHOLD_MS=200.0
ALERT_ERROR_RATE_THRESHOLD=0.05

# SLA targets
SLA_AVAILABILITY_TARGET=0.999
SLA_LATENCY_P95_TARGET_MS=100.0
SLA_ACCURACY_TARGET=0.95
```
