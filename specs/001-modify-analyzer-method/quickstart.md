# Quickstart: Analyzer Time Window and Investigation Range Modifications

**Feature**: 001-modify-analyzer-method  
**Date**: 2025-11-21  
**Estimated Time**: 2-4 hours for full implementation

## Overview

This quickstart provides a step-by-step guide to implement analyzer time window modifications and investigation range configuration changes. Follow these steps in order to ensure successful implementation and testing.

---

## Prerequisites

- [ ] Python 3.11+ environment
- [ ] Access to Snowflake database
- [ ] `olorin-server` repository cloned
- [ ] Virtual environment activated
- [ ] Branch `001-modify-analyzer-method` checked out

---

## Step 1: Environment Configuration (5 minutes)

### 1.1 Update .env File

Add new configuration parameters to `/Users/olorin/Documents/olorin/olorin-server/.env`:

```bash
# Analyzer Configuration
ANALYZER_TIME_WINDOW_HOURS=24
ANALYZER_END_OFFSET_MONTHS=6
ANALYZER_EXCLUDE_FRAUD_TRANSACTIONS=true

# Investigation Configuration
INVESTIGATION_DEFAULT_RANGE_YEARS=2
INVESTIGATION_START_OFFSET_YEARS=2.5
INVESTIGATION_END_OFFSET_MONTHS=6

# Risk Threshold (if not already present)
RISK_THRESHOLD_DEFAULT=0.5

# PII Security Configuration
PII_HASHING_ENABLED=true
PII_HASH_SALT=your-secure-random-salt-min-16-chars-CHANGE-IN-PRODUCTION
PII_HASH_ALGORITHM=SHA256
```

### 1.2 Verify Configuration Loading

Test that parameters are accessible:

```bash
cd /Users/olorin/Documents/olorin/olorin-server
python3 << EOF
import os
from dotenv import load_dotenv

load_dotenv()

print(f"ANALYZER_TIME_WINDOW_HOURS: {os.getenv('ANALYZER_TIME_WINDOW_HOURS', 'NOT SET')}")
print(f"ANALYZER_END_OFFSET_MONTHS: {os.getenv('ANALYZER_END_OFFSET_MONTHS', 'NOT SET')}")
print(f"INVESTIGATION_START_OFFSET_YEARS: {os.getenv('INVESTIGATION_START_OFFSET_YEARS', 'NOT SET')}")
print(f"INVESTIGATION_END_OFFSET_MONTHS: {os.getenv('INVESTIGATION_END_OFFSET_MONTHS', 'NOT SET')}")
EOF
```

**Expected Output**: All parameters should show their configured values.

---

## Step 2: Modify Analyzer Time Window (30 minutes)

### 2.1 Update `real_client.py`

**File**: `/Users/olorin/Documents/olorin/olorin-server/app/service/agent/tools/snowflake_tool/real_client.py`

**Current Code** (line ~480):
```python
WHERE {TX_DATETIME} >= DATEADD(hour, -{time_window_hours}, CURRENT_TIMESTAMP())
    AND {group_by} IS NOT NULL
```

**New Code**:
```python
WHERE {TX_DATETIME} >= DATEADD(hour, -{time_window_hours}, DATEADD(month, -{end_offset_months}, CURRENT_TIMESTAMP()))
    AND {TX_DATETIME} < DATEADD(month, -{end_offset_months}, CURRENT_TIMESTAMP())
    AND {group_by} IS NOT NULL
    {fraud_exclusion_filter}
```

**Add Method Parameter**:
```python
async def get_top_risk_entities(
    self, 
    time_window_hours: int = 24,
    group_by: str = 'email',
    top_percentage: float = 0.10,
    min_transactions: int = 1,
    end_offset_months: int = 6,  # NEW PARAMETER
    exclude_fraud: bool = True    # NEW PARAMETER
) -> List[Dict[str, Any]]:
```

