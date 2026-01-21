# Fraud Detection Pattern Catalog

**Version**: 1.0
**Last Updated**: 2025-11-24
**Total Patterns**: 24 (18 base patterns + 6 high-impact adjustments)

---

## Table of Contents

1. [Pattern Overview](#pattern-overview)
2. [Fraud Patterns (5)](#fraud-patterns)
3. [Behavioral Patterns (3)](#behavioral-patterns)
4. [Temporal Patterns (3)](#temporal-patterns)
5. [Network Patterns (4)](#network-patterns)
6. [Frequency Patterns (3)](#frequency-patterns)
7. [High-Impact Pattern Adjustments (6)](#high-impact-pattern-adjustments)
8. [Pattern Prioritization](#pattern-prioritization)

---

## Pattern Overview

### Pattern Distribution

| Category | Patterns | Risk Impact | Detection Rate |
|----------|----------|-------------|----------------|
| Fraud | 5 | HIGH | High precision |
| Behavioral | 3 | MEDIUM-HIGH | High recall |
| Temporal | 3 | MEDIUM | Medium precision |
| Network | 4 | HIGH | High precision |
| Frequency | 3 | MEDIUM-HIGH | Medium recall |
| **Adjustments** | 6 | +10% to +25% | Precision boosts |

### Detection Philosophy

**High Recall Strategy**: Target >85% recall
- Prefer false positives over false negatives
- Multiple overlapping patterns for redundancy
- Aggressive thresholds with post-filtering

**Precision Refinement**:
- Pattern adjustments boost high-confidence detections
- Ensemble models reduce false positives
- Calibration improves score reliability

---

## Fraud Patterns

### 1. Card Testing Pattern

**Module**: `fraud_recognizer.py`
**Function**: `detect_card_testing()`

**Description**:
Detects when fraudsters test stolen card numbers with small transactions before making larger purchases.

**Detection Logic**:
```python
# Identifies:
# - Multiple small-amount transactions (< $5)
# - Same card/email in short time window (< 1 hour)
# - Sequential pattern of increasing amounts

Criteria:
- 3+ transactions in 1 hour
- All amounts < $5
- Same card number or email
```

**Risk Indicators**:
- Amount progression: $0.01, $0.50, $1.00, $2.00
- Rapid succession (minutes apart)
- Different merchants
- Auth-only transactions

**False Positive Scenarios**:
- Subscription services with trial periods
- Micro-payments for legitimate services
- Tips or small purchases

**Mitigation**: Check merchant category, transaction description

**Risk Adjustment**: +20% (from Week 6 pattern adjustments)

---

### 2. Velocity Anomaly Pattern

**Module**: `fraud_recognizer.py`
**Function**: `detect_velocity_anomalies()`

**Description**:
Detects unusual transaction frequency that deviates from normal behavior.

**Detection Logic**:
```python
# Identifies:
# - Transaction count significantly above baseline
# - Calculated per entity (email, card, IP)
# - Uses dynamic thresholds (P90)

Criteria:
- Current velocity > P90 threshold
- Time windows: 5min, 15min, 1hr, 24hr
- Entity-specific baselines
```

**Risk Indicators**:
- 10+ transactions in 5 minutes
- 50+ transactions in 1 hour
- Significantly higher than entity's average
- Spread across multiple merchants

**False Positive Scenarios**:
- Black Friday/holiday shopping
- Legitimate high-volume accounts (e.g., businesses)
- Batch processing

**Mitigation**: Check merchant diversity, amount patterns, historical behavior

**Risk Adjustment**: Dynamic based on threshold exceedance

---

### 3. Amount Clustering Pattern

**Module**: `fraud_recognizer.py`
**Function**: `detect_amount_clustering()`

**Description**:
Detects when multiple transactions have suspiciously similar amounts.

**Detection Logic**:
```python
# Identifies:
# - 3+ transactions with amounts within $0.10
# - Within 24-hour window
# - Same entity (email, card, or IP)

Criteria:
- Cluster size ≥ 3 transactions
- Amount variance < $0.10
- Same entity identifier
```

**Risk Indicators**:
- Exact same amount repeated
- Round numbers ($100, $250, $500)
- Just below reporting thresholds ($2,999)

**False Positive Scenarios**:
- Subscription payments
- Recurring bills
- Legitimate repeat purchases

**Mitigation**: Check merchant consistency, time intervals, transaction type

**Risk Adjustment**: Increases with cluster size

---

### 4. Sequence Pattern Detection

**Module**: `fraud_recognizer.py`
**Function**: `detect_suspicious_sequences()`

**Description**:
Detects systematic patterns in transaction sequences.

**Detection Logic**:
```python
# Identifies:
# - Ascending/descending amount patterns
# - Regular time intervals
# - Systematic progression

Criteria:
- 4+ transactions in sequence
- Consistent pattern (arithmetic or geometric)
- Within 6-hour window
```

**Risk Indicators**:
- Amounts: $100, $200, $300, $400 (arithmetic)
- Amounts: $10, $20, $40, $80 (geometric)
- Exactly 1-hour intervals
- Testing limits systematically

**False Positive Scenarios**:
- Payment plans
- Scheduled transfers
- Legitimate bulk purchases

**Mitigation**: Check merchant relationship, transaction descriptions

**Risk Adjustment**: Increases with sequence length

---

### 5. Refund Abuse Pattern

**Module**: `fraud_recognizer.py`
**Function**: `detect_refund_abuse()`

**Description**:
Detects patterns of excessive refunds that may indicate fraud.

**Detection Logic**:
```python
# Identifies:
# - High refund-to-purchase ratio
# - Frequent refund requests
# - Refunds shortly after purchases

Criteria:
- Refund rate > 30%
- 5+ refunds in 30 days
- Average time to refund < 24 hours
```

**Risk Indicators**:
- Immediate refund requests after purchase
- Always same items/merchants
- Refund amounts don't match purchase amounts
- Shipping to different address than billing

**False Positive Scenarios**:
- Legitimate buyer's remorse
- Quality issues with products
- Size/fit problems

**Mitigation**: Check refund reasons, merchant patterns, shipping addresses

**Risk Adjustment**: Increases with refund frequency

---

## Behavioral Patterns

### 6. Account Takeover Pattern

**Module**: `behavioral_recognizer.py`
**Function**: `detect_account_takeover()`

**Description**:
Detects signs of compromised accounts through behavioral changes.

**Detection Logic**:
```python
# Identifies:
# - Sudden change in transaction patterns
# - New device or location
# - Password/email changes followed by transactions
# - Access from unusual IP addresses

Criteria:
- New device + immediate transaction
- Location change > 500 miles
- Account changes in last 24 hours
- IP reputation issues
```

**Risk Indicators**:
- First transaction from new country
- Device fingerprint never seen before
- Shipping address change then purchase
- Multiple failed login attempts then success
- Password reset then high-value purchase

**False Positive Scenarios**:
- Travel (legitimate location changes)
- New device purchase
- Moving to new residence

**Mitigation**: Check user verification status, shipping history, device trust

**Risk Adjustment**: Very high (+25%) for new device + high amount (Week 6)

---

### 7. Behavioral Anomaly Detection

**Module**: `behavioral_recognizer.py`
**Function**: `detect_behavioral_anomalies()`

**Description**:
Detects deviations from established user behavior patterns.

**Detection Logic**:
```python
# Identifies:
# - Unusual purchase categories
# - Abnormal transaction times
# - Changed merchant preferences
# - Spending level changes

Criteria:
- Merchant category never used before
- Transaction at unusual hour (2-5 AM)
- Amount 3x+ normal average
- Rapid succession of different categories
```

**Risk Indicators**:
- Electronics purchase by user who only buys groceries
- 3 AM transactions by daytime-only user
- $2,000 purchase by $50 average user
- Gift cards from account that never bought them

**False Positive Scenarios**:
- Gifts for others
- Lifestyle changes
- Special occasions

**Mitigation**: Check purchase context, communication with user

**Risk Adjustment**: Moderate based on deviation magnitude

---

### 8. Session Pattern Anomalies

**Module**: `behavioral_recognizer.py`
**Function**: `detect_session_anomalies()`

**Description**:
Detects suspicious session behavior patterns.

**Detection Logic**:
```python
# Identifies:
# - Rapid browsing without normal patterns
# - Bot-like behavior
# - Session hijacking indicators
# - Unusual session duration

Criteria:
- Page views > 100 in 5 minutes
- No mouse movement/scrolling
- Session token changes
- Multiple simultaneous sessions from different IPs
```

**Risk Indicators**:
- Instant page loads (no reading time)
- Direct URL access to checkout
- No cart abandonment
- Perfect click-through rate

**False Positive Scenarios**:
- Power users
- Mobile apps with pre-caching
- One-click checkout features

**Mitigation**: Check user agent, device consistency, session history

**Risk Adjustment**: Lower priority pattern

---

## Temporal Patterns

### 9. Time Series Anomaly

**Module**: `temporal_recognizer.py`
**Function**: `detect_time_series_anomalies()`

**Description**:
Detects unusual patterns in transaction timing.

**Detection Logic**:
```python
# Identifies:
# - Transactions at unusual hours
# - Sudden burst after dormancy
# - Clockwork regular patterns (bot-like)

Criteria:
- Transaction at 2-5 AM (unusual for user)
- No activity for 90 days, then 10 transactions
- Exactly every hour on the hour
```

**Risk Indicators**:
- Middle-of-night transactions
- Reactivated dormant account
- Perfectly timed intervals (automated)
- Multiple time zones in quick succession

**False Positive Scenarios**:
- Shift workers
- International travelers
- Automated legitimate payments

**Mitigation**: Check user's normal hours, location

**Risk Adjustment**: +10% for time-of-day anomaly (Week 6)

---

### 10. Irregular Cadence

**Module**: `temporal_recognizer.py`
**Function**: `detect_irregular_cadence()`

**Description**:
Detects when transaction timing suddenly changes.

**Detection Logic**:
```python
# Identifies:
# - Normal pattern then sudden change
# - Regular intervals disrupted
# - Weekend vs weekday pattern breaks

Criteria:
- Standard deviation of intervals changes >50%
- Weekday-only user makes weekend transactions
- Regular monthly payment becomes daily
```

**Risk Indicators**:
- Subscription payment early/late
- Business account active on Sunday 3 AM
- Monthly pattern becomes daily
- Long gaps then sudden clusters

**False Positive Scenarios**:
- Payment date changes
- Business hour changes
- Personal schedule changes

**Mitigation**: Verify with recent account activity

**Risk Adjustment**: Moderate

---

### 11. Time-to-First-Transaction

**Module**: `temporal_recognizer.py`
**Function**: `detect_rapid_first_transaction()`

**Description**:
Detects suspiciously quick transactions after account creation.

**Detection Logic**:
```python
# Identifies:
# - Account created and transaction within minutes
# - No browsing history
# - Immediate high-value purchase

Criteria:
- Account age < 1 hour
- First transaction within 5 minutes
- Amount > $500
```

**Risk Indicators**:
- Account created then $1,000 purchase in 2 minutes
- No email verification
- No browsing history
- Shipping to different country than registration

**False Positive Scenarios**:
- Targeted purchase (user knows exactly what they want)
- Mobile app with saved info
- Corporate accounts

**Mitigation**: Check email verification, shipping address match

**Risk Adjustment**: High for new accounts

---

## Network Patterns

### 12. VPN/Proxy Detection

**Module**: `network_recognizer.py`
**Function**: `detect_vpn_proxy_usage()`

**Description**:
Detects use of VPNs, proxies, or anonymizers.

**Detection Logic**:
```python
# Identifies:
# - Known VPN IP ranges
# - Proxy server indicators
# - Tor exit nodes
# - Data center IPs (non-residential)

Criteria:
- IP matches VPN provider database
- Reverse DNS indicates hosting provider
- High IP abuse score
- Known anonymizer service
```

**Risk Indicators**:
- VPN from high-risk country
- Multiple IPs in single session
- Data center IP for consumer purchase
- Tor exit node

**False Positive Scenarios**:
- Privacy-conscious legitimate users
- Corporate VPNs
- Coffee shop WiFi

**Mitigation**: Check other signals, user history, purchase value

**Risk Adjustment**: Moderate unless combined with other signals

---

### 13. Geo-Impossibility

**Module**: `network_recognizer.py`
**Function**: `detect_geo_impossibility()`

**Description**:
Detects physically impossible location changes.

**Detection Logic**:
```python
# Identifies:
# - Transactions from locations too far apart in too little time
# - Calculation based on straight-line distance and time

Criteria:
- Distance > 500 miles
- Time < 2 hours
- Speed required > 250 mph (commercial flight threshold)
```

**Risk Indicators**:
- New York transaction then London transaction 1 hour later
- Cross-country in 30 minutes
- Different continents same day

**False Positive Scenarios**:
- Shared accounts (family members)
- VPN location mismatch
- Time zone confusion

**Mitigation**: Check if residential IP, device consistency

**Risk Adjustment**: +25% (Week 6 - highest adjustment)

---

### 14. ASN Anomaly Detection

**Module**: `network_recognizer.py`
**Function**: `detect_asn_anomalies()`

**Description**:
Detects unusual Autonomous System Numbers (network providers).

**Detection Logic**:
```python
# Identifies:
# - Hosting provider ASNs (not residential ISPs)
# - High-risk ASNs
# - ASN changes (user normally from one ISP, now different)

Criteria:
- ASN type = hosting/datacenter
- ASN country ≠ billing country
- ASN on abuse list
```

**Risk Indicators**:
- AWS/Azure/GCP IP address
- Hosting provider in Russia/China for US purchase
- Frequent ASN changes
- ASN associated with fraud

**False Positive Scenarios**:
- Legitimate cloud services
- Corporate networks
- Mobile carrier roaming

**Mitigation**: Check ASN reputation, user consistency

**Risk Adjustment**: Moderate

---

### 15. IP Rotation Detection

**Module**: `network_recognizer.py`
**Function**: `detect_ip_rotation()`

**Description**:
Detects rapid IP address changes indicating distributed attacks.

**Detection Logic**:
```python
# Identifies:
# - Multiple IPs in short time window
# - Sequential IP changes
# - Pattern of rotation

Criteria:
- 3+ different IPs in 1 hour
- IPs from different /24 subnets
- Same entity (card, email)
```

**Risk Indicators**:
- 10 different IPs in 30 minutes
- IPs from different countries
- Rotating through IP ranges
- Each IP used once then discarded

**False Positive Scenarios**:
- Mobile user (cell tower handoffs)
- Load-balanced corporate network
- Public WiFi changes

**Mitigation**: Check if IPs in same geographic area, carrier

**Risk Adjustment**: Moderate to high

---

## Frequency Patterns

### 16. Entity Frequency Anomaly

**Module**: `frequency_recognizer.py`
**Function**: `detect_entity_frequency_anomaly()`

**Description**:
Detects when an entity (email, card, IP) appears unusually frequently.

**Detection Logic**:
```python
# Identifies:
# - Entity frequency exceeds normal baseline
# - Uses dynamic P90 thresholds
# - Per entity type (email, card, IP, device)

Criteria:
- Current frequency > P90 threshold
- Time window: 24 hours
- Per entity type
```

**Risk Indicators**:
- Email used in 100+ transactions (normal max 10)
- Card used 50 times in 1 day
- IP address in 200 transactions
- Same device fingerprint across many accounts

**False Positive Scenarios**:
- Shared accounts (family plan)
- Business accounts
- Public computers/IPs

**Mitigation**: Check account type, merchant patterns

**Risk Adjustment**: Based on threshold exceedance

---

### 17. BIN Attack Detection

**Module**: `frequency_recognizer.py`
**Function**: `detect_bin_attack()`

**Description**:
Detects when fraudsters test many card numbers from same BIN.

**Detection Logic**:
```python
# Identifies:
# - Many different card numbers with same BIN (first 6-8 digits)
# - Sequential card number patterns
# - High failure rate

Criteria:
- 5+ different cards, same BIN
- Within 1 hour
- 50%+ failure rate
```

**Risk Indicators**:
- BIN 411111: Card XXXX 0001, XXXX 0002, XXXX 0003
- Sequential last 4 digits
- Mostly declined transactions
- Small amounts (<$10)

**False Positive Scenarios**:
- Corporate card programs (legitimately same BIN)
- Family members with cards from same bank

**Mitigation**: Check if all approvals, merchant legitimacy

**Risk Adjustment**: +15% (Week 6), very high confidence pattern

---

### 18. Merchant Concentration

**Module**: `frequency_recognizer.py`
**Function**: `detect_merchant_concentration()`

**Description**:
Detects unusual focus on specific merchants.

**Detection Logic**:
```python
# Identifies:
# - High percentage of transactions to single merchant
# - Unusual for entity's history
# - May indicate gift card fraud

Criteria:
- >80% of transactions to one merchant in 24 hours
- 10+ transactions
- New merchant for this entity
```

**Risk Indicators**:
- 20 transactions, all to Amazon gift cards
- All transactions to prepaid card merchants
- New user, 100% transactions to cryptocurrency exchange
- Single merchant after diverse history

**False Positive Scenarios**:
- Bulk purchase from favorite store
- Business procurement
- Legitimate gift purchases

**Mitigation**: Check merchant type, amounts, shipping

**Risk Adjustment**: Higher for gift cards, cryptocurrency

---

## High-Impact Pattern Adjustments

### Week 6 Pattern Adjustments (Applied After Base Score)

These patterns provide additional risk adjustments on top of the base ML score and initial pattern detection.

#### 19. Card Testing Adjustment

**Risk Impact**: +20%
**Detection**: Card testing pattern confirmed (Week 6 detector)
**Applied When**: High confidence card testing detected
**Logic**: More aggressive than base fraud recognizer detection

---

#### 20. Geo-Impossibility Adjustment

**Risk Impact**: +25% (highest adjustment)
**Detection**: Physical impossibility confirmed
**Applied When**: Verified geo-impossibility with distance/time calculation
**Logic**: Strongest signal of account compromise

---

#### 21. BIN Attack Adjustment

**Risk Impact**: +15%
**Detection**: Sequential card testing from same BIN
**Applied When**: 5+ cards from same BIN with high failure rate
**Logic**: Automated attack pattern

---

#### 22. Time-of-Day Anomaly Adjustment

**Risk Impact**: +10%
**Detection**: Transaction at highly unusual hour for user
**Applied When**: 2-5 AM transaction for daytime-only user
**Logic**: Possible account compromise

---

#### 23. New Device + High Amount Adjustment

**Risk Impact**: +12%
**Detection**: First transaction from new device AND amount >$500
**Applied When**: Device fingerprint never seen AND high value
**Logic**: Common account takeover pattern

---

#### 24. Cross-Entity Linking Adjustment

**Risk Impact**: +18%
**Detection**: Multiple entities link to known fraud
**Applied When**: Email, IP, or device matches previously confirmed fraud
**Logic**: Fraud network detection

---

## Pattern Prioritization

### Tier 1: Highest Confidence (Immediate Action)

1. **Geo-Impossibility** (+25%) - Physical impossibility
2. **Card Testing** (+20%) - Clear fraud indicator
3. **Cross-Entity Linking** (+18%) - Known fraud network
4. **BIN Attack** (+15%) - Automated attack

**Action**: Automatically block or require strong authentication

### Tier 2: High Risk (Enhanced Review)

5. **Account Takeover** - Behavioral change indicators
6. **New Device + High Amount** (+12%) - Suspicious combination
7. **Merchant Concentration** - Gift card/crypto focus
8. **Velocity Anomalies** - Unusual frequency

**Action**: Manual review queue, additional verification

### Tier 3: Medium Risk (Monitor)

9. **Time-of-Day Anomaly** (+10%) - Timing suspicious
10. **Amount Clustering** - Repeated amounts
11. **IP Rotation** - Network manipulation
12. **VPN/Proxy** - Anonymization

**Action**: Track, escalate if combined with other signals

### Tier 4: Low Risk (Context-Dependent)

13. **Behavioral Anomalies** - Deviation from norm
14. **Session Anomalies** - Bot-like behavior
15. **Temporal Anomalies** - Timing changes
16. **Entity Frequency** - High volume

**Action**: Log for pattern analysis, no immediate action

---

## Pattern Combination Logic

### Additive Risk

Patterns stack additively up to a maximum total risk score of 1.0:

```
Base ML Score: 0.65
+ Card Testing Adjustment: +0.20
+ Geo-Impossibility: +0.25 (capped to prevent >1.0)
= Final Score: 1.0 (HIGH RISK)
```

### Pattern Overlap

Some patterns naturally overlap and should not be double-counted:
- Velocity Anomaly + Entity Frequency (both measure transaction count)
- Card Testing + BIN Attack (both measure card number patterns)
- VPN Detection + ASN Anomaly (both measure network)

### Minimum Evidence

Require 3+ pattern matches for high-confidence fraud prediction to reduce false positives.

---

## Pattern Tuning Guidelines

### Adjusting Thresholds

**Too Many False Positives**:
- Increase minimum transaction count (e.g., 3 → 5)
- Tighten time windows (e.g., 1 hour → 30 minutes)
- Increase percentage thresholds

**Too Many False Negatives**:
- Decrease minimum transaction count
- Widen time windows
- Decrease percentage thresholds

### Seasonal Adjustments

**Holiday Season**:
- Relax velocity thresholds (more transactions normal)
- Adjust time-of-day patterns (late-night shopping)
- Account for gift purchases (new merchants)

**Back-to-School**:
- Different merchant categories expected
- Higher volumes from parents

### Regional Differences

Different patterns may have different significance by region:
- VPN usage more common in privacy-conscious regions
- Time-of-day patterns vary by culture
- Payment methods vary by country

---

## Pattern Documentation Maintenance

**Review Frequency**: Quarterly

**Update Triggers**:
- New fraud schemes discovered
- Pattern performance degradation
- False positive/negative rate changes
- Regulatory requirements

**Ownership**: Data Science Team

**Approval**: Security Team + Operations Team
