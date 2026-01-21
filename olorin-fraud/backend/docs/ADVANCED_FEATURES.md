# Advanced Features, Calibration & Precision Optimization

## Overview

This document describes the advanced feature engineering, calibration, and precision optimization features implemented to improve fraud detection precision.

## Feature Engineering (`advanced_features.py`)

### 1. Entity-Scoped Velocity

Calculates transaction velocity metrics scoped by entity:

- **`tx_per_5min_by_email`**: Maximum transactions per 5 minutes by email
- **`tx_per_5min_by_device`**: Maximum transactions per 5 minutes by device_id
- **`tx_per_5min_by_ip`**: Maximum transactions per 5 minutes by ip_address
- **`merchant_local_velocity`**: Maximum transactions per 5 minutes by merchant_id

**Usage**: Helps detect velocity bursts at entity level rather than global level, reducing false positives from legitimate high-volume users.

### 2. Geovelocity Features

Converts impossible travel detection to numeric features:

- **`max_travel_speed_mph`**: Maximum travel speed in MPH
- **`avg_travel_speed_mph`**: Average travel speed in MPH
- **`impossible_travel_count`**: Number of impossible travel instances (>600 mph)
- **`total_distance_km`**: Total distance traveled
- **`distance_anomaly_score`**: Normalized anomaly score (0-1) based on travel speed

**Usage**: Provides granular geovelocity signals instead of binary flags, enabling better calibration.

### 3. Amount Micro-Patterns

Detects suspicious amount patterns:

- **`near_threshold_amount_count`**: Count of transactions in threshold bins ($998-$1000, $499-$501, $99-$101)
- **`burst_within_bin_ratio`**: Ratio of bursts (multiple same-amount tx within 5min) to total transactions
- **`amount_clustering_score`**: Normalized clustering score (0-1)

**Usage**: Identifies threshold-avoidance patterns and amount clustering that indicate fraud.

### 4. Device/IP Stability

Measures device and IP rotation:

- **`devices_per_email_14d`**: Number of unique devices per email in 14 days
- **`ips_per_device_14d`**: Number of unique IPs per device in 14 days
- **`user_agents_per_device`**: Number of unique user agents per device
- **`device_instability_score`**: Normalized instability score (0-1)

**Usage**: Detects account takeover patterns and device/IP rotation anomalies.

### 5. Merchant Consistency

Measures merchant diversity and decision patterns:

- **`single_merchant_concentration`**: Ratio of transactions to single merchant
- **`unknown_decision_ratio`**: Ratio of UNKNOWN decisions
- **`merchant_diversity_score`**: Normalized diversity score (0-1)

**Usage**: Identifies single-merchant concentration and decision anomalies.

## Calibration (`calibration.py`)

### Rule-Overrides

#### Clean-Intel Veto

Down-weights risk when IP reputation is clean (VERY_LOW/MINIMAL/LOW) and no high-weight features fire.

**Conditions**:
- IP reputation is clean
- No high-weight features (velocity, geovelocity, amount patterns, device instability, high domain risk)
- Risk score < 0.3

**Action**: Reduce risk score by 50%

**Usage**: Reduces false positives when behavioral anomalies are detected but IP intelligence is clean.

#### Impossible Travel Hard Block

Hard blocks transactions with impossible travel speeds (>800 mph).

**Conditions**:
- Max travel speed > 800 mph

**Action**: Set risk score to 0.95 (very high risk)

**Usage**: Catches clear fraud cases with impossible travel patterns.

### Calibration Functions

- **`calibrate_risk_score()`**: Placeholder for future model-based calibration
- **`optimize_precision_at_k()`**: Selects top-k transactions and calculates precision

## Precision Optimization (`precision_optimizer.py`)

### Functions

1. **`optimize_precision_at_k()`**: Optimizes precision @ k by selecting top-k transactions
2. **`find_optimal_threshold()`**: Finds optimal threshold that maximizes precision while maintaining minimum recall
3. **`calculate_precision_recall_curve()`**: Calculates precision-recall curve for threshold optimization

## Integration

### Per-Transaction Scoring Flow

1. **Extract Advanced Features**: Once per investigation (entity-scoped features need full transaction context)
2. **Calculate Base Feature Score**: Normalized average of amount, merchant, device, location (60% weight)
3. **Calculate Advanced Feature Score**: Weighted combination of velocity, geovelocity, amount patterns, device stability, merchant consistency (40% weight)
4. **Combine Scores**: `feature_score = 0.6 * base_score + 0.4 * advanced_score`
5. **Calculate Domain Score**: Confidence-weighted average of matched domain findings
6. **Calculate Transaction Score**: `tx_score = 0.6 * feature_score + 0.4 * domain_score`
7. **Apply Rule-Overrides**: Clean-intel veto, impossible travel hard block
8. **Validate Score**: Ensure score is in [0, 1] range

## Configuration

### Environment Variables

```bash
# Rule-override thresholds (in calibration.py)
CLEAN_INTEL_VETO_THRESHOLD=0.3  # Risk score threshold for clean-intel veto
IMPOSSIBLE_TRAVEL_HARD_BLOCK_THRESHOLD=800.0  # MPH threshold for hard block
```

### Feature Weights

Advanced features are weighted as follows:
- Velocity: 25% of advanced score
- Geovelocity: 25% of advanced score
- Amount patterns: 20% of advanced score
- Device stability: 15% of advanced score
- Merchant consistency: 15% of advanced score

## Usage Example

```python
from app.service.agent.orchestration.domain_agents.advanced_features import extract_all_advanced_features
from app.service.agent.orchestration.domain_agents.calibration import apply_rule_overrides

# Extract advanced features
advanced_features = extract_all_advanced_features(
    transactions,
    entity_type="email",
    entity_value="user@example.com"
)

# Apply rule-overrides
final_score, applied_rules = apply_rule_overrides(
    base_score=0.5,
    ip_reputation="VERY_LOW",
    advanced_features=advanced_features,
    domain_findings=domain_findings
)
```

## Performance Considerations

- Advanced features are extracted once per investigation (not per transaction)
- Entity-scoped features require full transaction context
- Batch processing maintains efficiency for large transaction volumes
- Timeout handling ensures completion within investigation timeout

## Future Enhancements

1. **Model-Based Calibration**: Train gradient-boosted tree or logistic regression on historical data
2. **Platt/Isotonic Calibration**: Ensure "0.5" means "~50% fraud"
3. **Feature Selection**: Automatically select most predictive features
4. **Online Learning**: Update calibration based on recent performance