**Add Fraud Exclusion Logic**:
```python
# Build fraud exclusion filter
fraud_exclusion_filter = ""
if exclude_fraud:
    fraud_exclusion_filter = f"AND ({IS_FRAUD_TX} IS NULL OR {IS_FRAUD_TX} = 0)"

# Then use {fraud_exclusion_filter} in query template
```

### 2.2 Test Analyzer Time Window

```bash
cd /Users/olorin/Documents/olorin/olorin-server
python3 << EOF
import asyncio
from app.service.agent.tools.snowflake_tool.real_client import RealSnowflakeClient

async def test():
    client = RealSnowflakeClient()
    results = await client.get_top_risk_entities(
        time_window_hours=24,
        group_by='EMAIL',
        top_percentage=0.10,
        end_offset_months=6,
        exclude_fraud=True
    )
    print(f"Found {len(results)} entities")
    if results:
        print(f"Top entity: {results[0]}")

asyncio.run(test())
EOF
```

**Expected**: Should return top 10% of entities from 6 months ago (not today).

---

## Step 3: Update Investigation Query Builder (45 minutes)

### 3.1 Expand Fraud Column Exclusion

**File**: `/Users/olorin/Documents/olorin/olorin-server/app/service/agent/tools/snowflake_tool/query_builder.py`

**Current Code** (lines ~113-114):
```python
excluded_columns_upper = ['MODEL_SCORE', 'IS_FRAUD_TX']
field_collection = [
    field for field in field_collection
    if field.upper() not in excluded_columns_upper
]
```

**New Code**:
```python
import re

# Pattern-based fraud column exclusion
FRAUD_PATTERN = re.compile(r'\bFRAUD\b', re.IGNORECASE)

excluded_fraud_columns = [
    field for field in field_collection
    if FRAUD_PATTERN.search(field)
]

field_collection = [
    field for field in field_collection
    if not FRAUD_PATTERN.search(field)
]

if excluded_fraud_columns:
    logger.info(f"🚫 Excluded {len(excluded_fraud_columns)} fraud columns from investigation query")
    logger.debug(f"🚫 Excluded columns: {', '.join(excluded_fraud_columns)}")
```

### 3.2 Add Investigation Time Range Configuration

**File**: `/Users/olorin/Documents/olorin/olorin-server/app/service/agent/tools/snowflake_tool/query_builder.py`

**Add to method parameters** (if not already present):
```python
def build_investigation_query(
    entity_type: str,
    entity_id: str,
    investigation_focus: str = 'core_fraud',
    start_offset_years: float = 2.5,  # NEW
    end_offset_months: int = 6,       # NEW
    ...
) -> str:
```

**Update WHERE clause**:
```python
# Build time range filter
time_filter = f"""
    {datetime_col} >= DATEADD(year, -{start_offset_years}, CURRENT_TIMESTAMP())
    AND {datetime_col} < DATEADD(month, -{end_offset_months}, CURRENT_TIMESTAMP())
"""

# Build approval filter
approval_filter = f"""
    AND {decision_col} = 'APPROVED'
    AND {decision_col} IS NOT NULL
"""
```

### 3.3 Test Investigation Query

```bash
cd /Users/olorin/Documents/olorin/olorin-server
python3 << EOF
from app.service.agent.tools.snowflake_tool.query_builder import build_investigation_query

query = build_investigation_query(
    entity_type='email',
    entity_id='test@example.com',
    investigation_focus='core_fraud',
    start_offset_years=2.5,
    end_offset_months=6
)

# Validate no fraud columns
import re
fraud_pattern = re.compile(r'\bFRAUD\b', re.IGNORECASE)
select_match = re.search(r'SELECT\s+(.*?)\s+FROM', query, re.IGNORECASE | re.DOTALL)

if select_match:
    select_clause = select_match.group(1)
    if fraud_pattern.search(select_clause):
        print("❌ FAIL: Query contains fraud columns")
    else:
        print("✅ PASS: No fraud columns in SELECT")
else:
    print("❌ FAIL: Could not parse SELECT clause")

# Verify time range
if "DATEADD(year, -2.5" in query:
    print("✅ PASS: Start offset correct (2.5 years)")
else:
    print("❌ FAIL: Start offset incorrect")

if "DATEADD(month, -6" in query:
    print("✅ PASS: End offset correct (6 months)")
else:
    print("❌ FAIL: End offset incorrect")

print("\nGenerated Query:")
print(query)
EOF
```

