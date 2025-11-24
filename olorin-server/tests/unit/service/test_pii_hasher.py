"""
Unit tests for PII hashing functionality.

Tests verify that PII fields are hashed deterministically before logging or LLM calls.
"""
import pytest
from app.service.security.pii_hasher import PIIHasher, PIIHashConfig


def test_pii_hashing_deterministic():
    """Test that hashing is deterministic - same input produces same hash."""
    config = PIIHashConfig(salt="test-salt-12345")
    hasher = PIIHasher(config)
    
    email = "test@example.com"
    hash1 = hasher.hash_value(email, 'EMAIL')
    hash2 = hasher.hash_value(email, 'EMAIL')
    
    assert hash1 == hash2, "Hashing must be deterministic"
    assert len(hash1) == 64, "SHA-256 produces 64 hex characters"
    assert hash1 != email, "Hash must be different from original value"


def test_pii_hashing_case_normalization():
    """Test case normalization for emails."""
    config = PIIHashConfig(salt="test-salt-12345", normalize_case=True)
    hasher = PIIHasher(config)
    
    hash1 = hasher.hash_value("Test@Example.com", 'EMAIL')
    hash2 = hasher.hash_value("test@example.com", 'EMAIL')
    
    assert hash1 == hash2, "Emails should be case-normalized before hashing"


def test_pii_hashing_case_sensitive_for_non_emails():
    """Test that non-email fields are case-sensitive."""
    config = PIIHashConfig(salt="test-salt-12345", normalize_case=True)
    hasher = PIIHasher(config)
    
    hash1 = hasher.hash_value("DeviceID123", 'DEVICE_ID')
    hash2 = hasher.hash_value("deviceid123", 'DEVICE_ID')
    
    assert hash1 != hash2, "Non-email fields should be case-sensitive"


def test_pii_dict_hashing():
    """Test hashing all PII fields in dictionary."""
    config = PIIHashConfig(salt="test-salt-12345")
    hasher = PIIHasher(config)
    
    data = {
        'EMAIL': 'test@example.com',
        'IP': '192.168.1.1',
        'TX_ID_KEY': 'tx123',
        'MODEL_SCORE': 0.75
    }
    
    hashed = hasher.hash_dict(data)
    
    # PII fields should be hashed
    assert hashed['EMAIL'] != 'test@example.com', "Email should be hashed"
    assert hashed['IP'] != '192.168.1.1', "IP should be hashed"
    
    # Non-PII fields should be unchanged
    assert hashed['TX_ID_KEY'] == 'tx123', "TX_ID_KEY should not be hashed"
    assert hashed['MODEL_SCORE'] == 0.75, "MODEL_SCORE should not be hashed"


def test_pii_null_handling():
    """Test NULL value handling."""
    config = PIIHashConfig(salt="test-salt-12345", hash_null_values=True)
    hasher = PIIHasher(config)
    
    hash_null = hasher.hash_value(None, 'EMAIL')
    assert hash_null != "None", "NULL should be hashed as 'NULL' string"
    assert hash_null != "", "NULL hash should not be empty"
    
    # Should be deterministic
    hash_null2 = hasher.hash_value(None, 'EMAIL')
    assert hash_null == hash_null2, "NULL hashing should be deterministic"


def test_pii_null_skip():
    """Test NULL value skipping when hash_null_values=False."""
    config = PIIHashConfig(salt="test-salt-12345", hash_null_values=False)
    hasher = PIIHasher(config)
    
    result = hasher.hash_value(None, 'EMAIL')
    assert result == "NULL", "Should return 'NULL' string when hash_null_values=False"


def test_configuration_validation():
    """Test configuration validation."""
    # Valid configuration
    config = PIIHashConfig(salt="test-salt-12345", enabled=True)
    config.validate()  # Should not raise
    
    # Invalid: enabled but no salt
    with pytest.raises(ValueError, match="PII_HASH_SALT must be configured"):
        config_invalid = PIIHashConfig(salt="", enabled=True)
        config_invalid.validate()
    
    # Invalid: salt too short (warning case)
    config_short_salt = PIIHashConfig(salt="short", enabled=True)
    # Should validate but log warning - no exception expected
    config_short_salt.validate()


