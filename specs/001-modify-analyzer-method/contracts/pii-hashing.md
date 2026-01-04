# Contract: PII Hashing

**Feature**: 001-modify-analyzer-method  
**Version**: 1.0  
**Type**: Security Contract

## Purpose

Defines the contract for hashing Personally Identifiable Information (PII) before logging or sending to Large Language Models (LLMs), ensuring privacy compliance (GDPR/CCPA) and data protection.

## Scope

### Applies To

- **All Logging**: Python logging statements, error messages, debug output
- **LLM API Calls**: Any data sent to OpenAI, Anthropic, or other LLM providers
- **Investigation Results**: Data displayed in investigation reports or dashboards
- **Analytics Output**: Analyzer results, confusion table generation

### Does Not Apply To

- **Database Storage**: Original PII stored in Snowflake (already secured)
- **Authorized Investigation Access**: Internal investigation tools with proper authorization
- **Encrypted Communication**: Data in transit via HTTPS (additional layer of security)

## PII Field Classification

### Tier 1 - Direct Identifiers (Highest Sensitivity)

**Must Always Hash**:
- `EMAIL` - User email address
- `PHONE_NUMBER` - User phone number
- `FIRST_NAME` - User first name
- `LAST_NAME` - User last name
- `UNIQUE_USER_ID` - User identifier
- `DATE_OF_BIRTH` - User date of birth

### Tier 2 - Technical Identifiers (High Sensitivity)

**Must Always Hash**:
- `IP` - IP address
- `DEVICE_ID` - Device identifier
- `USER_AGENT` - Browser user agent string
- `VISITOR_ID` - Visitor tracking ID

### Tier 3 - Quasi-Identifiers (Medium Sensitivity)

**Should Hash** (configurable):
- `CARD_BIN` - Credit card BIN (first 6 digits)
- `LAST_FOUR` - Credit card last 4 digits
- `BILLING_ADDRESS_LINE_1` - Billing street address
- `SHIPPING_ADDRESS_LINE_1` - Shipping street address

### Non-PII (No Hashing Required)

**Never Hash**:
- Transaction amounts (`PAID_AMOUNT_VALUE_IN_CURRENCY`)
- Timestamps (`TX_DATETIME`)
- Risk scores (`MODEL_SCORE`)
- Transaction IDs (`TX_ID_KEY`)
- Country codes (`IP_COUNTRY_CODE`)
- Device types (`DEVICE_TYPE`, `DEVICE_MODEL`, `DEVICE_OS_VERSION`)

## Hashing Algorithm

### Configuration

```python
@dataclass
class PIIHashConfig:
    """PII hashing configuration"""
    enabled: bool = True                        # Enable/disable PII hashing
    algorithm: str = "SHA256"                   # Hash algorithm
    salt: str = ""                              # Salt for hashing (MUST be configured)
    encoding: str = "utf-8"                     # String encoding
    normalize_case: bool = True                 # Normalize to lowercase before hashing
    hash_null_values: bool = True               # Hash NULL values as "NULL" string
    
    def validate(self) -> None:
        """Validate configuration"""
        if self.enabled and not self.salt:
            raise ValueError("PII_HASH_SALT must be configured when hashing is enabled")
        if len(self.salt) < 16:
            import warnings
            warnings.warn("PII_HASH_SALT should be at least 16 characters for security")
        if self.algorithm not in ["SHA256", "SHA512"]:
            raise ValueError(f"Unsupported hash algorithm: {self.algorithm}")
```

### Hash Function

```python
import hashlib

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
    
    def __init__(self, config: PIIHashConfig):
        self.config = config
        self.config.validate()
    
    def hash_value(self, value: Any, field_name: str = None) -> str:
        """
        Hash a single PII value.
        
        Args:
            value: The value to hash
            field_name: Optional field name for context
            
        Returns:
            Hashed value as hex string
        """
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
        
        # Normalize case for consistency (emails, etc.)
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
        """
        Hash all PII fields in a dictionary.
        
        Args:
            data: Dictionary containing data
            tier: Maximum tier to hash (1=Tier1 only, 2=Tier1+2, 3=All)
            
        Returns:
            Dictionary with PII fields hashed
        """
        if not self.config.enabled:
            return data
        
        # Determine which fields to hash based on tier
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
```

## Behavioral Requirements

### Must Implement