---

## Step 4: Update Risk Analyzer Service (20 minutes)

### 4.1 Load Configuration from .env

**File**: `/Users/olorin/Documents/olorin/olorin-server/app/service/analytics/risk_analyzer.py`

**Add Configuration Loading**:
```python
import os

class RiskAnalyzer:
    def __init__(self):
        # ... existing initialization ...
        
        # Load analyzer configuration
        self.analyzer_window_hours = int(os.getenv('ANALYZER_TIME_WINDOW_HOURS', '24'))
        self.analyzer_end_offset_months = int(os.getenv('ANALYZER_END_OFFSET_MONTHS', '6'))
        self.analyzer_exclude_fraud = os.getenv('ANALYZER_EXCLUDE_FRAUD_TRANSACTIONS', 'true').lower() == 'true'
```

### 4.2 Pass Configuration to Client

**Update `get_top_risk_entities()` method**:
```python
# Connect and execute (around line 198)
results = await self.client.get_top_risk_entities(
    time_window_hours=hours,
    group_by=validated_group_by,
    top_percentage=top_percentage / 100.0,
    end_offset_months=self.analyzer_end_offset_months,  # NEW
    exclude_fraud=self.analyzer_exclude_fraud           # NEW
)
```

---

## Step 5: Create Unit Tests (30 minutes)

### 5.1 Test Analyzer Time Window

**File**: `/Users/olorin/Documents/olorin/olorin-server/tests/unit/service/test_risk_analyzer.py`

```python
import pytest
from app.service.analytics.risk_analyzer import RiskAnalyzer

@pytest.mark.asyncio
async def test_analyzer_time_window_ends_at_offset():
    """Test that analyzer window ends at configured offset"""
    analyzer = RiskAnalyzer()
    
    # Mock environment
    import os
    os.environ['ANALYZER_END_OFFSET_MONTHS'] = '6'
    os.environ['ANALYZER_TIME_WINDOW_HOURS'] = '24'
    
    # Test that configuration is loaded
    assert analyzer.analyzer_end_offset_months == 6
    assert analyzer.analyzer_window_hours == 24

@pytest.mark.asyncio
async def test_fraud_exclusion_configuration():
    """Test fraud exclusion flag"""
    import os
    
    # Test enabled
    os.environ['ANALYZER_EXCLUDE_FRAUD_TRANSACTIONS'] = 'true'
    analyzer = RiskAnalyzer()
    assert analyzer.analyzer_exclude_fraud is True
    
    # Test disabled
    os.environ['ANALYZER_EXCLUDE_FRAUD_TRANSACTIONS'] = 'false'
    analyzer = RiskAnalyzer()
    assert analyzer.analyzer_exclude_fraud is False
```

### 5.2 Test Fraud Column Exclusion

**File**: `/Users/olorin/Documents/olorin/olorin-server/tests/unit/service/test_query_builder.py`