def test_tier_based_exclusion():
    """Test tier-based PII field exclusion."""
    config = PIIHashConfig(salt="test-salt-12345")
    hasher = PIIHasher(config)
    
    data = {
        'EMAIL': 'user@example.com',         # Tier 1
        'IP': '10.0.0.1',                     # Tier 2
        'CARD_BIN': '123456',                 # Tier 3
        'MODEL_SCORE': 0.8                    # Not PII
    }
    
    # Hash Tier 1 only
    hashed_tier1 = hasher.hash_dict(data, tier=1)
    assert hashed_tier1['EMAIL'] != data['EMAIL'], "Tier 1: Email should be hashed"
    assert hashed_tier1['IP'] == data['IP'], "Tier 1: IP should not be hashed"
    assert hashed_tier1['CARD_BIN'] == data['CARD_BIN'], "Tier 1: CARD_BIN should not be hashed"
    
    # Hash Tier 1+2
    hashed_tier2 = hasher.hash_dict(data, tier=2)
    assert hashed_tier2['EMAIL'] != data['EMAIL'], "Tier 2: Email should be hashed"
    assert hashed_tier2['IP'] != data['IP'], "Tier 2: IP should be hashed"
    assert hashed_tier2['CARD_BIN'] == data['CARD_BIN'], "Tier 2: CARD_BIN should not be hashed"
    
    # Hash all tiers
    hashed_tier3 = hasher.hash_dict(data, tier=3)
    assert hashed_tier3['EMAIL'] != data['EMAIL'], "Tier 3: Email should be hashed"
    assert hashed_tier3['IP'] != data['IP'], "Tier 3: IP should be hashed"
    assert hashed_tier3['CARD_BIN'] != data['CARD_BIN'], "Tier 3: CARD_BIN should be hashed"
    assert hashed_tier3['MODEL_SCORE'] == data['MODEL_SCORE'], "Tier 3: MODEL_SCORE should not be hashed"


def test_pii_field_detection():
    """Test PII field detection."""
    config = PIIHashConfig(salt="test-salt-12345")
    hasher = PIIHasher(config)
    
    # PII fields
    assert hasher.is_pii_field('EMAIL'), "EMAIL should be detected as PII"
    assert hasher.is_pii_field('email'), "email (lowercase) should be detected as PII"
    assert hasher.is_pii_field('IP'), "IP should be detected as PII"
    assert hasher.is_pii_field('PHONE_NUMBER'), "PHONE_NUMBER should be detected as PII"
    
    # Non-PII fields
    assert not hasher.is_pii_field('TX_ID_KEY'), "TX_ID_KEY should not be PII"
    assert not hasher.is_pii_field('MODEL_SCORE'), "MODEL_SCORE should not be PII"
    assert not hasher.is_pii_field('TX_DATETIME'), "TX_DATETIME should not be PII"


def test_hashing_disabled():
    """Test that hashing can be disabled."""
    config = PIIHashConfig(salt="test-salt-12345", enabled=False)
    hasher = PIIHasher(config)
    
    email = "test@example.com"
    result = hasher.hash_value(email, 'EMAIL')
    
    assert result == email, "When disabled, should return original value"


def test_different_salts_produce_different_hashes():
    """Test that different salts produce different hashes."""
    hasher1 = PIIHasher(PIIHashConfig(salt="salt1"))
    hasher2 = PIIHasher(PIIHashConfig(salt="salt2"))
    
    email = "test@example.com"
    hash1 = hasher1.hash_value(email, 'EMAIL')
    hash2 = hasher2.hash_value(email, 'EMAIL')
    
    assert hash1 != hash2, "Different salts should produce different hashes"


def test_sha512_algorithm():
    """Test SHA-512 algorithm option."""
    config = PIIHashConfig(salt="test-salt-12345", algorithm="SHA512")
    hasher = PIIHasher(config)
    
    email = "test@example.com"
    hash_result = hasher.hash_value(email, 'EMAIL')
    
    assert len(hash_result) == 128, "SHA-512 produces 128 hex characters"


def test_invalid_algorithm():
    """Test invalid algorithm raises error."""
    # Invalid algorithm should be caught during config validation
    with pytest.raises(ValueError, match="Unsupported hash algorithm"):
        config = PIIHashConfig(salt="test-salt-12345", algorithm="MD5")
        config.validate()
        PIIHasher(config)


def test_get_pii_hasher_singleton(monkeypatch):
    """Test global PII hasher singleton."""
    import app.service.security.pii_hasher as pii_module
    
    # Set environment variable for salt
    monkeypatch.setenv('PII_HASH_SALT', 'test-singleton-salt-12345')
    
    # Reset the global instance to force reload
    pii_module._pii_hasher = None
    
    hasher1 = pii_module.get_pii_hasher()
    hasher2 = pii_module.get_pii_hasher()
    
    assert hasher1 is hasher2, "Should return the same instance (singleton)"