1. **Hash Before Logging**: All PII must be hashed before reaching logging infrastructure
2. **Hash Before LLM**: All PII must be hashed before constructing LLM API requests
3. **Deterministic Hashing**: Same input must always produce same hash (for correlation)
4. **Consistent Salt**: Use same salt across all application instances
5. **Case Normalization**: Normalize emails and IDs to lowercase before hashing
6. **NULL Handling**: Hash NULL values consistently as "NULL" string
7. **Validation**: Validate hash configuration on application startup

### Must Not Implement

1. **Reversible Hashing**: Do not use encryption (which can be decrypted)
2. **Random Hashing**: Do not use random salts per value (breaks correlation)
3. **Skip Hashing**: Do not bypass hashing even for "debugging" purposes
4. **Log Plaintext**: Never log plaintext PII, even in error conditions
5. **Expose Salt**: Never log or expose the salt value

## Integration Points

### Logging Integration

```python
import logging

class PIIAwareFormatter(logging.Formatter):
    """Log formatter that automatically hashes PII"""
    
    def __init__(self, *args, pii_hasher: PIIHasher, **kwargs):
        super().__init__(*args, **kwargs)
        self.pii_hasher = pii_hasher
    
    def format(self, record: logging.LogRecord) -> str:
        """Format log record, hashing any PII in args"""
        # Hash PII in record message
        if hasattr(record, 'args') and record.args:
            if isinstance(record.args, dict):
                record.args = self.pii_hasher.hash_dict(record.args)
            elif isinstance(record.args, tuple):
                record.args = tuple(
                    self._hash_if_pii(arg) for arg in record.args
                )
        
        return super().format(record)
    
    def _hash_if_pii(self, value: Any) -> Any:
        """Hash value if it appears to be PII"""
        # Simple heuristic: if it's a dict, hash PII fields
        if isinstance(value, dict):
            return self.pii_hasher.hash_dict(value)
        return value

# Configure logging
pii_hasher = PIIHasher(PIIHashConfig(salt=os.getenv('PII_HASH_SALT')))
handler = logging.StreamHandler()
handler.setFormatter(PIIAwareFormatter(
    '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    pii_hasher=pii_hasher
))
logger.addHandler(handler)
```

### LLM Integration

```python
from typing import Dict, Any

class PIIAwareLLMClient:
    """LLM client that automatically hashes PII before API calls"""
    
    def __init__(self, llm_client, pii_hasher: PIIHasher):
        self.llm_client = llm_client
        self.pii_hasher = pii_hasher
    
    def send_investigation_data(self, investigation_data: Dict[str, Any]) -> str:
        """Send investigation data to LLM, hashing PII first"""
        # Hash all PII fields
        hashed_data = self.pii_hasher.hash_dict(investigation_data)
        
        # Build prompt with hashed data
        prompt = self._build_prompt(hashed_data)
        
        # Send to LLM
        response = self.llm_client.complete(prompt)
        
        return response
    
    def _build_prompt(self, data: Dict[str, Any]) -> str:
        """Build LLM prompt from hashed data"""
        # Data is already hashed, safe to include
        return f"Analyze this transaction data: {data}"
```

## Validation

### Configuration Validation

```python
def validate_pii_hash_config() -> List[str]:
    """Validate PII hashing configuration"""
    errors = []
    
    import os
    
    # Check if enabled
    enabled = os.getenv('PII_HASHING_ENABLED', 'true').lower() == 'true'
    
    if enabled:
        # Check salt is configured
        salt = os.getenv('PII_HASH_SALT', '')
        if not salt:
            errors.append("PII_HASH_SALT must be configured when hashing is enabled")
        elif len(salt) < 16:
            errors.append("PII_HASH_SALT should be at least 16 characters")
        
        # Check algorithm
        algorithm = os.getenv('PII_HASH_ALGORITHM', 'SHA256')
        if algorithm not in ['SHA256', 'SHA512']:
            errors.append(f"Unsupported PII_HASH_ALGORITHM: {algorithm}")
    
    return errors
```

### Runtime Validation