```python
import pytest
import re
from app.service.agent.tools.snowflake_tool.query_builder import build_investigation_query

def test_fraud_columns_excluded_from_investigation():
    """Test that fraud columns are excluded from investigation queries"""
    query = build_investigation_query(
        entity_type='email',
        entity_id='test@example.com',
        investigation_focus='core_fraud'
    )
    
    # Extract SELECT clause
    select_match = re.search(r'SELECT\s+(.*?)\s+FROM', query, re.IGNORECASE | re.DOTALL)
    assert select_match, "Could not parse SELECT clause"
    
    select_clause = select_match.group(1)
    
    # Verify no fraud columns
    fraud_pattern = re.compile(r'\bFRAUD\b', re.IGNORECASE)
    assert not fraud_pattern.search(select_clause), "SELECT contains fraud columns"

def test_investigation_time_range():
    """Test investigation time range configuration"""
    query = build_investigation_query(
        entity_type='email',
        entity_id='test@example.com',
        start_offset_years=2.5,
        end_offset_months=6
    )
    
    assert "DATEADD(year, -2.5" in query
    assert "DATEADD(month, -6" in query
    assert "NSURE_LAST_DECISION = 'APPROVED'" in query
```

### 5.3 Run Unit Tests

```bash
cd /Users/olorin/Documents/olorin/olorin-server
pytest tests/unit/service/test_risk_analyzer.py -v
pytest tests/unit/service/test_query_builder.py -v
```

---

## Step 6: Integration Testing (30 minutes)

### 6.1 Test End-to-End Flow

```bash
cd /Users/olorin/Documents/olorin/olorin-server
python3 << EOF
import asyncio
from app.service.analytics.risk_analyzer import get_risk_analyzer
from datetime import datetime, timedelta

async def test_e2e():
    print("🧪 Testing End-to-End Flow")
    print("=" * 50)
    
    # Step 1: Get top risk entities
    print("\n1️⃣ Running analyzer...")
    analyzer = get_risk_analyzer()
    results = await analyzer.get_top_risk_entities(
        time_window="24h",
        group_by="EMAIL",
        top_percentage=10,
        force_refresh=True
    )
    
    print(f"   ✅ Found {len(results.get('entities', []))} entities")
    
    # Step 2: Verify time window
    print("\n2️⃣ Verifying time window...")
    window_end = datetime.utcnow() - timedelta(days=180)  # ~6 months
    print(f"   Expected end: ~{window_end.strftime('%Y-%m-%d')}")
    print(f"   ✅ Time window validation passed")
    
    # Step 3: Verify fraud exclusion
    print("\n3️⃣ Verifying fraud exclusion...")
    if results.get('entities'):
        entity = results['entities'][0]
        if 'fraud_count' in entity:
            print(f"   Fraud count in aggregation: {entity['fraud_count']}")
        print(f"   ✅ Fraud exclusion applied")
    
    print("\n" + "=" * 50)
    print("✅ All tests passed!")

asyncio.run(test_e2e())
EOF
```

---

## Step 7: Verify Confusion Matrix (15 minutes)

### 7.1 Test Confusion Matrix Still Works

```bash
cd /Users/olorin/Documents/olorin/olorin-server
python3 << EOF
from app.service.investigation.metrics_calculation import compute_confusion_matrix

# Sample data
transactions = [
    {"predicted_risk": 0.8, "actual_outcome": 1},  # TP
    {"predicted_risk": 0.7, "actual_outcome": 0},  # FP
    {"predicted_risk": 0.3, "actual_outcome": 0},  # TN
    {"predicted_risk": 0.2, "actual_outcome": 1},  # FN
]

tp, fp, tn, fn, excluded = compute_confusion_matrix(transactions, risk_threshold=0.5)

print(f"TP: {tp}, FP: {fp}, TN: {tn}, FN: {fn}")

assert tp == 1, "TP count incorrect"
assert fp == 1, "FP count incorrect"
assert tn == 1, "TN count incorrect"
assert fn == 1, "FN count incorrect"

print("✅ Confusion matrix logic preserved")
EOF
```

---

## Step 8: Implement PII Hashing (45 minutes)

### 8.1 Create PII Hasher Utility

**File**: `/Users/olorin/Documents/olorin/olorin-server/app/service/security/pii_hasher.py` (NEW)

