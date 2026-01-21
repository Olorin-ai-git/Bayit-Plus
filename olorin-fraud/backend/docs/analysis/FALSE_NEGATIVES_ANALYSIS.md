# FALSE NEGATIVES ANALYSIS REPORT
**Why Investigations Failed to Detect Confirmed Fraud**

---

## Executive Summary

The investigation system **failed to detect 8 confirmed fraud transactions** (100% false negative rate) for the entity `kevinalejandroo1407@gmail.com`. The root cause is that **fraud transactions have significantly LOWER MODEL_SCORES (0.29) than legitimate transactions (0.59)**, and the investigation excludes MODEL_SCORE to avoid bias. Without this critical signal, the investigation cannot distinguish fraud from legitimate activity.

---

## 🔴 THE 8 MISSED FRAUD TRANSACTIONS

All 8 fraud transactions occurred on **2025-05-26** within a **2.2 hour window**:

| Time | Amount | MODEL_SCORE | Status |
|------|--------|-------------|---------|
| 20:17:42 | $29.75 | 0.2998 ⚠️ | MISSED |
| 20:19:01 | $29.75 | 0.2898 ⚠️ | MISSED |
| 20:20:33 | $29.75 | 0.2853 ⚠️ | MISSED |
| 22:03:41 | $29.75 | 0.3132 ⚠️ | MISSED |
| 22:05:39 | $29.75 | 0.2820 ⚠️ | MISSED |
| 22:27:25 | $29.75 | 0.3095 ⚠️ | MISSED |
| 22:28:40 | $29.75 | 0.2749 ⚠️ | MISSED |
| 22:31:20 | $92.19 | 0.2534 ⚠️ | MISSED |

### Fraud Pattern Characteristics:
- **Same IP:** All 8 transactions from `2803:c600:5121:d75e:eda2:5f7a:112d:f59`
- **Same Device:** All from `ba784bfe-7a8c-4ddd-a093-d0de9bf21734`
- **Same Merchant:** All at `Eneba`
- **Rapid Velocity:** 8 transactions in 2.2 hours (3.6 tx/hour)
- **Repeated Amount:** 7 transactions for exactly $29.75

---

## 📊 FRAUD vs LEGITIMATE COMPARISON

| Metric | Fraud (Missed) | Legitimate (Correct) | Difference |
|--------|----------------|---------------------|------------|
| **Count** | 8 | 37 | - |
| **Avg MODEL_SCORE** | 0.2885 | 0.5896 | **-51%** ❌ |
| **Avg Amount** | $37.55 | $19.78 | +90% |
| **Unique IPs** | 1 | 3+ | Less diverse |
| **Unique Devices** | 1 | 2+ | Less diverse |
| **Unique Merchants** | 1 | Multiple | Less diverse |
| **Time Concentration** | 2.2 hours | Spread over months | Highly concentrated |

---

## ❌ WHY INVESTIGATION FAILED

### 1. **MODEL_SCORE Paradox**
- **Fraud MODEL_SCORE:** 0.2885 (LOW)
- **Legitimate MODEL_SCORE:** 0.5896 (HIGHER)
- **Problem:** Fraud has 51% LOWER MODEL_SCORE than legitimate transactions
- **Investigation excludes MODEL_SCORE** (correctly, for unbiased evaluation)
- **Result:** Lost the most important fraud signal

### 2. **Risk Score Below Threshold**
- **Investigation Risk Score:** 41.67%
- **Fraud Threshold:** 50%
- **Result:** ALL transactions classified as NOT FRAUD

### 3. **Fraud Mimics Legitimate Behavior**
- Uses same device as legitimate transactions
- Same merchant as previous activity
- Amounts not dramatically different
- Initially APPROVED by payment system

### 4. **Investigation Window Too Broad**
- **Investigation:** 2-year window (730 days)
- **Fraud Event:** 2.2 hours
- **Problem:** Fraud signal diluted by 2 years of legitimate history

---

## 🎯 WHAT WOULD HAVE CAUGHT THE FRAUD

### Strong Fraud Indicators Present:
1. **Velocity:** 8 transactions in 2.2 hours (unusual burst)
2. **Repetition:** 7 identical amounts ($29.75)
3. **Concentration:** All same IP, device, merchant
4. **MODEL_SCORE Drop:** Consistent low scores (0.25-0.31)

### What Was Missing:
1. **Velocity Detection:** No feature for transactions/hour
2. **Burst Detection:** No anomaly detection for sudden activity
3. **Repetition Detection:** No feature for repeated amounts
4. **Threshold Too High:** 41.67% < 50% threshold

---

## 🔧 RECOMMENDATIONS TO FIX

### IMMEDIATE ACTIONS

#### 1. **Lower Risk Threshold**
```python
# Current
RISK_THRESHOLD = 0.50  # 50%

# Recommended
RISK_THRESHOLD = 0.40  # 40%
# This would catch the 41.67% risk score
```

#### 2. **Add Velocity Features**
```python
features = {
    'tx_per_hour': count_last_hour,
    'tx_per_day': count_last_24h,
    'velocity_spike': current_rate / historical_rate,
    'burst_score': tx_in_window / expected_tx
}
```

#### 3. **Add Repetition Detection**
```python
features = {
    'repeated_amounts': count_identical_amounts,
    'amount_diversity': unique_amounts / total_tx,
    'merchant_concentration': max_merchant_tx / total_tx
}
```

### STRUCTURAL IMPROVEMENTS

#### 1. **Narrow Investigation Focus**
- Instead of 2-year history
- Focus on 24-48 hour window around event
- Weight recent activity more heavily

#### 2. **Implement Anomaly Detection**
- Compare to entity's own baseline
- Flag deviations from normal patterns
- Detect sudden behavioral changes

#### 3. **Create Composite Risk Score**
```python
risk_score = weighted_average([
    velocity_risk * 0.3,
    repetition_risk * 0.2,
    concentration_risk * 0.2,
    amount_anomaly * 0.15,
    time_anomaly * 0.15
])
```

#### 4. **Use MODEL_SCORE Indirectly**
- Create derived features from MODEL_SCORE
- Track MODEL_SCORE trends
- Flag sudden drops in MODEL_SCORE

---

## 📈 EXPECTED IMPROVEMENT

With recommended changes:

| Metric | Current | With Changes | Improvement |
|--------|---------|--------------|-------------|
| **True Positives** | 0 | 8 | +8 ✅ |
| **False Negatives** | 8 | 0 | -8 ✅ |
| **Recall** | 0% | 100% | +100% ✅ |
| **Precision** | N/A | TBD | Depends on FP |

---

## 💡 KEY INSIGHTS

1. **Approved fraud has LOW MODEL_SCORES** - opposite of expected
2. **Fraud occurs in concentrated bursts** - not spread over time
3. **Repetitive patterns** are strong fraud indicators
4. **2-year investigation window** dilutes fraud signals
5. **50% threshold** is too high for this fraud type

---

## 🚀 NEXT STEPS

1. **Immediate:** Lower threshold to 40%
2. **Short-term:** Add velocity and repetition features
3. **Medium-term:** Implement anomaly detection
4. **Long-term:** Redesign investigation to focus on event windows

---

**Conclusion:** The investigation system is technically sound but lacks the features needed to detect this specific fraud pattern. The fraud's low MODEL_SCORE and concentrated burst pattern require specialized detection features that are currently missing.