```python
def validate_no_pii_in_logs(log_output: str) -> List[str]:
    """Validate that log output contains no plaintext PII"""
    errors = []
    
    # Common PII patterns
    email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
    phone_pattern = r'\b\d{3}[-.]?\d{3}[-.]?\d{4}\b'
    ip_pattern = r'\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b'
    
    import re
    
    if re.search(email_pattern, log_output):
        errors.append("Log contains email addresses (not hashed)")
    
    if re.search(phone_pattern, log_output):
        errors.append("Log contains phone numbers (not hashed)")
    
    if re.search(ip_pattern, log_output):
        # Check if it's not a private IP
        matches = re.findall(ip_pattern, log_output)
        for ip in matches:
            if not ip.startswith(('10.', '172.', '192.168.', '127.')):
                errors.append(f"Log contains public IP address: {ip}")
    
    return errors
```

## Testing Contract

### Unit Tests

```python
def test_pii_hashing_deterministic():
    """Test that hashing is deterministic"""
    config = PIIHashConfig(salt="test-salt-12345")
    hasher = PIIHasher(config)
    
    email = "test@example.com"
    hash1 = hasher.hash_value(email, 'EMAIL')
    hash2 = hasher.hash_value(email, 'EMAIL')
    
    assert hash1 == hash2, "Hashing must be deterministic"

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
        'TX_ID_KEY': 'tx123',  # Not PII
        'MODEL_SCORE': 0.75     # Not PII
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
    assert hash_null != "None", "NULL should be hashed as 'NULL' string"
    
    # Should be deterministic
    hash_null2 = hasher.hash_value(None, 'EMAIL')
    assert hash_null == hash_null2
```

### Integration Tests

```python
async def test_pii_not_in_logs():
    """Test that PII does not appear in logs"""
    import logging
    from io import StringIO
    
    # Create logger with PII-aware formatter
    config = PIIHashConfig(salt="test-salt-12345")
    hasher = PIIHasher(config)
    
    log_stream = StringIO()
    handler = logging.StreamHandler(log_stream)
    handler.setFormatter(PIIAwareFormatter(
        '%(message)s',
        pii_hasher=hasher
    ))
    
    logger = logging.getLogger('test')
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)
    
    # Log with PII
    logger.info("User email: test@example.com")
    
    # Verify PII is not in log output
    log_output = log_stream.getvalue()
    assert 'test@example.com' not in log_output, "Plaintext email in logs"
    assert '@' not in log_output or '@' in ['hashed:', 'SHA256'], "Email pattern in logs"

async def test_pii_not_sent_to_llm():
    """Test that PII is hashed before sending to LLM"""
    config = PIIHashConfig(salt="test-salt-12345")
    hasher = PIIHasher(config)
    
    # Mock LLM client
    class MockLLMClient:
        def __init__(self):
            self.last_prompt = None
        
        def complete(self, prompt: str) -> str:
            self.last_prompt = prompt
            return "mock response"
    
    mock_llm = MockLLMClient()
    pii_aware_llm = PIIAwareLLMClient(mock_llm, hasher)
    
    # Send data with PII
    investigation_data = {
        'EMAIL': 'test@example.com',
        'IP': '192.168.1.1',
        'MODEL_SCORE': 0.75
    }
    
    pii_aware_llm.send_investigation_data(investigation_data)
    
    # Verify PII not in prompt
    assert 'test@example.com' not in mock_llm.last_prompt
    assert '192.168.1.1' not in mock_llm.last_prompt
    assert 'MODEL_SCORE' in mock_llm.last_prompt  # Non-PII should remain
```

## Performance Considerations

### Hashing Overhead

- SHA-256 hashing: ~1-2 microseconds per field
- For 1000 transactions with 10 PII fields each: ~10-20ms overhead
- Acceptable for most use cases

### Optimization Strategies

1. **Batch Hashing**: Hash multiple values in parallel
2. **Caching**: Cache hashed values for repeated data (with TTL)
3. **Lazy Hashing**: Only hash when logging/LLM call actually happens

```python
from functools import lru_cache

class OptimizedPIIHasher(PIIHasher):
    """PII hasher with caching for performance"""
    
    @lru_cache(maxsize=10000)
    def hash_value_cached(self, value: str, field_name: str = None) -> str:
        """Hash value with caching"""
        return super().hash_value(value, field_name)
```

## Versioning

**Version 1.0** (2025-11-21):
- Initial PII hashing contract
- SHA-256 algorithm with salt
- Tier 1/2/3 PII classification
- Logging and LLM integration patterns

## Dependencies

- Python `hashlib` module
- Logging infrastructure
- LLM client libraries
- Configuration management (.env)