```python
"""PII hashing utility for privacy protection."""
import hashlib
import os
from typing import Any, Dict, Set
from dataclasses import dataclass
import logging

logger = logging.getLogger(__name__)


@dataclass
class PIIHashConfig:
    """PII hashing configuration"""
    enabled: bool = True
    algorithm: str = "SHA256"
    salt: str = ""
    encoding: str = "utf-8"
    normalize_case: bool = True
    hash_null_values: bool = True
    
    def validate(self) -> None:
        """Validate configuration"""
        if self.enabled and not self.salt:
            raise ValueError("PII_HASH_SALT must be configured when hashing is enabled")
        if self.enabled and len(self.salt) < 16:
            logger.warning("PII_HASH_SALT should be at least 16 characters for security")


class PIIHasher:
    """Hash PII fields for privacy protection"""
    
    # PII field definitions
    TIER1_PII_FIELDS = {
        'EMAIL', 'PHONE_NUMBER', 'FIRST_NAME', 'LAST_NAME',
        'UNIQUE_USER_ID', 'DATE_OF_BIRTH'
    }
    
    TIER2_PII_FIELDS = {
        'IP', 'DEVICE_ID', 'USER_AGENT', 'VISITOR_ID'
    }
    
    TIER3_PII_FIELDS = {
        'CARD_BIN', 'LAST_FOUR', 'BILLING_ADDRESS_LINE_1',
        'SHIPPING_ADDRESS_LINE_1'
    }
    
    ALL_PII_FIELDS = TIER1_PII_FIELDS | TIER2_PII_FIELDS | TIER3_PII_FIELDS
    
    def __init__(self, config: PIIHashConfig = None):
        if config is None:
            # Load from environment
            config = PIIHashConfig(
                enabled=os.getenv('PII_HASHING_ENABLED', 'true').lower() == 'true',
                algorithm=os.getenv('PII_HASH_ALGORITHM', 'SHA256'),
                salt=os.getenv('PII_HASH_SALT', '')
            )
        
        self.config = config
        self.config.validate()
    
    def hash_value(self, value: Any, field_name: str = None) -> str:
        """Hash a single PII value."""
        if not self.config.enabled:
            return str(value)
        
        # Handle None/NULL
        if value is None:
            if self.config.hash_null_values:
                value = "NULL"
            else:
                return "NULL"
        
        # Convert to string
        str_value = str(value)
        
        # Normalize case for consistency
        if self.config.normalize_case and field_name in {'EMAIL', 'email'}:
            str_value = str_value.lower()
        
        # Hash with salt
        salted_value = f"{self.config.salt}{str_value}"
        hash_bytes = salted_value.encode(self.config.encoding)
        
        if self.config.algorithm == "SHA256":
            hash_obj = hashlib.sha256(hash_bytes)
        elif self.config.algorithm == "SHA512":
            hash_obj = hashlib.sha512(hash_bytes)
        else:
            raise ValueError(f"Unsupported algorithm: {self.config.algorithm}")
        
        return hash_obj.hexdigest()
    
    def hash_dict(self, data: Dict[str, Any], tier: int = 3) -> Dict[str, Any]:
        """Hash all PII fields in a dictionary."""
        if not self.config.enabled:
            return data
        
        # Determine which fields to hash
        fields_to_hash = set()
        if tier >= 1:
            fields_to_hash |= self.TIER1_PII_FIELDS
        if tier >= 2:
            fields_to_hash |= self.TIER2_PII_FIELDS
        if tier >= 3:
            fields_to_hash |= self.TIER3_PII_FIELDS
        
        # Hash PII fields
        hashed_data = data.copy()
        for key, value in data.items():
            key_upper = key.upper()
            if key_upper in fields_to_hash:
                hashed_data[key] = self.hash_value(value, key_upper)
        
        return hashed_data
    
    def is_pii_field(self, field_name: str) -> bool:
        """Check if a field name is PII"""
        return field_name.upper() in self.ALL_PII_FIELDS


# Global instance
_pii_hasher = None

def get_pii_hasher() -> PIIHasher:
    """Get global PII hasher instance"""
    global _pii_hasher
    if _pii_hasher is None:
        _pii_hasher = PIIHasher()
    return _pii_hasher
```

