# Fraud Detection System - Complete Overview

**Version**: 1.0
**Last Updated**: 2025-11-24
**Author**: Gil Klainert

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [System Architecture](#system-architecture)
3. [Implementation Phases](#implementation-phases)
4. [Module Inventory](#module-inventory)
5. [Data Flow](#data-flow)
6. [Configuration Management](#configuration-management)
7. [Performance Metrics](#performance-metrics)
8. [Integration Points](#integration-points)

---

## Executive Summary

The Olorin Fraud Detection System is a comprehensive, production-grade fraud detection platform implementing 52 modules across 11 weeks of development. The system combines pattern recognition, machine learning, real-time monitoring, and continuous learning to provide advanced fraud detection capabilities.

**Key Capabilities:**
- 18 fraud pattern recognizers with >85% recall target
- Dynamic threshold calculation based on percentile analysis
- Multi-window velocity tracking (5min, 15min, 1hr, 24hr)
- Ensemble modeling with 3 ML models + rule-based
- Real-time monitoring with SLA tracking
- Automated retraining with champion/challenger deployment

**System Scale:**
- **Total Modules**: 52 production modules
- **Lines of Code**: ~7,578 lines
- **Environment Variables**: 54 required configuration parameters
- **Compliance**: 100% SYSTEM MANDATE compliant (no defaults, fail-fast)

---

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Transaction Input                            │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│              Phase 1: Pattern Recognition                        │
│  ┌──────────────┬──────────────┬──────────────┬──────────────┐  │
│  │ Fraud        │ Behavioral   │ Temporal     │ Network      │  │
│  │ Patterns (5) │ Patterns (3) │ Patterns (3) │ Patterns (4) │  │
│  └──────────────┴──────────────┴──────────────┴──────────────┘  │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│              Phase 2: Intelligence Layer                         │
│  ┌──────────────┬──────────────┬──────────────────────────────┐ │
│  │ Dynamic      │ Velocity     │ Pattern Adjustments          │ │
│  │ Thresholds   │ Analysis     │ (6 high-impact patterns)     │ │
│  └──────────────┴──────────────┴──────────────────────────────┘ │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│           Phase 3: Model Optimization                            │
│  ┌──────────────┬──────────────┬──────────────────────────────┐ │
│  │ Feature      │ Ensemble     │ Calibration &                │ │
│  │ Engineering  │ Modeling     │ Confidence                   │ │
│  └──────────────┴──────────────┴──────────────────────────────┘ │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│          Phase 4: Production Excellence                          │
│  ┌──────────────┬──────────────┬──────────────────────────────┐ │
│  │ Real-time    │ Feedback     │ Champion/Challenger          │ │
│  │ Monitoring   │ Collection   │ Deployment                   │ │
│  └──────────────┴──────────────┴──────────────────────────────┘ │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Final Risk Score                              │
└─────────────────────────────────────────────────────────────────┘
```

### Component Layers

**Layer 1: Pattern Recognition**
- Fraud Recognizer (5 patterns)
- Behavioral Recognizer (3 patterns)
- Temporal Recognizer (3 patterns)
- Network Recognizer (4 patterns)
- Frequency Recognizer (3 patterns)

**Layer 2: Intelligence**
- Dynamic Threshold Calculator (P90/P70 thresholds)
- Velocity Analyzer (multi-window tracking)
- Pattern Adjustment Engine (6 pattern types)

**Layer 3: ML Models**
- Feature Importance Analyzer
- Feature Selector
- Feature Engineering Pipeline
- Ensemble Model (XGBoost + LightGBM + Rule-based)
- Model Registry & Versioning
- A/B Testing Framework

**Layer 4: Calibration & Confidence**
- Isotonic Calibration
- Confidence Scoring
- Uncertainty Quantification
- Feature Contribution Analysis
- Risk Level Categorization

**Layer 5: Monitoring**
- Metrics Collector (rolling windows)
- Alerting System (4 anomaly types)
- SLA Tracker (availability, latency, accuracy)

**Layer 6: Continuous Learning**
- Feedback Collector (TP/FP/TN/FN/Uncertain)
- Performance Tracker (degradation detection)
- Retraining Pipeline (automated)
- Champion/Challenger Framework

---

## Implementation Phases

### Phase 1: Pattern Recognition (Weeks 1-3)

**Objective**: Implement comprehensive fraud pattern detection with high recall.

**Modules Implemented**: 5 recognizers, 18 patterns total

**Key Patterns**:
- Card Testing Detection
- Velocity Anomalies
- Amount Clustering
- Account Takeover Detection
- Geo-Impossibility
- VPN/Proxy Detection
- BIN Attack Detection

**Success Metrics**:
- ✅ 18 fraud patterns implemented
- ✅ >85% recall target
- ✅ All files < 200 lines

### Phase 2: Intelligence (Weeks 4-6)

**Objective**: Add dynamic intelligence to replace hardcoded thresholds.

**Modules Implemented**: 9 modules

**Key Features**:
- Dynamic thresholds from Snowflake (P90/P70)
- 1-hour caching for performance
- Entity-type specific thresholds
- Multi-window velocity (5min, 15min, 1hr, 24hr)
- Merchant concentration index
- 6 high-impact pattern types (+10% to +25% risk adjustments)

**Success Metrics**:
- ✅ Zero hardcoded thresholds
- ✅ 7-day rolling window analysis
- ✅ 6 pattern adjustments with specific risk impacts

### Phase 3: Model Optimization (Weeks 7-9)

**Objective**: Optimize ML models with feature engineering and calibration.

**Modules Implemented**: 26 modules

**Key Features**:
- Feature importance analysis (Pearson correlation, Cohen's d)
- Correlation analysis (removes features with >0.8 correlation)
- Feature selection with 3-step process
- Ensemble modeling (averaging, weighted, max_score)
- Model registry with versioning
- A/B testing framework
- Isotonic regression calibration
- Confidence intervals with uncertainty quantification
- Feature contribution for explainability

**Success Metrics**:
- ✅ 26 modules, all < 200 lines
- ✅ 19 environment variables (Week 8)
- ✅ 8 environment variables (Week 9)
- ✅ ECE < 0.05 target
- ✅ Confidence accuracy > 90%

### Phase 4: Production Excellence (Weeks 10-11)

**Objective**: Production-grade monitoring and continuous learning.

**Modules Implemented**: 12 modules

**Key Features**:
- Real-time metrics with rolling windows (deque-based)
- 4 alert types (latency, error rate, drift, confidence)
- SLA tracking (availability, latency P95, accuracy)
- Human feedback collection (5 feedback types)
- Performance degradation detection
- Automated retraining pipeline
- Champion/challenger deployment with traffic split

**Success Metrics**:
- ✅ 12 modules, all < 200 lines
- ✅ 27 environment variables (Weeks 10-11)
- ✅ Real-time alerting < 1 minute latency
- ✅ SLA compliance monitoring
- ✅ Automated model promotion

---

## Module Inventory

### Complete Module List (52 modules)

**Week 1-3: Pattern Recognition** (5 modules)
1. `fraud_recognizer.py` - Card testing, velocity anomalies, amount clustering, sequences, refund abuse
2. `behavioral_recognizer.py` - Account takeover, behavioral anomalies, session patterns
3. `temporal_recognizer.py` - Time series anomalies, irregular cadence, time-to-first-transaction
4. `network_recognizer.py` - VPN/proxy, geo-impossibility, ASN anomalies, IP rotation
5. `frequency_recognizer.py` - Entity frequency, BIN attacks, merchant concentration

**Week 4: Dynamic Thresholds** (2 modules)
6. `threshold_calculator.py` - P90/P70 percentile calculation, entity-specific thresholds, caching

**Week 5: Velocity Analysis** (3 modules)
7. `velocity_analyzer.py` - Multi-window velocity tracking
8. `velocity_calculations.py` - Core calculation functions
9. `velocity_utils.py` - Extraction utilities

**Week 6: Pattern Adjustments** (4 modules)
10. `pattern_adjustments.py` - Pattern orchestrator
11. `pattern_detectors_transaction.py` - Card testing, geo-impossibility, BIN attacks
12. `pattern_detectors_behavioral.py` - Time-of-day, new device + high amount, cross-entity linking
13. `pattern_helpers.py` - Extraction and calculation utilities

**Week 7: Feature Engineering** (7 modules)
14. `feature_importance.py` - Feature importance tracking and analysis
15. `feature_selector.py` - 3-step feature selection
16. `feature_engineering.py` - Feature engineering pipeline with caching
17. `feature_statistics.py` - Statistical utilities
18. `feature_extraction_helpers.py` - Transaction field extraction
19. `feature_cache.py` - Cache management
20. `feature_groups.py` - Feature categorization

**Week 8: Ensemble Modeling** (12 modules)
21. `model_base.py` - FraudDetectionModel interface
22. `rule_based_model.py` - Rule-based model wrapper
23. `xgboost_model.py` - XGBoost model
24. `lightgbm_model.py` - LightGBM model
25. `ensemble_strategy.py` - 3 ensemble strategies
26. `ensemble_helpers.py` - Ensemble utilities
27. `ensemble_model.py` - Main ensemble orchestrator
28. `model_registry.py` - Model versioning
29. `registry_storage.py` - Registry persistence
30. `ab_testing.py` - A/B testing framework
31. `experiment_storage.py` - Experiment persistence
32. `experiment_helpers.py` - Variant assignment and statistics

**Week 9: Calibration & Confidence** (7 modules)
33. `calibration.py` - Isotonic calibration
34. `calibration_metrics.py` - Brier score, log loss
35. `confidence_scoring.py` - Confidence intervals
36. `uncertainty_quantification.py` - ECE calculation
37. `explainability.py` - Score explainer
38. `feature_contribution.py` - Contribution calculation
39. `feature_description.py` - Human-readable descriptions

**Week 10: Real-time Monitoring** (5 modules)
40. `metrics_collector.py` - Real-time metrics aggregation
41. `alerting.py` - Anomaly detection and alerts
42. `alert_models.py` - Alert data structures
43. `sla_tracker.py` - SLA monitoring
44. `sla_calculations.py` - SLA utilities

**Week 11: Feedback & Continuous Learning** (7 modules)
45. `feedback_collector.py` - Human feedback collection
46. `performance_tracker.py` - Performance monitoring
47. `retraining_pipeline.py` - Automated retraining
48. `champion_challenger.py` - Champion/challenger deployment
49. `performance_helpers.py` - Performance utilities
50. `retraining_helpers.py` - Retraining utilities
51. `champion_helpers.py` - Champion/challenger utilities

**Pre-existing Analytics Modules** (5 modules - violations fixed)
52. `drift_detector.py` - Data drift detection (PSI, KL divergence)
53. `pipeline_monitor.py` - Pipeline health and SLO tracking
54. `throughput_calculator.py` - Decision throughput metrics
55. `precision_recall.py` - Precision/recall/F1 metrics
56. `explainer.py` - Feature attribution and decision explanations

---

## Data Flow

### Transaction Processing Pipeline

```
1. Transaction Input
   ↓
2. Feature Extraction (advanced_features.py)
   ↓
3. Pattern Recognition (fraud_recognizer, behavioral_recognizer, etc.)
   ↓
4. Dynamic Threshold Calculation (threshold_calculator.py)
   ↓
5. Velocity Analysis (velocity_analyzer.py)
   ↓
6. Pattern Adjustments (pattern_adjustments.py)
   ↓
7. Feature Selection (feature_selector.py)
   ↓
8. Ensemble Prediction (ensemble_model.py)
   ├─ XGBoost Model
   ├─ LightGBM Model
   └─ Rule-based Model
   ↓
9. Calibration (calibration.py)
   ↓
10. Confidence Scoring (confidence_scoring.py)
   ↓
11. Risk Level Categorization
   ↓
12. Metrics Collection (metrics_collector.py)
   ↓
13. SLA Tracking (sla_tracker.py)
   ↓
14. Alerting (alerting.py)
   ↓
15. Final Risk Score Output
```

### Feedback Loop

```
1. Human Review
   ↓
2. Feedback Collection (feedback_collector.py)
   ↓
3. Performance Tracking (performance_tracker.py)
   ↓
4. Degradation Detection
   ↓
5. Retraining Trigger
   ↓
6. Automated Retraining (retraining_pipeline.py)
   ↓
7. Model Validation
   ↓
8. Challenger Deployment (champion_challenger.py)
   ↓
9. A/B Testing
   ↓
10. Champion Promotion (if performance improvement > threshold)
```

---

## Configuration Management

### Environment Variable Organization

**Total Required Variables**: 54

**Week 8 Variables (19)**:
- Model paths (XGBoost, LightGBM)
- Model enablement flags
- Ensemble strategy
- Registry and experiment paths
- Rule-based model configuration

**Week 9 Variables (8)**:
- Calibrator path and minimum samples
- Confidence scoring parameters
- Risk level thresholds

**Week 10 Variables (11)**:
- Metrics window sizes
- Alert thresholds (latency, error rate, drift, confidence)
- SLA targets (availability, latency, accuracy)

**Week 11 Variables (16)**:
- Feedback collection parameters
- Performance tracking parameters
- Retraining pipeline configuration
- Champion/challenger settings

### Configuration Files

**Primary**: `.env` file with all 54 variables
**Documentation**:
- `docs/configuration/week8-9-environment-variables.md`
- `docs/configuration/week10-environment-variables.md`
- `docs/configuration/week11-environment-variables.md`

### Compliance

**SYSTEM MANDATE Compliance**: 100%
- ✅ No hardcoded values
- ✅ No fallback defaults
- ✅ Fail-fast on missing configuration
- ✅ All values externalized to environment variables

---

## Performance Metrics

### Target Metrics

**Pattern Recognition**:
- Recall: >85%
- False Positive Rate: <10%
- Coverage: 18 fraud patterns

**Real-time Monitoring**:
- Alert Latency: <1 minute
- Metrics Collection: Rolling windows (1000-10000 samples)
- SLA Compliance: >99.9% availability

**Model Performance**:
- Calibration ECE: <0.05
- Confidence Accuracy: >90%
- Feature Count Reduction: 20-30%
- Model Performance Improvement: 10-15%

**Continuous Learning**:
- Feedback Incorporation: <24 hours
- Retraining Frequency: Weekly (168 hours)
- Champion Promotion: Based on >2% improvement

---

## Integration Points

### External Systems

**Snowflake**:
- Dynamic threshold calculation
- Historical transaction analysis
- Drift detection
- Pipeline monitoring

**ML Model Storage**:
- XGBoost models: `.json` format
- LightGBM models: `.txt` format
- Calibrators: Pickle format
- Location: `~/.olorin/models/`, `~/.olorin/calibrators/`

**Model Registry**:
- Location: `~/.olorin/model_registry/`
- Format: JSON
- Versioning: Timestamp-based

**A/B Experiments**:
- Location: `~/.olorin/ab_experiments/`
- Format: JSON
- Consistent hashing for variant assignment

### Internal Integration

**Risk Agent Integration**:
- Pattern adjustments applied per-transaction
- Integrated into `risk_agent.py` scoring pipeline
- Risk delta applied after base ML score

**Feature Extraction**:
- Integration with `advanced_features.py`
- Velocity features added to feature set
- Dynamic thresholds used in feature calculation

---

## System Health Indicators

### Green (Healthy)
- All SLAs met
- Error rate <5%
- P95 latency <100ms
- No performance degradation
- Champion model performing well

### Yellow (Warning)
- 1-2 SLAs violated
- Error rate 5-10%
- P95 latency 100-200ms
- Minor performance degradation (2-5%)
- Challenger outperforming by <2%

### Red (Critical)
- 3+ SLAs violated
- Error rate >10%
- P95 latency >200ms
- Significant performance degradation (>5%)
- System failures or data quality issues

---

## Next Steps

For operational procedures, see: [operational-runbook.md](./operational-runbook.md)
For pattern details, see: [pattern-catalog.md](./pattern-catalog.md)
For troubleshooting, see: [troubleshooting-guide.md](./troubleshooting-guide.md)