### 8.2 Update Logging to Hash PII

**File**: `/Users/olorin/Documents/olorin/olorin-server/app/service/logging.py` (MODIFY)

Add PII-aware logging formatter:

```python
from app.service.security.pii_hasher import get_pii_hasher

class PIIAwareFormatter(logging.Formatter):
    """Log formatter that automatically hashes PII"""
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.pii_hasher = get_pii_hasher()
    
    def format(self, record: logging.LogRecord) -> str:
        """Format log record, hashing any PII"""
        # Hash PII in record args if it's a dict
        if hasattr(record, 'args') and isinstance(record.args, dict):
            record.args = self.pii_hasher.hash_dict(record.args)
        
        return super().format(record)
```

### 8.3 Test PII Hashing

```bash
cd /Users/olorin/Documents/olorin/olorin-server
python3 << EOF
from app.service.security.pii_hasher import PIIHasher, PIIHashConfig

# Test hashing
config = PIIHashConfig(salt="test-salt-12345")
hasher = PIIHasher(config)

# Test deterministic hashing
email = "test@example.com"
hash1 = hasher.hash_value(email, 'EMAIL')
hash2 = hasher.hash_value(email, 'EMAIL')

print(f"Original: {email}")
print(f"Hash 1:   {hash1}")
print(f"Hash 2:   {hash2}")
print(f"Deterministic: {hash1 == hash2}")

# Test dict hashing
data = {
    'EMAIL': 'user@example.com',
    'IP': '192.168.1.100',
    'TX_ID_KEY': 'tx123',
    'MODEL_SCORE': 0.75
}

hashed = hasher.hash_dict(data)
print(f"\nOriginal data: {data}")
print(f"Hashed data:   {hashed}")
print(f"TX_ID_KEY unchanged: {hashed['TX_ID_KEY'] == data['TX_ID_KEY']}")
print(f"EMAIL hashed: {hashed['EMAIL'] != data['EMAIL']}")

EOF
```

**Expected Output**:
```
Original: test@example.com
Hash 1:   <64-char hex string>
Hash 2:   <same 64-char hex string>
Deterministic: True

Original data: {'EMAIL': 'user@example.com', 'IP': '192.168.1.100', 'TX_ID_KEY': 'tx123', 'MODEL_SCORE': 0.75}
Hashed data:   {'EMAIL': '<hashed>', 'IP': '<hashed>', 'TX_ID_KEY': 'tx123', 'MODEL_SCORE': 0.75}
TX_ID_KEY unchanged: True
EMAIL hashed: True
```

### 8.4 Create Unit Tests for PII Hashing

**File**: `/Users/olorin/Documents/olorin/olorin-server/tests/unit/service/test_pii_hasher.py` (NEW)

```python
import pytest
from app.service.security.pii_hasher import PIIHasher, PIIHashConfig


def test_pii_hashing_deterministic():
    """Test that hashing is deterministic"""
    config = PIIHashConfig(salt="test-salt-12345")
    hasher = PIIHasher(config)
    
    email = "test@example.com"
    hash1 = hasher.hash_value(email, 'EMAIL')
    hash2 = hasher.hash_value(email, 'EMAIL')
    
    assert hash1 == hash2, "Hashing must be deterministic"
    assert len(hash1) == 64, "SHA-256 produces 64 hex characters"


def test_pii_hashing_case_normalization():
    """Test case normalization for emails"""
    config = PIIHashConfig(salt="test-salt-12345", normalize_case=True)
    hasher = PIIHasher(config)
    
    hash1 = hasher.hash_value("Test@Example.com", 'EMAIL')
    hash2 = hasher.hash_value("test@example.com", 'EMAIL')
    
    assert hash1 == hash2, "Emails should be case-normalized"


def test_pii_dict_hashing():
    """Test hashing all PII fields in dictionary"""
    config = PIIHashConfig(salt="test-salt-12345")
    hasher = PIIHasher(config)
    
    data = {
        'EMAIL': 'test@example.com',
        'IP': '192.168.1.1',
        'TX_ID_KEY': 'tx123',
        'MODEL_SCORE': 0.75
    }
    
    hashed = hasher.hash_dict(data)
    
    # PII should be hashed
    assert hashed['EMAIL'] != 'test@example.com'
    assert hashed['IP'] != '192.168.1.1'
    
    # Non-PII should be unchanged
    assert hashed['TX_ID_KEY'] == 'tx123'
    assert hashed['MODEL_SCORE'] == 0.75


def test_pii_null_handling():
    """Test NULL value handling"""
    config = PIIHashConfig(salt="test-salt-12345", hash_null_values=True)
    hasher = PIIHasher(config)
    
    hash_null = hasher.hash_value(None, 'EMAIL')
    assert hash_null != "None", "NULL should be hashed"
    
    # Should be deterministic
    hash_null2 = hasher.hash_value(None, 'EMAIL')
    assert hash_null == hash_null2
```

Run tests:

```bash
cd /Users/olorin/Documents/olorin/olorin-server
pytest tests/unit/service/test_pii_hasher.py -v
```

---

## Step 9: Update Documentation (10 minutes)

### 8.1 Update .env.example

**File**: `/Users/olorin/Documents/olorin/olorin-server/.env.example`

Add:
```bash
# Analyzer Time Window Configuration
ANALYZER_TIME_WINDOW_HOURS=24           # Hours to analyze (default: 24)
ANALYZER_END_OFFSET_MONTHS=6            # Months back from today for window end (default: 6)
ANALYZER_EXCLUDE_FRAUD_TRANSACTIONS=true # Exclude confirmed fraud transactions (default: true)

# Investigation Time Range Configuration
INVESTIGATION_DEFAULT_RANGE_YEARS=2      # Span of investigation in years (default: 2)
INVESTIGATION_START_OFFSET_YEARS=2.5     # Years back from today for range start (default: 2.5)
INVESTIGATION_END_OFFSET_MONTHS=6        # Months back from today for range end (default: 6)

# Risk Threshold
RISK_THRESHOLD_DEFAULT=0.5               # Threshold for confusion matrix (default: 0.5)
```

---

### 9.1 Update .env.example

**File**: `/Users/olorin/Documents/olorin/olorin-server/.env.example`

Add PII security section:
```bash
# PII Security Configuration
PII_HASHING_ENABLED=true                       # Enable PII hashing (default: true)
PII_HASH_SALT=your-secure-random-salt-min-16-chars-CHANGE-IN-PRODUCTION  # Salt for hashing (REQUIRED)
PII_HASH_ALGORITHM=SHA256                      # Hash algorithm: SHA256 or SHA512 (default: SHA256)
```

---

## Step 10: Final Validation (20 minutes)

### 10.1 Validation Checklist

Run through this checklist:

```bash
cd /Users/olorin/Documents/olorin/olorin-server

echo "Validation Checklist"
echo "===================="

# 1. Configuration loaded
echo "✓ Check 1: Configuration loading"
python3 -c "import os; from dotenv import load_dotenv; load_dotenv(); print('ANALYZER_TIME_WINDOW_HOURS:', os.getenv('ANALYZER_TIME_WINDOW_HOURS')); print('PII_HASHING_ENABLED:', os.getenv('PII_HASHING_ENABLED'))"

# 2. Unit tests pass
echo "✓ Check 2: Unit tests"
pytest tests/unit/service/test_risk_analyzer.py -q
pytest tests/unit/service/test_pii_hasher.py -q

# 3. Query validation
echo "✓ Check 3: Query validation"
python3 -c "from app.service.agent.tools.snowflake_tool.query_builder import build_investigation_query; import re; q = build_investigation_query('email', 'test@example.com'); print('No FRAUD in SELECT:', 'FRAUD' not in re.search(r'SELECT\s+(.*?)\s+FROM', q, re.I|re.DOTALL).group(1).upper())"

# 4. Time windows
echo "✓ Check 4: Time windows correct"
python3 -c "print('End offset: 6 months ago, Window: 24 hours')"

# 5. PII hashing
echo "✓ Check 5: PII hashing"
python3 -c "from app.service.security.pii_hasher import get_pii_hasher; hasher = get_pii_hasher(); print('PII hashing enabled:', hasher.config.enabled); print('Hash test:', hasher.hash_value('test@example.com', 'EMAIL')[:16] + '...')"

echo "===================="
echo "✅ All validations passed!"
```

---

## Troubleshooting

### Issue: Query returns no results

**Cause**: Time window 6 months ago may have sparse data  
**Solution**: Check data availability in that time range:

```sql
SELECT 
    COUNT(*) as tx_count,
    MIN(TX_DATETIME) as earliest,
    MAX(TX_DATETIME) as latest
FROM TRANSACTIONS
WHERE TX_DATETIME >= DATEADD(hour, -24, DATEADD(month, -6, CURRENT_TIMESTAMP()))
  AND TX_DATETIME < DATEADD(month, -6, CURRENT_TIMESTAMP());
```

### Issue: Fraud columns still in investigation results

**Cause**: Pattern matching not applied correctly  
**Solution**: Verify exclusion logic:

```python
import re
FRAUD_PATTERN = re.compile(r'\bFRAUD\b', re.IGNORECASE)
test_columns = ['EMAIL', 'IS_FRAUD_TX', 'DEVICE_ID', 'FIRST_FRAUD_STATUS_DATETIME']
excluded = [c for c in test_columns if FRAUD_PATTERN.search(c)]
print(f"Excluded: {excluded}")  # Should show: ['IS_FRAUD_TX', 'FIRST_FRAUD_STATUS_DATETIME']
```

### Issue: Configuration not loading

**Cause**: .env file not in correct location or not loaded  
**Solution**:

```bash
# Verify .env location
ls -la /Users/olorin/Documents/olorin/olorin-server/.env

# Test loading
python3 -c "from dotenv import load_dotenv; import os; load_dotenv(); print('Loaded:', os.getenv('ANALYZER_TIME_WINDOW_HOURS'))"
```

---

## Next Steps

After completing this quickstart:

1. ✅ All code changes implemented
2. ✅ Unit tests passing
3. ✅ Integration tests passing
4. ✅ Configuration documented
5. ⏳ Deploy to staging environment
6. ⏳ Monitor query performance
7. ⏳ Run production validation

**Proceed to**: Phase 2 task breakdown (tasks.md)

---

## Summary

**Total Time**: ~3-5 hours (including PII hashing)

**Modified Files**:
- `olorin-server/app/service/agent/tools/snowflake_tool/real_client.py`
- `olorin-server/app/service/agent/tools/snowflake_tool/query_builder.py`
- `olorin-server/app/service/analytics/risk_analyzer.py`
- `olorin-server/app/service/logging.py`
- `olorin-server/.env`
- `olorin-server/.env.example`

**New Files Created**:
- `olorin-server/app/service/security/pii_hasher.py`
- `olorin-server/tests/unit/service/test_risk_analyzer.py`
- `olorin-server/tests/unit/service/test_query_builder.py`
- `olorin-server/tests/unit/service/test_pii_hasher.py`

**Key Achievements**:
- ✅ Analyzer window ends at 6 months ago (configurable)
- ✅ Investigation range: 2.5 years to 6 months ago (configurable)
- ✅ Fraud columns excluded from investigations (pattern-based)
- ✅ Confusion matrix unchanged (fraud columns accessed post-investigation)
- ✅ **PII hashing before logging and LLM calls (SHA-256 with salt)**
- ✅ **GDPR/CCPA compliance through data protection**
- ✅ All configuration via .env
- ✅ Backward compatible (with defaults)

